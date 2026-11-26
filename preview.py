"""Run the Claude Cars website. Configuration and start-up instructions are in README.md."""
import argparse
import hashlib
import hmac
import html
from ipaddress import ip_address
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import tempfile
import time
from http.cookies import SimpleCookie, CookieError
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import catalogue as catalog
import enquiries
import site_content
import site_stats
from catalogue import Problem

MIB = 1024 ** 2
CAR_PATH = r"([a-z0-9][a-z0-9-]{0,96})"
TITLES = {
    "fr": ["Voitures de passion à Wanze", "Voitures", "Claude", "Contact", "Espace Claude", "Aller au contenu", "Page introuvable"],
    "nl": ["Youngtimers in Wanze", "Auto’s", "Claude", "Contact", "Mijn garage", "Naar de inhoud", "Pagina niet gevonden"],
    "de": ["Youngtimer in Wanze", "Fahrzeuge", "Claude", "Kontakt", "Meine Garage", "Zum Inhalt", "Seite nicht gefunden"],
    "en": ["Enthusiast cars in Wanze", "Cars", "Claude", "Contact", "My garage", "Skip to content", "Page not found"],
    "es": ["Youngtimers en Wanze", "Coches", "Claude", "Contacto", "Mi garaje", "Saltar al contenido", "Página no encontrada"],
}
SECTIONS = ["home", "catalogue", "about", "contact", "owner"]
LOCALES = dict(fr="fr_BE", nl="nl_BE", de="de_DE", en="en_GB", es="es_ES")
PRIVACY = dict(fr="Confidentialité", nl="Privacy", de="Datenschutz", en="Privacy", es="Privacidad")
DESCRIPTIONS = {
    "fr": ("Voitures de passion, recherche sur demande et accompagnement à l’importation en Belgique.",
           "Parcourez les voitures disponibles, réservées et vendues de Claude.",
           "Découvrez Claude et sa façon de sélectionner une voiture de passion.",
           "Contactez Claude pour une voiture, une visite, une recherche ou une importation."),
    "nl": ("Liefhebbersauto’s, zoekopdrachten en hulp bij invoer in België.",
           "Bekijk de beschikbare, gereserveerde en verkochte auto’s van Claude.",
           "Ontdek Claude en hoe hij zijn liefhebbersauto’s uitkiest.",
           "Neem contact op voor een auto, bezichtiging, zoekopdracht of invoer."),
    "de": ("Liebhaberfahrzeuge, Fahrzeugsuche und Unterstützung beim Import in Belgien.",
           "Entdecken Sie Claudes verfügbare, reservierte und verkaufte Fahrzeuge.",
           "Lernen Sie Claude kennen und erfahren Sie, wie er seine Fahrzeuge auswählt.",
           "Kontaktieren Sie Claude zu einem Auto, einer Besichtigung, einer Suche oder einem Import."),
    "en": ("Enthusiast cars, vehicle sourcing and import assistance in Belgium.",
           "Browse Claude’s available, reserved and sold cars.",
           "Meet Claude and discover how he selects his enthusiast cars.",
           "Contact Claude about a car, a viewing, a search or an import."),
    "es": ("Coches de entusiastas, búsqueda por encargo y ayuda con la importación en Bélgica.",
           "Explora los coches disponibles, reservados y vendidos de Claude.",
           "Conoce a Claude y descubre cómo elige los coches de su selección.",
           "Contacta con Claude para una consulta, una visita, una búsqueda o una importación."),
}
ASSET_TYPES = {".js", ".css", ".woff2", ".ttf", ".svg", ".webp", ".ico", ".jpg", ".png"}


def display_number(value, lang):
    decimals = 2 if value != int(value) else 0
    parts = f"{value:,.{decimals}f}".partition(".")
    grouping = {"fr":" ", "nl":".", "de":".", "es":".", "en":","}[lang]
    separator = "." if lang == "en" else ","
    return parts[0].replace(",", grouping) + (separator + parts[2] if parts[2] else "")


def social_description(car, lang):
    statuses = {
        "fr": ["Disponible", "Prochainement", "Réservée", "Vendue"],
        "nl": ["Beschikbaar", "Binnenkort", "Gereserveerd", "Verkocht"],
        "de": ["Verfügbar", "Demnächst", "Reserviert", "Verkauft"],
        "en": ["Available", "Coming soon", "Reserved", "Sold"],
        "es": ["Disponible", "Próximamente", "Reservado", "Vendido"],
    }
    status_index = ("available", "soon", "reserved", "sold").index(car["status"])
    parts = [statuses[lang][status_index], str(car["year"]), display_number(car["km"], lang) + " km"]
    if car["price"] is not None:
        amount = display_number(car["price"], lang)
        parts.append("€" + amount if lang in ("en", "nl") else amount + " €")
    intro = car["translations"].get(lang, {}).get("intro")
    if intro:
        parts.append(intro)
    return " · ".join(parts)


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def secure_file(path, value):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent) as file:
        file.write(value + "\n")
        file.flush()
        os.fsync(file.fileno())
        os.link(file.name, path)


def new_password(directory):
    env = os.environ.get("CLAUDE_OWNER_PASSWORD")
    if env:
        if len(env) < 12:
            raise SystemExit("CLAUDE_OWNER_PASSWORD must have at least 12 characters.")
        return env
    path = directory / "owner-password"
    if not path.exists():
        try:
            secure_file(path, secrets.token_urlsafe(24))
        except FileExistsError:
            pass
    value = path.read_text().strip()
    if len(value) < 12:
        raise SystemExit("The local owner-password file is incomplete. Supply CLAUDE_OWNER_PASSWORD to recover.")
    return value


def credential_key(directory, password):
    # Separate the persistent session verifier from the database backing up the journal.
    key_path = directory / "session-key"
    if not key_path.exists():
        try:
            secure_file(key_path, secrets.token_hex(32))
        except FileExistsError:
            pass
    return hmac.new(key_path.read_bytes(), password.encode(), hashlib.sha256).hexdigest()


def clean_expired(db_path):
    with catalog.connection(db_path) as db:
        enquiries.expire(db)
        now = int(time.time())
        db.execute("DELETE FROM login_attempts WHERE since<?", (now - 600,))
        db.execute("DELETE FROM sessions WHERE expires<=?", (now,))


class WebsiteServer(ThreadingHTTPServer):
    request_queue_size = 128
    next_cleanup = 0

    def service_actions(self):
        if time.monotonic() >= self.next_cleanup:
            try:
                clean_expired(self.settings.db_path)
                self.next_cleanup = time.monotonic() + 3600
            except sqlite3.OperationalError:
                self.next_cleanup = time.monotonic() + 60


class SiteRequest:
    def __init__(self, settings, method, path, headers, body, address):
        self.server = settings
        self.command = method
        self.path = path
        self.headers = headers
        self.rfile = body
        self.client_address = (address,)

    def client_key(self):
        address = self.client_address[0]
        if self.server.trusted_proxy == address:
            try:
                address = str(ip_address(self.headers.get("X-Real-IP", "")))
            except ValueError:
                pass
        return hmac.new(self.server.salt, address.encode(), hashlib.sha256).hexdigest()

    def output(self, status, body=b"", mime="application/json; charset=utf-8", headers=()):
        response_headers = [
            ("Content-Type", mime),
            ("X-Content-Type-Options", "nosniff"),
            ("Referrer-Policy", "strict-origin-when-cross-origin"),
            ("X-Frame-Options", "DENY"),
        ]
        if status != 304:
            response_headers.append(("Content-Length", str(len(body))))
        if not any(key == "Cache-Control" for key, _ in headers):
            response_headers.append(("Cache-Control", "no-store"))
        response_headers.extend(headers)
        self.response = (status, response_headers, b"" if self.command == "HEAD" else body)

    def reply(self, data, status=200, headers=()):
        self.output(status, json.dumps(data, ensure_ascii=False, allow_nan=False).encode(), headers=headers)

    def route(self):
        try:
            self.origin = self.server.origin
            host = self.headers.get("Host", "")
            if host not in self.server.hosts:
                raise Problem("invalid_host", 400)
            if not self.origin:
                self.origin = "http://" + host
            self.url = urlsplit(self.path)
            with catalog.connection(self.server.db_path) as self.db:
                self.owner_session = None
                if self.command in ("GET", "HEAD"):
                    self.read_resource()
                elif self.command in ("POST", "PUT"):
                    self.mutate()
                else:
                    self.output(405, headers=[("Allow", "GET, HEAD, POST, PUT")])
        except site_content.InvalidField as e:
            self.reply({"error": e.code, "field": e.field}, e.status)
        except Problem as e:
            self.reply({"error": e.code}, e.status)
        except sqlite3.OperationalError:
            self.reply({"error": "storage"}, 503)
        except Exception:
            import traceback
            traceback.print_exc()
            self.reply({"error": "internal"}, 500)

        return self.response

    def session(self):
        if self.owner_session is None:
            cookies = SimpleCookie()
            try:
                cookies.load(self.headers.get("Cookie", ""))
            except CookieError:
                pass
            token = cookies.get("cc_owner")
            self.owner_session = False
            if token and re.fullmatch("[A-Za-z0-9_-]{40,64}", token.value):
                row = self.db.execute("SELECT csrf FROM sessions WHERE id=? AND expires>? AND owner_key=?",
                                      (digest(token.value), time.time(), self.server.owner_key)).fetchone()
                if row:
                    self.owner_session = (digest(token.value), row[0])
        return self.owner_session

    def require_owner(self, write=False):
        session = self.session()
        if not session:
            raise Problem("unauthorized", 401)
        if write and not hmac.compare_digest(self.headers.get("X-CSRF-Token", ""), session[1]):
            raise Problem("forbidden", 403)
        return session

    def site_asset(self, file):
        if file.parent == catalog.ROOT / "assets/z4":
            photo = "/assets/z4/" + file.name.replace("-720.webp", ".webp")
            visible = self.db.execute("""
                SELECT 1 FROM cars JOIN json_each(cars.data, '$.photos') AS photo
                WHERE json_extract(cars.data, '$.status') <> 'draft' AND photo.value=? LIMIT 1
            """, (photo,)).fetchone()
            if not visible:
                if not self.session():
                    raise Problem("missing", 404)
                self.output(200, file.read_bytes(), "image/webp")
                return
        stat = file.stat()
        etag = f'W/"{stat.st_mtime_ns:x}-{stat.st_size:x}"'
        headers = [("ETag", etag), ("Cache-Control", "public, no-cache")]
        if etag in self.headers.get("If-None-Match", "").split(", "):
            self.output(304, headers=headers)
            return
        mime = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
        self.output(200, file.read_bytes(), mime, headers)

    def read_resource(self):
        path = self.url.path
        if path == "/robots.txt":
            rules = "User-agent: *\nDisallow: /\n"
            if self.server.origin.startswith("https://"):
                rules = "User-agent: *\nDisallow: /api/\n" + "".join(
                    f"Disallow: /{lang}/owner\n" for lang in catalog.LANGS)
                rules += f"Sitemap: {self.origin}/sitemap.xml\n"
            self.output(200, rules.encode(), "text/plain; charset=utf-8")
            return
        if path == "/sitemap.xml":
            routes = ["", "cars", "about", "contact", "privacy"]
            routes.extend("cars/" + car["id"] for car in catalog.listings(self.db))
            urls = "".join(f"<url><loc>{html.escape(self.origin)}/{lang}/{route}</loc></url>"
                           for route in routes for lang in catalog.LANGS)
            sitemap = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>'
            self.output(200, sitemap.encode(), "application/xml; charset=utf-8")
            return
        if path in ("/", "/index.html"):
            suffix = ("?" + self.url.query) if self.url.query else ""
            self.output(302, headers=[("Location", "/fr/" + suffix)])
            return
        if path == "/web/vehicle-directory.js":
            self.site_asset(catalog.ROOT / "vehicle-directory.js")
            return
        if re.fullmatch(r"/(?:web|assets)/[a-zA-Z0-9_./-]+", path):
            file = (catalog.ROOT / path[1:]).resolve()
            if file.is_relative_to(catalog.ROOT / path.split("/")[1]) and file.suffix in ASSET_TYPES and file.is_file():
                self.site_asset(file)
                return
            raise Problem("missing", 404)
        if catalog.UPLOAD_PATH.fullmatch(path):
            self.send_media(path)
            return
        if path.startswith("/api/owner/"):
            self.require_owner()
            section = re.fullmatch(r"/api/owner/site/([a-z]+)", path)
            if section:
                self.reply(site_content.read(self.db, section[1]))
                return
            if path == "/api/owner/enquiries":
                self.db.execute("BEGIN")
                self.reply({"leads": enquiries.records(self.db), "views": enquiries.views(self.db),
                            "metrics": site_stats.report(self.db)})
                return
            if path == "/api/owner/cars":
                self.reply({"cars": catalog.listings(self.db, owner=True)})
                return
            share = re.fullmatch("/api/owner/cars/" + CAR_PATH + "/shares", path)
            if share:
                catalog.listing(self.db, share[1])
                records = {ch: {} for ch in catalog.CHANNELS}
                for ch, lang, text, version in self.db.execute(
                        "SELECT channel,lang,text,revision FROM shares WHERE car_id=?", (share[1],)):
                    records[ch][lang] = {"text": text, "revision": version}
                self.reply({"shares": records})
                return
            raise Problem("missing", 404)
        parts = path.strip("/").split("/")
        lang = parts[0]
        if lang not in catalog.LANGS:
            self.page_missing("fr")
            return
        car = None
        if len(parts) == 3 and parts[1] == "cars":
            try:
                car = catalog.public(catalog.listing(self.db, parts[2]))
            except Problem:
                self.page_missing(lang)
                return
            page = "car"
        elif len(parts) == 1:
            page = "home"
        elif len(parts) == 2 and parts[1] in ("cars", "about", "contact", "owner", "privacy"):
            page = "catalogue" if parts[1] == "cars" else parts[1]
        else:
            self.page_missing(lang)
            return
        self.render_page(lang, page, car)

    def page_missing(self, lang):
        self.render_page(lang, "missing", None)

    def render_page(self, lang, page, car):
        if page == "car":
            cars = [car]
        elif page in ("home", "catalogue", "contact"):
            cars = catalog.listings(self.db)
        else:
            cars = []
        if page == "contact":
            cars = [{key: item[key] for key in ("id", "make", "model", "status")} for item in cars]
        owner = self.session()
        if page not in ("owner", "missing") and self.command == "GET" and not owner:
            # Optional aggregate writes must not hold up the public page.
            self.db.execute("PRAGMA busy_timeout=100")
            try:
                site_stats.record_page(self.db, self.url, car["id"] if car else "", self.headers.get("Referer"), self.origin)
                self.db.commit()
            except sqlite3.OperationalError:
                self.db.rollback()
        sections = site_content.public(self.db) if page != "owner" else {}
        pinned = sections.get("home", {}).get("featured", []) if page == "home" else []
        if pinned:
            order = {ident: index for index, ident in enumerate(pinned)}
            cars.sort(key=lambda item: order.get(item["id"], len(order)))
        nonce = secrets.token_urlsafe(20)
        info = dict(lang=lang, page=page, id=car["id"] if car else "", cars=cars,
                    authenticated=bool(owner), csrf=owner[1] if owner and page == "owner" else "")
        if sections:
            info["siteContent"] = sections
        context = json.dumps(info, ensure_ascii=True).replace("<", r"\u003c").replace(">", r"\u003e")
        title = PRIVACY[lang] if page == "privacy" else TITLES[lang][-1] if page == "missing" else (
            car["make"] + " " + car["model"] if car else TITLES[lang][SECTIONS.index(page)])
        recovery = ""
        if page == "missing":
            prompts = {
                "fr": ("Cette adresse ne mène à aucune page. Retrouvez la sélection actuelle de Claude.", "Voir les voitures"),
                "nl": ("Op dit adres staat geen pagina. Bekijk de huidige selectie van Claude.", "Bekijk de auto’s"),
                "de": ("Unter dieser Adresse ist keine Seite verfügbar. Hier finden Sie Claudes aktuelle Auswahl.", "Fahrzeuge ansehen"),
                "en": ("There’s no page at this address. You can still browse Claude’s current selection.", "Browse cars"),
                "es": ("No hay ninguna página en esta dirección. Puedes consultar la selección actual de Claude.", "Ver los coches"),
            }
            help_text, action = prompts[lang]
            recovery = f'<section class="cc-wrap" style="padding-block:clamp(64px,12vw,160px)"><h1>{title}</h1><p>{help_text}</p><a class="cc-button" href="/{lang}/cars">{action} →</a></section>' 
        description = DESCRIPTIONS[lang][SECTIONS.index(page)] if page in SECTIONS[:4] else title
        image_path = "/assets/identity/claude-cars-social.jpg" if page in ("home", "catalogue", "about", "contact") else None
        if car:
            description = social_description(car, lang)
            image_path = car["cover"]
        section_name = "profile" if page == "about" else page
        section = sections.get(section_name, {})
        texts = section.get("texts", {}).get(lang, {})
        meta_keys = {"home": ("aboutTitle", "coverLine"), "catalogue": ("current", "catalogueIntro"),
                     "about": ("aboutTitle", "story"), "contact": ("contactPage", "contactIntro"),
                     "privacy": ("privacy", "privacyEnquiriesText")}
        if texts and page in meta_keys:
            title_key, description_key = meta_keys[page]
            title = texts.get(title_key, title)
            description = texts.get(description_key, description)
        if section_name in site_content.IMAGE_KEYS:
            image_path = section.get("images", {}).get(site_content.IMAGE_KEYS[section_name], image_path)
        e = lambda value: html.escape(value, quote=True)
        path = self.url.path.rstrip("/") + ("/" if page == "home" else "")
        canonical = self.origin + path
        alternates = ""
        if page not in ("missing", "owner"):
            suffix = path[len(lang) + 1:]
            alternates = "".join(f'<link rel="alternate" hreflang="{language}" href="{e(self.origin)}/{folder}{e(suffix)}">'
                                 for language, folder in [(l, l) for l in catalog.LANGS] + [("x-default", "fr")])
        if not recovery:
            stock = ""
            if page in ("home", "catalogue"):
                items = "".join(f'<li><a href="/{lang}/cars/{e(c["id"])}">{e(c["make"] + " " + c["model"])}</a></li>' for c in cars)
                stock = f"<ul>{items}</ul>" if items else ""
            navigation = " · ".join(f'<a href="/{lang}/{route}">{e(label)}</a>' for route, label in
                                    zip(("cars", "about", "contact", "privacy"), (*TITLES[lang][1:4], PRIVACY[lang])))
            phone = ""
            if page in ("car", "contact", "owner"):
                label = sections.get("contact", {}).get("contacts", {}).get("phone", "+32 496 80 79 76")
                number = re.sub(r"[^0-9+]", "", label)
                phone = f'<p><a href="tel:{number}">{e(label)}</a></p>'
            story = ""
            if car:
                original = car["translations"].get("fr", {})
                translated = car["translations"].get(lang, {})
                paragraphs = []
                for field in catalog.FIELDS:
                    if field == "intro":
                        continue
                    value = translated.get(field) or original.get(field)
                    if value:
                        language = lang if translated.get(field) else "fr"
                        paragraphs.append(f'<p lang="{language}">{e(value)}</p>')
                story = "".join(paragraphs)
            recovery = f'<section class="cc-wrap cc-fallback"><h1>{e(title)}</h1><p>{e(description)}</p>{stock}{story}{phone}<nav>{navigation}</nav></section>'
        scripts = ["public-locales", "public"]
        styles = ["base", "public"]
        if page in ("contact", "owner"):
            scripts += ["insights-locales", "insights"]
            styles.append("insights")
        if page == "owner":
            scripts += ["vehicle-directory", "owner-locales"]
            styles.append("owner")
            if owner:
                scripts += ["owner-site-locales", "owner-site"]
                styles.append("owner-site")
            scripts.append("owner")
        if page in ("contact", "owner"):
            scripts.append("select")
            styles.append("select")
        if sections:
            scripts.append("site-bindings")
        css = "".join(f'<link rel="stylesheet" href="/web/{name}.css">' for name in styles)
        js = "".join(f'<script defer src="/web/{name}.js"></script>' for name in scripts)
        og_image = f'<meta property="og:image" content="{e(self.origin + image_path)}">' if image_path else ""
        private = '<meta name="robots" content="noindex,nofollow">' if page in ("owner","missing") or not self.server.origin.startswith("https://") else ""
        doc = f'''<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#184b40"><link rel="preload" as="font" type="font/woff2" href="/assets/fonts/eb-garamond-regular.woff2" crossorigin><title>{e(title)} · Claude Cars</title>
<link rel="icon" type="image/svg+xml" sizes="any" href="/assets/identity/loop.svg"><link rel="canonical" href="{e(canonical)}">{alternates}
<meta name="description" content="{e(description)}"><meta property="og:type" content="website">
<meta property="og:site_name" content="Claude Cars"><meta property="og:title" content="{e(title)} · Claude Cars">
<meta property="og:description" content="{e(description)}"><meta property="og:url" content="{e(canonical)}">
<meta property="og:locale" content="{LOCALES[lang]}">{og_image}{private}{css}
<script nonce="{nonce}">window.CC={context};</script>{js}</head>
<body data-page="{page}"><header id="mast"></header><main id="main" tabindex="-1">{recovery}</main><footer id="foot"></footer>
</body></html>'''
        policy = ("default-src 'self'; script-src 'self' 'nonce-" + nonce
                  + "'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; "
                    "connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        self.output(404 if page == "missing" else 200, doc.encode(), "text/html; charset=utf-8", [("Content-Security-Policy", policy)])

    def send_media(self, path):
        # Draft and unattached files remain private even with a known URL.
        public = self.db.execute("""SELECT 1 FROM assets JOIN cars ON assets.car_id=cars.id
                     WHERE assets.path=? AND json_extract(cars.data,'$.status') <> 'draft' LIMIT 1""", (path,)).fetchone()
        if not public and not self.session() and not site_content.public_image(self.db, path):
            raise Problem("missing", 404)
        row = self.db.execute("SELECT mime,length(data) FROM media WHERE path=?", (path,)).fetchone()
        if not row:
            raise Problem("missing", 404)
        mime, size = row
        start, end = 0, size - 1
        headers = [("Accept-Ranges", "bytes")]
        status = 200
        requested = self.headers.get("Range", "")
        if requested:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", requested)
            if match and (match[1] or match[2]):
                if match[1]:
                    start = int(match[1])
                    end = min(end, int(match[2])) if match[2] else end
                else:
                    start = max(0, size - int(match[2]))
            if not match or not any(match.groups()) or end < start or start >= size:
                self.output(416, headers=[("Content-Range", f"bytes */{size}")])
                return
            status = 206
            headers.append(("Content-Range", f"bytes {start}-{end}/{size}"))
        data, = self.db.execute("SELECT substr(data,?,?) FROM media WHERE path=?", (start+1, end-start+1, path)).fetchone()
        self.output(status, data, mime, headers)

    def payload(self, limit):
        try:
            length = int(self.headers.get("Content-Length", "-1"))
        except ValueError:
            raise Problem()
        if not 0 <= length <= limit:
            raise Problem("too_large", 413)
        data = self.rfile.read(length)
        if len(data) != length:
            raise Problem()
        return data

    def json_body(self, limit=MIB):
        if self.headers.get_content_type() != "application/json":
            raise Problem("invalid", 415)
        try:
            value = json.loads(self.payload(limit))
        except (UnicodeError, ValueError):
            raise Problem()
        if not isinstance(value, dict):
            raise Problem()
        return value

    def mutate(self):
        if self.headers.get("Origin") not in (None, self.origin):
            raise Problem("forbidden", 403)
        path = self.url.path
        post = self.command == "POST"
        if post and path == "/api/login":
            self.login(self.json_body())
            return
        if post and path == "/api/activity":
            self.record_click()
            return
        if post and path == "/api/enquiries":
            _, source = site_stats.referring_page(self.headers.get("Referer"), self.origin)
            values = self.json_body(limit=16 * 1024)
            ident = enquiries.create(self.db, values, self.client_key(), source)
            self.db.commit()
            acknowledgement = {"ok": True, "id": ident}
            if "submission" in values:
                acknowledgement["version"] = values["submission"]["version"]
            self.reply(acknowledgement, 201)
            return
        token, _ = self.require_owner(write=True)
        section = re.fullmatch(r"/api/owner/site/([a-z]+)", path)
        if not post and section:
            state = site_content.save(self.db, section[1], self.json_body(limit=2 * MIB))
            self.db.commit()
            self.reply(state)
            return
        if post and path == "/api/owner/enquiries":
            ident = enquiries.create(self.db, self.json_body(limit=16 * 1024))
            self.db.commit()
            self.reply({"ok": True, "id": ident}, 201)
            return
        enquiry = re.fullmatch(r"/api/owner/enquiries/([A-Za-z0-9_-]{12,100})", path)
        if not post and enquiry:
            lead = enquiries.update(self.db, enquiry[1], self.json_body(limit=1024))
            self.db.commit()
            self.reply({"lead": lead})
            return
        if post and path == "/api/logout":
            self.db.execute("DELETE FROM sessions WHERE id=?", (token,))
            self.db.commit()
            self.reply({"ok": True}, headers=[("Set-Cookie", self.cookie("", 0))])
            return
        if post and path == "/api/owner/media":
            mime = self.headers.get_content_type()
            if mime not in ("image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"):
                raise Problem("media", 415)
            data = self.payload((20 if mime.startswith("image/") else 64) * MIB)
            url = catalog.store_media(self.db, data, mime)
            self.db.commit()
            self.reply({"url": url}, 201)
            return
        match = re.fullmatch("/api/owner/cars/" + CAR_PATH, path)
        if (post and path == "/api/owner/cars") or (not post and match):
            car = catalog.save_car(self.db, self.json_body(), match[1] if match else None)
            self.db.commit()
            self.reply({"car": car}, 201 if post else 200)
            return
        share = re.fullmatch("/api/owner/cars/" + CAR_PATH + "/shares/(facebook|whatsapp)/(fr|nl|de|en|es)", path)
        if share and not post:
            values = self.json_body()
            self.db.execute("BEGIN IMMEDIATE")
            car = catalog.listing(self.db, share[1])
            content = values.get("text")
            if not catalog.string(content, 16000):
                raise Problem()
            if "previousText" in values:
                previous = self.db.execute(
                    "SELECT text FROM shares WHERE car_id=? AND channel=? AND lang=?", share.groups()).fetchone()
                previous = previous[0] if previous else None
                if previous != values["previousText"] and previous != content:
                    raise Problem("conflict", 409)
            revision = catalog.number(values.get("revision"), 1, 2**53 - 1)
            if revision is None:
                raise Problem()
            if revision != car["revision"]:
                raise Problem("conflict", 409)
            self.db.execute("INSERT OR REPLACE INTO shares VALUES(?,?,?,?,?)", (*share.groups(), content, revision))
            self.db.commit()
            self.reply({"ok": True})
            return
        raise Problem("missing", 404)

    def record_click(self):
        if self.headers.get("Origin") != self.origin:
            raise Problem("forbidden", 403)
        raw = self.json_body(limit=512)
        if set(raw) != {"kind", "car", "source"}:
            raise Problem()
        kind, car, source = raw["kind"], catalog.string(raw["car"], 97), raw["source"]
        if kind not in ("whatsapp", "phone") or source not in site_stats.SOURCES:
            raise Problem()
        ref = self.headers.get("Referer")
        page, _ = site_stats.referring_page(ref, self.origin)
        if ref and (not page or not site_stats.PUBLIC_PAGE.fullmatch(page.path) or
                    "preview" in parse_qs(page.query, keep_blank_values=True)):
            self.reply({"ok": True})
            return
        if not self.session():
            if car:
                catalog.public(catalog.listing(self.db, car))
            site_stats.change(self.db, kind, car, source)
            self.db.commit()
        self.reply({"ok": True})

    def cookie(self, token, age):
        secure = "; Secure" if self.origin.startswith("https://") else ""
        return f"cc_owner={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={age}{secure}"

    def login(self, values):
        address, now = self.client_key(), int(time.time())
        self.db.execute("BEGIN IMMEDIATE")
        self.db.execute("DELETE FROM login_attempts WHERE since < ?", (now - 600,))
        row = self.db.execute("SELECT attempts FROM login_attempts WHERE address=?", (address,)).fetchone()
        if row and row[0] >= 12:
            raise Problem("rate_limited", 429)
        value = catalog.string(values.get("password", ""), 500)
        candidate = hashlib.pbkdf2_hmac("sha256", value.encode(), self.server.salt, 600000)
        if not hmac.compare_digest(candidate, self.server.verifier):
            self.db.execute("""INSERT INTO login_attempts VALUES(?,?,1)
                            ON CONFLICT(address) DO UPDATE SET attempts=attempts+1""", (address, now))
            self.db.commit()
            raise Problem("unauthorized", 401)
        self.db.execute("DELETE FROM login_attempts WHERE address=?", (address,))
        self.db.execute("DELETE FROM sessions WHERE expires < ? OR owner_key != ?", (now, self.server.owner_key))
        token, csrf, age = secrets.token_urlsafe(32), secrets.token_urlsafe(32), 12*3600
        self.db.execute("INSERT INTO sessions VALUES(?,?,?,?)", (digest(token), csrf, now+age, self.server.owner_key))
        self.db.commit()
        self.reply({"ok": True}, headers=[("Set-Cookie", self.cookie(token, age))])


class PreviewHandler(BaseHTTPRequestHandler):
    server_version = "ClaudeCars"

    def log_message(self, *_):
        pass

    def respond(self):
        request = SiteRequest(self.server.settings, self.command, self.path, self.headers,
                              self.rfile, self.client_address[0])
        status, headers, body = request.route()
        self.send_response(status)
        for key, value in headers:
            self.send_header(key, value)
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    do_GET = do_HEAD = do_PUT = do_POST = respond


def settings_for(directory, *, production=False, demo=False):
    origin = os.environ.get("CLAUDE_PUBLIC_ORIGIN", "").rstrip("/")
    parsed = urlsplit(origin)
    if origin and (parsed.scheme not in ("https", "http") or not parsed.hostname or parsed.path
                   or parsed.query or parsed.fragment or parsed.username is not None):
        raise SystemExit("CLAUDE_PUBLIC_ORIGIN must be an origin such as https://cars.example")
    if production and parsed.scheme != "https":
        raise SystemExit("Set CLAUDE_PUBLIC_ORIGIN to the public HTTPS origin.")
    if demo and origin:
        raise SystemExit("The sample inventory is available only in local preview.")
    proxy = os.environ.get("CLAUDE_TRUSTED_PROXY", "").strip()
    try:
        trusted_proxy = str(ip_address(proxy)) if proxy else None
    except ValueError:
        raise SystemExit("CLAUDE_TRUSTED_PROXY expects a single proxy IP address.")
    directory.mkdir(parents=True, exist_ok=True)
    db = directory / "catalogue.sqlite3"
    if db.exists():
        with catalog.connection(db) as connection:
            marked_demo = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='demo_inventory'"
            ).fetchone()
        if demo and not marked_demo:
            raise SystemExit("Choose a new data directory for the sample inventory.")
        if marked_demo and (production or origin or not demo):
            raise SystemExit("Open this sample inventory with --demo on a loopback address.")
    catalog.init(db, draft_seed=production or bool(origin), demo=demo)
    with catalog.connection(db) as connection:
        enquiries.initialize(connection)
        site_content.initialize(connection)
    clean_expired(db)
    password = new_password(directory)
    salt = secrets.token_bytes(24)
    return SimpleNamespace(db_path=db, origin=origin, trusted_proxy=trusted_proxy,
                           hosts={parsed.netloc} if origin else set(), salt=salt,
                           verifier=hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600000),
                           owner_key=credential_key(directory, password))


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("port", nargs="?", type=int, default=48731)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--data-dir", type=Path)
    parser.add_argument("--demo", action="store_true", help="Include five sample cars in a separate local inventory")
    args = parser.parse_args()
    if args.demo and args.host not in ("127.0.0.1", "localhost", "::1"):
        parser.error("Use a loopback address for the sample inventory.")
    if args.demo and not (catalog.ROOT / "demo_inventory.py").is_file():
        parser.error("The sample inventory is available in the local project preview.")
    os.umask(0o077)
    directory = (args.data_dir or catalog.ROOT / (".claude-demo" if args.demo else ".claude-data")).resolve()
    settings = settings_for(directory, demo=args.demo)
    with WebsiteServer((args.host, args.port), PreviewHandler) as server:
        port = server.server_port
        settings.hosts.update((f"127.0.0.1:{port}", f"localhost:{port}", f"{args.host}:{port}"))
        server.settings = settings
        print(f"Claude Cars · http://{args.host}:{port}/fr/", flush=True)
        if not os.environ.get("CLAUDE_OWNER_PASSWORD"):
            print(f"Local owner password file: {directory / 'owner-password'}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    run()
