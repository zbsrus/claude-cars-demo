"""Drafts and published overrides for the editable sections of the website."""
import hashlib
import json
import re
from urllib.parse import urlsplit

from catalogue import LANGS, Problem, UPLOAD_PATH, string


TEXT_KEYS = {
    "home": ("aboutTitle", "coverLine", "featured", "z3Credit", "z3Alt", "exploreCars"),
    "catalogue": ("current", "catalogueIntro", "archive", "noCars"),
    "profile": ("aboutTitle", "story", "selectionTitle", "selection", "claudePortrait"),
    "services": ("services", "servicesIntro", "search", "import"),
    "contact": ("contactPage", "contactIntro", "questionIntro", "viewingIntro",
                "sourcingIntro", "importIntro", "byAppointment", "contactDetails"),
    "privacy": ("privacy", "privacyEnquiries", "privacyEnquiriesText", "privacySecurity",
                "privacySecurityText", "privacyDraft", "privacyButtons", "privacyChoiceText",
                "privacyRights", "privacyRightsText"),
    "reviews": (),
}
IMAGE_KEYS = {"home": "hero", "profile": "portrait"}
CONTACT_LIMITS = {"phone": 40, "whatsapp": 40, "email": 254, "address": 400,
                  "facebook": 2048, "company": 400, "vat": 80}
ACTIVE_CARS = ("available", "soon", "reserved")


class InvalidField(Problem):
    def __init__(self, field):
        super().__init__("invalid", 400)
        self.field = field


def initialize(db):
    db.execute("""CREATE TABLE IF NOT EXISTS site_sections (
        section TEXT PRIMARY KEY, revision INTEGER NOT NULL,
        draft TEXT NOT NULL, published TEXT NOT NULL, last_request TEXT NOT NULL
    )""")


def check_section(section):
    if section not in TEXT_KEYS:
        raise Problem("missing", 404)


def read(db, section):
    check_section(section)
    row = db.execute("SELECT revision,draft,published FROM site_sections WHERE section=?", (section,)).fetchone()
    if not row:
        return {"revision": 0, "draft": {}, "published": {}}
    return {"revision": row[0], "draft": json.loads(row[1]), "published": json.loads(row[2])}


def public(db):
    sections = {name: json.loads(raw) for name, raw in
                db.execute("SELECT section,published FROM site_sections WHERE published <> '{}'")}
    home = sections.get("home", {})
    if home.get("featured"):
        active = {ident for (ident,) in db.execute("""
            SELECT id FROM cars WHERE json_extract(data,'$.status') IN (?,?,?)
        """, ACTIVE_CARS)}
        home["featured"] = [ident for ident in home["featured"] if ident in active]
    return sections


def public_image(db, path):
    return db.execute("""
        SELECT 1 FROM site_sections, json_each(published, '$.images') AS image
        WHERE image.value=? LIMIT 1
    """, (path,)).fetchone() is not None


def mapping(value, keys, field):
    if not isinstance(value, dict):
        raise InvalidField(field)
    for key in value:
        if key not in keys:
            raise InvalidField(f"{field}.{key}" if field != "values" else key)
    return value


def clean_text(value, limit, field, *, required=False):
    try:
        value = string(value, limit)
    except Problem:
        raise InvalidField(field) from None
    if required and not value:
        raise InvalidField(field)
    return value


def https_url(value, field):
    try:
        url = urlsplit(value)
        if (url.scheme != "https" or not url.hostname or url.username is not None
                or url.password is not None or "\\" in value or re.search(r"\s", value)):
            raise ValueError()
        # Accessing the port validates the optional port portion of the URL.
        _ = url.port
    except ValueError:
        raise InvalidField(field) from None


def translations(section, value):
    result = {}
    for lang, fields in mapping(value, LANGS, "texts").items():
        translation = {}
        for key, raw in mapping(fields, TEXT_KEYS[section], "texts." + lang).items():
            text = clean_text(raw, 4000, f"texts.{lang}.{key}")
            if text:
                translation[key] = text
        if translation:
            result[lang] = translation
    return result


def contacts(value):
    result = {}
    for key, raw in mapping(value, CONTACT_LIMITS, "contacts").items():
        field = "contacts." + key
        text = clean_text(raw, CONTACT_LIMITS[key], field)
        if not text:
            continue
        if key in ("phone", "whatsapp"):
            digits = re.sub(r"\D", "", text)
            if not re.fullmatch(r"\+?[0-9 ()-]+", text) or not 7 <= len(digits) <= 15:
                raise InvalidField(field)
            if key == "whatsapp" and digits.startswith("0"):
                raise InvalidField(field)
        if key == "email" and not re.fullmatch(r"[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+", text):
            raise InvalidField(field)
        if key == "facebook":
            https_url(text, field)
        result[key] = text
    return result


def images(db, section, value):
    result = {}
    for key, path in mapping(value, (IMAGE_KEYS[section],), "images").items():
        field = "images." + key
        path = clean_text(path, 100, field)
        if not path:
            continue
        if not UPLOAD_PATH.fullmatch(path) or not db.execute(
                "SELECT 1 FROM media WHERE path=? AND mime='image/webp'", (path,)).fetchone():
            raise InvalidField(field)
        result[key] = path
    return result


def featured(db, value, previous):
    if not isinstance(value, list) or len(value) > 3:
        raise InvalidField("featured")
    seen = set()
    for index, ident in enumerate(value):
        field = f"featured.{index}"
        if not isinstance(ident, str) or not re.fullmatch("[a-z0-9][a-z0-9-]{0,96}", ident) or ident in seen:
            raise InvalidField(field)
        if ident not in previous and not db.execute("""
            SELECT 1 FROM cars WHERE id=? AND json_extract(data,'$.status') IN (?,?,?)
        """, (ident, *ACTIVE_CARS)).fetchone():
            raise InvalidField(field)
        seen.add(ident)
    return value


def reviews(value):
    if not isinstance(value, list) or len(value) > 30:
        raise InvalidField("reviews")
    result = []
    seen = set()
    for index, entry in enumerate(value):
        field = f"reviews.{index}"
        mapping(entry, ("id", "author", "language", "quote", "reply", "source", "rating"), field)
        ident = clean_text(entry.get("id"), 64, field + ".id", required=True)
        if not re.fullmatch("[a-zA-Z0-9_-]+", ident) or ident in seen:
            raise InvalidField(field + ".id")
        seen.add(ident)
        if entry.get("language") not in LANGS:
            raise InvalidField(field + ".language")
        item = {"id": ident, "language": entry["language"]}
        rating = entry.get("rating")
        if rating is not None:
            if type(rating) is not int or not 1 <= rating <= 5:
                raise InvalidField(field + ".rating")
            item["rating"] = rating
        for key, limit in (("author", 120), ("quote", 2000), ("reply", 2000), ("source", 2048)):
            item[key] = clean_text(entry.get(key, ""), limit, field + "." + key, required=key in ("author", "quote"))
        if item["source"]:
            https_url(item["source"], field + ".source")
        result.append(item)
    return result


def validated(db, section, values, state):
    keys = {"texts"} if TEXT_KEYS[section] else set()
    if section in IMAGE_KEYS:
        keys.add("images")
    keys.update({"home": ["featured"], "reviews": ["reviews"], "contact": ["contacts"]}.get(section, []))
    result = {}
    for key, raw in mapping(values, keys, "values").items():
        if key == "texts":
            data = translations(section, raw)
        elif key == "images":
            data = images(db, section, raw)
        elif key == "contacts":
            data = contacts(raw)
        elif key == "featured":
            existing = state["draft"].get(key, []) + state["published"].get(key, [])
            data = featured(db, raw, existing)
        elif key == "reviews":
            data = reviews(raw)
        if data or key in ("featured", "reviews"):
            result[key] = data
    return result


def save(db, section, body):
    check_section(section)
    mapping(body, ("action", "revision", "values"), "request")
    action, revision = body.get("action"), body.get("revision")
    if action not in ("draft", "publish", "discard"):
        raise InvalidField("action")
    if type(revision) is not int or revision < 0:
        raise InvalidField("revision")
    if not isinstance(body.get("values"), dict):
        raise InvalidField("values")
    fingerprint = hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    db.execute("BEGIN IMMEDIATE")
    state = read(db, section)
    if revision != state["revision"]:
        last = db.execute("SELECT last_request FROM site_sections WHERE section=?", (section,)).fetchone()
        if revision == state["revision"] - 1 and last and last[0] == fingerprint:
            return state
        raise Problem("conflict", 409)
    draft = state["published"] if action == "discard" else validated(db, section, body["values"], state)
    published = draft if action == "publish" else state["published"]
    db.execute("""INSERT INTO site_sections (section,revision,draft,published,last_request) VALUES (?,?,?,?,?)
        ON CONFLICT(section) DO UPDATE SET revision=excluded.revision, draft=excluded.draft,
        published=excluded.published, last_request=excluded.last_request""",
        (section, revision + 1, json.dumps(draft), json.dumps(published), fingerprint))
    return {"revision": revision + 1, "draft": draft, "published": published}
