"""Public/owner boundaries and durable listing lifecycle, using a separate temporary catalogue."""
import http.cookiejar
from datetime import date, timedelta
import json
import os
from pathlib import Path
import re
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, HTTPCookieProcessor

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import catalogue
import enquiries


class Publication(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        cls.base = "http://127.0.0.1:" + str(port)
        cls.password = os.urandom(18).hex()
        cls.proc = subprocess.Popen(
            [sys.executable, str(ROOT / "preview.py"), str(port), "--data-dir", cls.directory.name],
            env={**os.environ, "CLAUDE_OWNER_PASSWORD": cls.password}, stdout=subprocess.DEVNULL)
        cls.client = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        cls.guest = build_opener()
        for _ in range(100):
            try:
                with cls.guest.open(cls.base + "/") as page:
                    if page.status == 200:
                        break
            except URLError:
                time.sleep(.05)
        else:
            cls.proc.terminate()
            raise RuntimeError("server did not start")

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        cls.proc.wait(timeout=5)
        cls.directory.cleanup()

    def http(self, path, method="GET", data=None, visitor=False, headers=None):
        hdrs = dict(headers or {})
        if isinstance(data, dict):
            hdrs["Content-Type"] = "application/json"
            data = json.dumps(data).encode()
        req = Request(self.base + path, method=method, data=data, headers=hdrs)
        try:
            resp = (self.guest if visitor else self.client).open(req)
        except HTTPError as err:
            resp = err
        with resp:
            content = resp.read()
            return resp.status, json.loads(content) if "application/json" in resp.headers.get("Content-Type","") else content

    def test_publication_lifecycle(self):
        self.assertEqual(self.http("/api/owner/cars", visitor=True)[0], 401)
        self.assertEqual(self.http("/api/login","POST",{"password":self.password})[0],200)
        owner_page = self.http("/en/owner")[1].decode()
        state = json.loads(re.search(r"window.CC=(.*?);</script>",owner_page).group(1))
        token = {"X-CSRF-Token":state["csrf"]}
        self.assertTrue(state["authenticated"])
        self.assertEqual(self.http("/api/owner/cars","POST",{})[0],403)
        status, file = self.http("/api/owner/media","POST",(ROOT/"assets/z4/1.webp").read_bytes(),
                                 headers={**token,"Content-Type":"image/webp"})
        self.assertEqual(status,201)
        media = file["url"]
        self.assertEqual(self.http(media,visitor=True)[0],404)
        test = {"make":"BMW","model":"Z4","year":2011,"km":126000,"price":25901.66,"requestId":"test-inventory-creation","status":"draft",
                "photos":[media], "cover":media, "translations":{"fr":{"intro":"Documenté, vérifié & complet."},
                "nl":{"intro":"Ongepubliceerde redactie"}}}
        status, content = self.http("/api/owner/cars","POST",test,headers=token)
        self.assertEqual(status,201,content)
        car = content["car"]
        retried = self.http("/api/owner/cars","POST",test,headers=token)
        self.assertEqual(retried[1]["car"]["id"],car["id"])
        self.assertEqual(len(self.http("/api/owner/cars")[1]["cars"]),2)
        api = "/api/owner/cars/"+car["id"]
        public = "/nl/cars/"+car["id"]
        self.assertEqual(self.http(public, visitor=True)[0],404)
        car["status"]="available"
        status,published=self.http(api,"PUT",car,headers=token)
        self.assertEqual(status,200,published)
        self.assertEqual(self.http(api,"PUT",car,headers=token)[0],409)
        status, page=self.http(public,visitor=True)
        self.assertEqual(status,200)
        self.assertIn(b'property="og:image"',page)
        self.assertNotIn(b"Ongepubliceerde",page)
        self.assertIn("Beschikbaar · 2011 · 126.000 km · €25.901,66".encode(),page)
        self.assertNotIn(b"Document",re.search(rb'property="og:description" content="([^"]*)"',page).group(1))
        self.assertEqual(self.http(media,visitor=True,headers={"Range":"bytes=0-9"})[1][:4], b"RIFF")
        car=published["car"]
        for channel in ("facebook","whatsapp"):
            for lang in ("en","nl"):
                msg=channel+"\n"+lang+" · € & 🏁"
                self.assertEqual(self.http(api+"/shares/"+channel+"/"+lang,"PUT",{"text":msg,"revision":car["revision"]},headers=token)[0],200)
        share=self.http(api+"/shares")[1]["shares"]
        self.assertEqual(share["facebook"]["nl"]["text"],"facebook\nnl · € & 🏁")
        self.assertEqual(sum(len(x) for x in share.values()),4)
        outdated = {"text":"Conflicting update","revision":car["revision"],"previousText":None}
        self.assertEqual(self.http(api+"/shares/facebook/nl","PUT",outdated,headers=token)[0],409)
        self.assertEqual(self.http(api+"/shares",visitor=True)[0],401)
        for status in ("reserved","sold"):
            car["status"]=status
            car=self.http(api,"PUT",car,headers=token)[1]["car"]
        _, page=self.http(public,visitor=True)
        state=json.loads(re.search(r"window.CC=(.*?);</script>",page.decode()).group(1))
        actual=next(c for c in state["cars"] if c["id"]==car["id"])
        self.assertIsNone(actual["price"])
        self.assertNotIn(b"25"+ " ".encode()+b"901",page)
        self.assertEqual(self.http("/api/logout","POST",{},headers=token)[0],200)
        self.assertEqual(self.http(api+"/shares")[0],401)

    def test_guest_submission_and_private_owner_journal(self):
        self.assertEqual(self.http("/api/owner/enquiries", visitor=True)[0], 401)
        car_id = "bmw-z4-e89-35is"
        card = "/en/cars/" + car_id
        self.http(card, visitor=True)
        self.http(card + "?preview", visitor=True)
        self.http(card, "HEAD", visitor=True)
        self.assertEqual(self.http("/api/login", "POST", {"password": self.password})[0], 200)
        html = self.http("/en/owner")[1].decode()
        state = json.loads(re.search(r"window.CC=(.*?);</script>", html).group(1))
        token = {"X-CSRF-Token": state["csrf"]}
        self.http(card)
        journal = "/api/owner/enquiries"
        self.assertEqual(sum(v["count"] for v in self.http(journal)[1]["views"] if v["car"] == car_id), 1)
        request = {"id": "rc-verification-0001", "type": "question", "lang": "en", "car": car_id,
                   "fields": {"name": "Local fixture", "reach": "test@example.invalid", "message": "Test message"}}
        self.assertEqual(self.http("/api/enquiries", "POST", {**request, "fields": {}}, visitor=True)[0], 400)
        self.assertEqual(self.http("/api/enquiries", "POST", {**request, "car": "no-such-car"}, visitor=True)[0], 409)
        for _ in range(2):
            status, ack = self.http("/api/enquiries", "POST", request, visitor=True)
            self.assertEqual((status, ack), (201, {"ok": True, "id": request["id"]}))
        self.assertEqual(self.http("/api/enquiries", "POST", {**request, "lang": "fr"}, visitor=True)[0], 409)
        body = self.http("/en/")[1].decode()
        self.assertNotIn(request["fields"]["reach"], body)
        lead, = self.http(journal)[1]["leads"]
        self.assertEqual((lead["fields"], lead["title"]), (request["fields"], "BMW Z4 E89 35is DKG7"))
        item = journal + "/" + lead["id"]
        change = {"status": "booked", "revision": 1}
        self.assertEqual(self.http(item, "PUT", change, visitor=True)[0], 401)
        self.assertEqual(self.http(item, "PUT", change)[0], 403)
        booked = self.http(item, "PUT", change, headers=token)[1]["lead"]
        self.assertEqual(booked["status"], "booked")
        self.assertGreaterEqual(booked["bookedAt"], lead["time"])
        self.assertEqual(self.http(item, "PUT", change, headers=token)[0], 409)
        restored = self.http(item, "PUT", {"status": "new", "revision": 2}, headers=token)[1]["lead"]
        self.assertNotIn("bookedAt", restored)
        manual = {**request, "type": "manual", "id": "rc-verification-0002"}
        self.assertEqual(self.http("/api/enquiries", "POST", manual, visitor=True)[0], 400)
        self.assertEqual(self.http(journal, "POST", manual, headers=token)[0], 201)
        store = Path(self.directory.name) / "catalogue.sqlite3"
        with sqlite3.connect(store) as db:
            db.execute("UPDATE enquiries SET created=0 WHERE id=?", (lead["id"],))
        active = self.http(journal)[1]["leads"]
        self.assertEqual([r["id"] for r in active], [manual["id"]])
        self.assertEqual(self.http(item, "PUT", change, headers=token)[0], 404)
        self.assertEqual(self.http(journal, "POST", manual, headers=token)[0], 201)
        with sqlite3.connect(store) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM enquiries WHERE id=?", (lead["id"],)).fetchone()[0], 0)
        self.assertEqual(self.http("/api/logout", "POST", {}, headers=token)[0], 200)
        self.assertEqual(self.http(journal)[0], 401)

    def test_crawlable_routes_and_preview_index_policy(self):
        for lang in ("fr", "nl", "de", "en", "es"):
            status, page = self.http("/" + lang + "/privacy", visitor=True)
            self.assertEqual(status, 200)
            self.assertIn(f'<html lang="{lang}">'.encode(), page)
            self.assertIn(b'<meta name="robots" content="noindex,nofollow">', page)
            self.assertEqual(page.count(b'<link rel="alternate"'), 6)
        home = self.http("/", visitor=True)[1]
        fallback = re.search(rb'<main[^>]*>(.*?)</main>', home, re.DOTALL).group(1)
        self.assertIn(b'/fr/cars/bmw-z4-e89-35is', fallback)
        self.assertIn(b'og:image', home)
        self.assertIn(b'claude-cars-social.jpg', home)
        self.assertIn(b'Disallow: /\n', self.http("/robots.txt", visitor=True)[1])
        sitemap = self.http("/sitemap.xml", visitor=True)[1]
        self.assertNotIn(b'/owner', sitemap)
        self.assertIn(b'/es/cars/bmw-z4-e89-35is', sitemap)

    def test_submission_limit_counts_new_requests_only(self):
        store = Path(self.directory.name) / "catalogue.sqlite3"
        with sqlite3.connect(store) as db:
            db.execute("DELETE FROM enquiry_limits")
        body = {"lang": "en", "type": "question",
                "fields": {"name": "Rate fixture", "reach": "limits@example.invalid", "message": "Test"}}
        for i in range(12):
            body["id"] = f"limited-fixture-{i}"
            self.assertEqual(self.http("/api/enquiries", "POST", body, visitor=True)[0], 201)
        self.assertEqual(self.http("/api/enquiries", "POST", body, visitor=True)[0], 201)
        self.assertEqual(self.http("/api/enquiries", "POST", {**body, "id": "limited-next-item"}, visitor=True)[0], 429)
        with sqlite3.connect(store) as db:
            token, attempts = db.execute("SELECT client, attempts FROM enquiry_limits").fetchone()
            self.assertRegex(token, r"^[a-f0-9]{64}$")
            self.assertEqual(attempts, 12)
            db.execute("UPDATE enquiry_limits SET since=0")
        self.assertEqual(self.http("/api/enquiries", "POST", {**body, "id": "limited-next-item"}, visitor=True)[0], 201)

    def test_site_metrics_without_visitor_records(self):
        self.assertEqual(self.http("/api/login", "POST", {"password": self.password})[0], 200)
        owner = self.http("/en/owner")[1].decode()
        state = json.loads(re.search(r"window.CC=(.*?);</script>", owner).group(1))
        csrf = {"X-CSRF-Token": state["csrf"]}
        journal = "/api/owner/enquiries"
        car = "bmw-z4-e89-35is"
        card = "/en/cars/" + car

        def counts():
            sums = {}
            for row in self.http(journal)[1]["metrics"]:
                self.assertEqual(set(row), {"day", "car", "kind", "source", "count"})
                key = (row["car"], row["kind"], row["source"])
                sums[key] = sums.get(key, 0) + row["count"]
            return sums

        before = counts()
        self.http(card + "?src=facebook", visitor=True)
        self.http("/nl/cars/" + car, visitor=True, headers={"Referer": self.base + card + "?src=facebook"})
        self.http(card, visitor=True, headers={"Referer": self.base + "/en/cars"})
        self.http("/fr/", visitor=True, headers={"Referer": "https://wa.me/private/example"})
        self.http(card + "?preview", visitor=True)
        self.http(card, method="HEAD", visitor=True)
        self.http(card)
        click = {"kind": "phone", "car": car, "source": "facebook"}
        hdr = {"Origin": self.base, "Referer": self.base + card}
        self.assertEqual(self.http("/api/activity", "POST", click, visitor=True, headers=hdr)[0], 200)
        self.http("/api/activity", "POST", click, headers=hdr)
        self.http("/api/activity", "POST", click, visitor=True, headers={**hdr, "Referer": self.base + card + "?preview"})
        self.assertEqual(self.http("/api/activity", "POST", click, visitor=True)[0], 403)
        self.assertEqual(self.http("/api/activity", "POST", {**click, "source": "free text"}, visitor=True, headers=hdr)[0], 400)
        self.assertEqual(self.http("/api/activity", "POST", {**click, "car": "missing"}, visitor=True, headers=hdr)[0], 404)
        self.assertEqual(self.http("/api/activity", "POST", {**click, "kind": "visit"}, visitor=True, headers=hdr)[0], 400)
        after = counts()
        diff = {key: value - before.get(key, 0) for key, value in after.items() if value != before.get(key)}
        self.assertEqual(diff, {(car, "visit", "facebook"): 1, (car, "view", "facebook"): 1,
                                (car, "view", "other"): 1, ("", "visit", "whatsapp"): 1,
                                (car, "phone", "facebook"): 1})
        self.assertEqual(self.http("/api/logout", "POST", {}, headers=csrf)[0], 200)

    def test_upgrade_preserves_anonymous_history(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "upgrade.sqlite3"
            catalogue.init(path)
            with catalogue.connection(path) as db:
                db.executescript("""
                    CREATE TABLE vehicle_views(day TEXT,car TEXT,count INTEGER,PRIMARY KEY(day,car));
                    INSERT INTO vehicle_views VALUES('2020-12-01','bmw-z4-e89-35is',7);
                    CREATE TABLE enquiries(id TEXT PRIMARY KEY,created INTEGER,fingerprint TEXT,record TEXT);
                """)
                legacy = dict(car="bmw-z4-e89-35is", type="manual", time=1606780800000,
                              status="booked", bookedAt=1606780800000, fields={"name":"Expiry fixture"})
                db.execute("INSERT INTO enquiries VALUES('fixture',?,?,?)", (legacy["time"], "old", json.dumps(legacy)))
                enquiries.initialize(db)
                self.assertEqual(enquiries.records(db), [])
                expected = [("bookings", "whatsapp", 1), ("saved", "whatsapp", 1), ("view", "other", 7)]
                query = "SELECT kind,source,count FROM daily_activity ORDER BY kind"
                self.assertEqual(db.execute(query).fetchall(), expected)
                enquiries.initialize(db)
                self.assertEqual(db.execute(query).fetchall(), expected)

    def test_viewing_correction_keeps_one_request(self):
        self.assertEqual(self.http("/api/login", "POST", {"password": self.password})[0], 200)
        page = self.http("/en/owner")[1].decode()
        state = json.loads(re.search(r"window.CC=(.*?);</script>", page).group(1))
        csrf = {"X-CSRF-Token": state["csrf"]}
        journal = "/api/owner/enquiries"
        path = "/api/enquiries"
        day = (date.today() + timedelta(days=14)).isoformat()
        ident = "viewing-correction-fixture"
        car = "bmw-z4-e89-35is"
        original = {
            "id": ident, "lang": "fr", "type": "viewing", "car": car,
            "submission": {"key": os.urandom(16).hex(), "version": 1},
            "fields": {"name": "Viewing fixture", "reach": "local@example.invalid", "date": day + "T10:30"},
        }
        correction = {**original, "submission": {**original["submission"], "version": 2},
                      "fields": {**original["fields"], "date": day + "T14:30"}}
        def read_metrics(kind):
            return sum(row["count"] for row in self.http(journal)[1]["metrics"]
                       if row["kind"] == kind and row["car"] == car)

        before = read_metrics("saved")
        booked_before = read_metrics("bookings")
        for _ in range(2):
            self.assertEqual(self.http(path, "POST", original, visitor=True),
                             (201, {"ok": True, "id": ident, "version": 1}))
        self.assertEqual(self.http(journal + "/" + ident, "PUT", {"status": "booked", "revision": 1}, headers=csrf)[0], 200)
        self.assertEqual(read_metrics("bookings"), booked_before + 1)
        wrong_key = {**correction, "submission": {**correction["submission"], "key": os.urandom(16).hex()}}
        self.assertEqual(self.http(path, "POST", wrong_key, visitor=True)[0], 409)
        for _ in range(2):
            self.assertEqual(self.http(path, "POST", correction, visitor=True),
                             (201, {"ok": True, "id": ident, "version": 2}))
        self.assertEqual(self.http(path, "POST", original, visitor=True), (409, {"error": "superseded"}))
        lead, = (lead for lead in self.http(journal)[1]["leads"] if lead["id"] == ident)
        self.assertEqual((lead["fields"]["date"], lead["status"], lead["revision"]), (day + "T14:30", "new", 3))
        self.assertIn("buyerUpdatedAt", lead)
        self.assertNotIn("bookedAt", lead)
        self.assertNotIn("submission", lead)
        self.assertEqual(read_metrics("saved"), before + 1)
        self.assertEqual(read_metrics("bookings"), booked_before)
        self.assertEqual(self.http("/api/logout", "POST", {}, headers=csrf)[0], 200)


if __name__ == "__main__":
    unittest.main()
