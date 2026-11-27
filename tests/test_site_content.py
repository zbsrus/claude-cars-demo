"""Editorial changes use a private temporary database and the normal website routes."""
from concurrent.futures import ThreadPoolExecutor
from email.message import Message
from io import BytesIO
import json
import os
from pathlib import Path
import re
import secrets
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import catalogue
import site_content
from backup import snapshot
from preview import SiteRequest, settings_for


class SiteContent(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.data = Path(self.tmp.name) / "database"
        password = secrets.token_urlsafe(24)
        env = patch.dict(os.environ, {"CLAUDE_PUBLIC_ORIGIN": "", "CLAUDE_OWNER_PASSWORD": password})
        env.start()
        self.addCleanup(env.stop)
        self.server = settings_for(self.data)
        self.server.hosts.add("localhost")
        status, headers, _ = self.request("/api/login", method="POST", value={"password": password})
        self.assertEqual(status, 200)
        self.cookie = headers["Set-Cookie"].split(";")[0]
        _, _, html = self.request("/fr/owner", owner=True)
        self.csrf = json.loads(re.search(rb"window.CC=(.*?);</script>", html).group(1))["csrf"]

    def request(self, path, *, method="GET", value=None, owner=False, mime="application/json"):
        headers = Message()
        headers["Host"] = "localhost"
        if owner:
            headers["Cookie"] = self.cookie
            if method != "GET":
                headers["X-CSRF-Token"] = self.csrf
        data = value
        if data is None:
            data = b""
        elif not isinstance(data, bytes):
            data = json.dumps(data).encode()
        if data:
            headers["Content-Type"] = mime
            headers["Content-Length"] = str(len(data))
        request = SiteRequest(self.server, method, path, headers, BytesIO(data), "127.0.0.1")
        status, response_headers, body = request.route()
        response_headers = dict(response_headers)
        if response_headers["Content-Type"].startswith("application/json"):
            body = json.loads(body)
        return status, response_headers, body

    def save(self, section, revision, action, values):
        status, _, state = self.request("/api/owner/site/" + section, method="PUT", owner=True,
                                       value={"action": action, "revision": revision, "values": values})
        return status, state

    def state(self, page):
        status, _, html = self.request(page)
        self.assertEqual(status, 200)
        match = re.search(rb"window.CC=(.*?);</script>", html)
        return json.loads(match.group(1)), html.decode()

    def test_received_review_is_private_until_explicit_publication(self):
        root = "/api/owner/reviews"
        ident = "guest-" + "a" * 32
        private_id = "guest-" + "b" * 32
        feedback = {"id": ident, "rating": 5, "language": "fr", "comment": "Avis reçu en test.", "permission": True}
        self.assertEqual(self.request(root)[0], 401)
        self.assertEqual(self.request("/api/reviews", method="POST", value=dict(feedback, rating=0))[0], 400)
        for _ in range(2):
            self.assertEqual(self.request("/api/reviews", method="POST", value=feedback)[0], 201)
        self.assertEqual(self.request("/api/reviews", method="POST", value=dict(feedback, comment="Changed"))[0], 409)
        self.assertEqual(self.request("/api/reviews", method="POST",
                         value=dict(feedback, id=private_id, comment="Privé.", permission=False))[0], 201)
        self.assertEqual(len(self.request(root, owner=True)[2]["reviews"]), 2)
        for path in ("/fr/", "/fr/about"):
            self.assertNotIn(feedback["comment"], self.state(path)[1])
        quote = {"id": ident, "author": "Anonyme", "language": "fr", "rating": 5, "quote": feedback["comment"]}
        self.assertEqual(self.save("reviews", 0, "publish", {"reviews": [dict(quote, id=private_id)]})[0], 400)
        self.assertEqual(self.save("reviews", 0, "draft", {"reviews": [quote]})[0], 200)
        self.assertNotIn(feedback["comment"], self.state("/fr/about")[1])
        self.assertEqual(self.save("reviews", 1, "publish", {"reviews": [quote]})[0], 200)
        self.assertEqual(self.state("/fr/about")[0]["siteContent"]["reviews"]["reviews"][0]["id"], ident)
        self.assertEqual(self.request(root, method="PUT", value={"id": ident})[0], 401)
        self.assertEqual(self.request(root, method="PUT", value={"id": ident}, owner=True)[0], 200)
        self.assertEqual([r["id"] for r in self.request(root, owner=True)[2]["reviews"]], [private_id])
        self.assertNotIn("Privé.", self.state("/fr/about")[1])

    def test_visibility_retry_discard_and_restore(self):
        api = "/api/owner/site/home"
        self.assertEqual(self.request(api)[0], 401)
        self.assertEqual(self.request(api, owner=True)[2], {"draft": {}, "published": {}, "revision": 0})
        self.assertEqual(self.request("/api/owner/site/unknown", owner=True)[0], 404)
        values = {"texts": {"fr": {"aboutTitle": "Portes ouvertes", "coverLine": "Bienvenue à Wanze."}}}
        state, html = self.state("/fr/")
        self.assertNotIn("siteContent", state)
        self.assertNotIn("site-bindings.js", html)
        status, first = self.save("home", 0, "draft", values)
        self.assertEqual((status, first), (200, {"revision": 1, "draft": values, "published": {}}))
        self.assertNotIn("Portes ouvertes", self.state("/fr/")[1])
        self.assertEqual(self.save("home", 0, "draft", values), (200, first))
        published = self.save("home", 1, "publish", values)
        self.assertEqual(published, self.save("home", 1, "publish", values))
        self.assertEqual(published[1], {"revision": 2, "draft": values, "published": values})
        state, html = self.state("/fr/")
        self.assertEqual(state["siteContent"]["home"], values)
        self.assertIn("<title>Portes ouvertes · Claude Cars</title>", html)
        self.assertIn('<meta property="og:description" content="Bienvenue à Wanze.">', html)
        self.assertIn("<h1>Portes ouvertes</h1>", html)
        self.assertIn("site-bindings.js", html)
        self.assertNotIn("<h1>Portes ouvertes</h1>", self.state("/en/")[1])
        self.assertEqual(self.save("home", 2, "draft", {}), (200, {"revision": 3, "draft": {}, "published": values}))
        self.assertEqual(self.save("home", 3, "discard", {})[1]["draft"], values)
        self.assertEqual(self.save("home", 2, "publish", {})[0], 409)
        target = Path(self.tmp.name) / "snapshot"
        snapshot(self.data, target)
        restored = settings_for(target)
        with catalogue.connection(restored.db_path) as db:
            self.assertEqual(site_content.read(db, "home"), {"revision": 4, "draft": values, "published": values})
        self.assertEqual(self.save("home", 4, "publish", {})[1]["published"], {})
        self.assertNotIn("siteContent", self.state("/fr/")[0])

    def test_upload_and_removed_or_sold_featured_car(self):
        picture = BytesIO()
        Image.new("RGB", (8, 12), "white").save(picture, "PNG")
        status, _, uploaded = self.request("/api/owner/media", method="POST", owner=True, mime="image/png",
                                           value=picture.getvalue())
        self.assertEqual(status, 201)
        url = uploaded["url"]
        cars = self.request("/api/owner/cars", owner=True)[2]["cars"]
        ident = cars[0]["id"]
        values = {"images": {"hero": url}, "featured": [ident]}
        self.assertEqual(self.save("home", 0, "draft", values)[0], 200)
        self.assertEqual(self.request(url)[0], 404)
        self.assertEqual(self.request(url, owner=True)[0], 200)
        self.assertEqual(self.save("home", 1, "publish", values)[0], 200)
        code, headers, _ = self.request(url)
        self.assertEqual((code, headers["Content-Type"]), (200, "image/webp"))
        state, html = self.state("/fr/")
        self.assertIn(f'<meta property="og:image" content="http://localhost{url}">', html)
        self.assertEqual(state["siteContent"]["home"]["featured"], [ident])
        car = cars[0]
        car["status"] = "sold"
        self.assertEqual(self.request("/api/owner/cars/" + ident, method="PUT", value=car, owner=True)[0], 200)
        self.assertEqual(self.state("/fr/")[0]["siteContent"]["home"]["featured"], [])
        self.assertEqual(self.request("/api/owner/site/home", owner=True)[2]["draft"]["featured"], [ident])
        # The editor can still save unrelated changes around a previously pinned vehicle.
        self.assertEqual(self.save("home", 2, "draft", values)[0], 200)
        self.assertEqual(self.save("home", 3, "publish", {})[0], 200)
        self.assertEqual(self.request(url)[0], 404)
        self.assertEqual(self.save("home", 4, "draft", {"featured": [ident]})[0], 400)

    def test_services_photo_draft_publish_and_reset(self):
        picture = BytesIO()
        Image.new("RGB", (10, 16), "green").save(picture, "PNG")
        status, _, uploaded = self.request("/api/owner/media", method="POST", owner=True, mime="image/png",
                                           value=picture.getvalue())
        self.assertEqual(status, 201)
        url = uploaded["url"]
        values = {"images": {"sourcing": url}, "texts": {"fr": {"servicesPhotoAlt": "Ma photo"}}}
        self.assertEqual(self.save("services", 0, "draft", values)[0], 200)
        self.assertNotIn("services", self.state("/fr/")[0].get("siteContent", {}))
        self.assertEqual(self.request(url)[0], 404)
        self.assertEqual(self.save("services", 1, "publish", values)[0], 200)
        self.assertEqual(self.state("/fr/")[0]["siteContent"]["services"], values)
        self.assertEqual(self.request(url)[0], 200)
        self.assertEqual(self.save("services", 2, "publish", {})[0], 200)
        self.assertNotIn("services", self.state("/fr/")[0].get("siteContent", {}))
        self.assertEqual(self.request(url)[0], 404)

    def test_sections_conflict_validation_and_contacts(self):
        body = {"author": "Visiteur du test", "id": "test-1", "language": "fr", "quote": "Exemple privé.",
                "reply": "Réponse privée.", "source": "https://example.com/avis"}
        review = {"reviews": [dict(body, date="2020-02-24"), dict(body, id="test-2", rating=4)]}
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda v: self.save("reviews", 0, "draft", v), [review, {"reviews": []}]))
        self.assertEqual(sorted(code for code, _ in results), [200, 409])
        self.assertNotIn("Visiteur du test", self.state("/fr/about")[1])
        status, bad = self.save("reviews", 1, "publish", {"reviews": [dict(body, source="texte")]})
        self.assertEqual((status, bad), (400, {"error": "invalid", "field": "reviews.0.source"}))
        status, bad = self.save("reviews", 1, "draft", {"reviews": [dict(body, rating=6)]})
        self.assertEqual((status, bad), (400, {"error": "invalid", "field": "reviews.0.rating"}))
        status, bad = self.save("reviews", 1, "draft", {"reviews": [dict(body, date="2020-02-30")]})
        self.assertEqual((status, bad), (400, {"error": "invalid", "field": "reviews.0.date"}))
        self.assertEqual(self.save("reviews", 1, "publish", review)[1]["published"], review)
        self.assertEqual(self.state("/fr/about")[0]["siteContent"]["reviews"], review)
        self.assertEqual(self.state("/fr/")[0]["siteContent"]["reviews"], review)
        for section, values, field in (
            ("services", {"texts": {"fr": {"servicesIntro": "a" * 4001}}}, "texts.fr.servicesIntro"),
            ("catalogue", {"texts": {"en": {"story": "test"}}}, "texts.en.story"),
            ("home", {"images": {"hero": "/not-a-photo"}}, "images.hero"),
            ("contact", {"contacts": {"email": "texte"}}, "contacts.email"),
            ("contact", {"contacts": {"whatsapp": "0400 00 00 00"}}, "contacts.whatsapp"),
            ("home", {"featured": ["missing-car"]}, "featured.0"),
        ):
            self.assertEqual(self.save(section, 0, "draft", values), (400, {"error": "invalid", "field": field}))
        contact = {"contacts": {"phone": "+32 400 00 00 00", "whatsapp": "32400000000",
                                "email": "exemple@example.com", "address": "Rue du test"}}
        self.assertEqual(self.save("contact", 0, "publish", contact)[1]["published"], contact)
        self.assertIn('<a href="tel:+32400000000">+32 400 00 00 00</a>', self.state("/fr/contact")[1])


if __name__ == "__main__":
    unittest.main()
