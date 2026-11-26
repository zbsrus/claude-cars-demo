"""Private enquiry journal. Only an explicit site submission enters this journal."""
import hashlib
import hmac
import json
import re
import time
from datetime import datetime
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from catalogue import LANGS, Problem, listing, string
import site_stats

RETENTION_MS = 90 * 24 * 3600 * 1000
ID = re.compile(r"[A-Za-z0-9_-]{12,100}")
SUBMISSION_KEY = re.compile(r"[a-f0-9]{32}")
FIELDS = {
    "question": ("message",),
    "viewing": ("date", "message"),
    "sourcing": ("model", "budget", "mileage", "options", "message"),
    "import": ("listingUrl", "message"),
    "manual": ("note",),
}


def initialize(db):
    db.executescript("""
        CREATE TABLE IF NOT EXISTS enquiries (
            id TEXT PRIMARY KEY, created INTEGER NOT NULL, fingerprint TEXT NOT NULL,
            record TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS enquiry_date ON enquiries(created);
        CREATE TABLE IF NOT EXISTS enquiry_submissions (
            id TEXT PRIMARY KEY REFERENCES enquiries(id) ON DELETE CASCADE,
            key_hash TEXT NOT NULL, version INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS enquiry_limits (
            client TEXT PRIMARY KEY, since INTEGER NOT NULL, attempts INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS vehicle_views (
            day TEXT NOT NULL, car TEXT NOT NULL REFERENCES cars(id), count INTEGER NOT NULL,
            PRIMARY KEY(day,car));
    """)
    site_stats.initialize(db)
    expire(db)


def expire(db):
    now = int(time.time())
    db.execute("DELETE FROM enquiries WHERE created<=?", (now * 1000 - RETENTION_MS,))
    db.execute("DELETE FROM enquiry_limits WHERE since<=?", (now - 3600,))


def views(db):
    rows = db.execute("""SELECT day,car,sum(count) FROM daily_activity WHERE kind='view'
                         GROUP BY day,car ORDER BY day,car""")
    return [dict(day=day, car=car, count=count) for day, car, count in rows]


def records(db):
    cutoff = int(time.time() * 1000) - RETENTION_MS
    rows = db.execute("SELECT record FROM enquiries WHERE created>? ORDER BY created DESC, id", (cutoff,))
    return [json.loads(row[0]) for row in rows]


def normalized(raw, manual):
    ident = string(raw.get("id"), 100)
    kind = string(raw.get("type"), 24)
    lang = string(raw.get("lang"), 2)
    car = string(raw.get("car", ""), 97)
    if not ID.fullmatch(ident) or kind not in FIELDS or (kind == "manual") != manual or lang not in LANGS:
        raise Problem()
    values = raw.get("fields")
    if not isinstance(values, dict):
        raise Problem()
    fields = {}
    limits = {"message": 1800, "note": 1800, "listingUrl": 2048}
    for key in ("name", "reach", *FIELDS[kind]):
        value = string(values.get(key, ""), limits.get(key, 280))
        if value:
            fields[key] = value
    reach = fields.get("reach", "")
    email = re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", reach)
    phone = re.fullmatch(r"[+\d() .-]+", reach) and len(re.sub(r"\D", "", reach)) >= 6
    if not fields.get("name") or not (email or phone) or (kind == "question" and "message" not in fields):
        raise Problem()
    if kind == "viewing" and not car:
        raise Problem()
    if kind == "sourcing" and (not fields.get("model") or any(
            not re.fullmatch(r"[1-9][0-9]*", fields.get(key, "")) for key in ("budget", "mileage"))):
        raise Problem()
    if kind == "import":
        try:
            url = urlsplit(fields.get("listingUrl", ""))
            if url.scheme not in ("http", "https") or not url.hostname or url.username or url.password:
                raise Problem()
        except ValueError:
            raise Problem()
        car = ""
    return dict(id=ident, type=kind, lang=lang, car=car, fields=fields)


def validate_current_details(db, lead, manual):
    title = ""
    if lead["car"]:
        try:
            car = listing(db, lead["car"])
        except Problem:
            raise Problem("unavailable", 409)
        if (not manual and car["status"] == "draft") or (lead["type"] == "viewing" and car["status"] != "available"):
            raise Problem("unavailable", 409)
        title = f"{car['make']} {car['model']}"
    if lead["type"] == "viewing" and lead["fields"].get("date"):
        value = lead["fields"]["date"]
        try:
            requested = datetime.strptime(value, "%Y-%m-%dT%H:%M")
            now_local = datetime.now(ZoneInfo("Europe/Brussels")).replace(tzinfo=None, second=0, microsecond=0)
            if requested < now_local:
                raise Problem()
        except ValueError:
            raise Problem()
    return title


def submission(raw, manual):
    if "submission" not in raw:
        return None
    value = raw["submission"]
    if manual or not isinstance(value, dict):
        raise Problem()
    key, version = value.get("key"), value.get("version")
    if not isinstance(key, str) or not SUBMISSION_KEY.fullmatch(key) or type(version) is not int or not 1 <= version <= 10000:
        raise Problem()
    return hashlib.sha256(key.encode()).hexdigest(), version


def revise(db, lead, fingerprint, edit, earlier):
    previous_fingerprint, record, key_hash, previous_version = earlier
    if key_hash is None:
        if edit is not None or previous_fingerprint != fingerprint:
            raise Problem("conflict", 409)
        return
    if edit is None or not hmac.compare_digest(edit[0], key_hash):
        raise Problem("conflict", 409)
    version = edit[1]
    if version < previous_version:
        raise Problem("superseded", 409)
    if version == previous_version:
        if fingerprint != previous_fingerprint:
            raise Problem("conflict", 409)
        return

    ident = lead["id"]
    if fingerprint != previous_fingerprint:
        previous = json.loads(record)
        if any(lead[field] != previous[field] for field in ("car", "type", "fields")):
            title = validate_current_details(db, lead, manual=False)
            source = site_stats.lead_source(previous)
            booked_at = previous.pop("bookedAt", None)
            if booked_at:
                site_stats.change(db, "bookings", previous["car"], source, booked_at / 1000, decrement=True)
            if lead["car"] != previous["car"]:
                received_at = previous["time"] / 1000
                site_stats.change(db, "saved", previous["car"], source, received_at, decrement=True)
                site_stats.change(db, "saved", lead["car"], source, received_at)
            previous.update(status="new", revision=previous["revision"] + 1, title=title,
                            buyerUpdatedAt=int(time.time() * 1000))
        previous.update(lead)
        db.execute("UPDATE enquiries SET fingerprint=?, record=? WHERE id=?",
                   (fingerprint, json.dumps(previous), ident))
    db.execute("UPDATE enquiry_submissions SET version=? WHERE id=?", (version, ident))


def create(db, raw, client=None, origin="other"):
    manual = client is None
    lead = normalized(raw, manual)
    edit = submission(raw, manual)
    ident = lead["id"]
    fingerprint = hashlib.sha256(json.dumps(lead, sort_keys=True).encode()).hexdigest()
    db.execute("BEGIN IMMEDIATE")
    expire(db)
    earlier = db.execute("""SELECT fingerprint, record, key_hash, version FROM enquiries
                            LEFT JOIN enquiry_submissions USING (id) WHERE id=?""", (ident,)).fetchone()
    if earlier:
        revise(db, lead, fingerprint, edit, earlier)
        return ident
    title = validate_current_details(db, lead, manual)
    now = int(time.time() * 1000)
    if not manual:
        attempts = db.execute("SELECT attempts FROM enquiry_limits WHERE client=?", (client,)).fetchone()
        if attempts and attempts[0] >= 12:
            raise Problem("rate_limited", 429)
        db.execute("""INSERT INTO enquiry_limits VALUES(?,?,1)
                   ON CONFLICT(client) DO UPDATE SET attempts=attempts+1""", (client, now // 1000))
    lead.update(source="whatsapp" if manual else "website", origin="whatsapp" if manual else origin,
                time=now, status="new", revision=1, title=title)
    db.execute("INSERT INTO enquiries VALUES(?,?,?,?)", (ident, now, fingerprint, json.dumps(lead)))
    if edit is not None:
        db.execute("INSERT INTO enquiry_submissions VALUES (?,?,?)", (ident, *edit))
    site_stats.change(db, "saved", lead["car"], site_stats.lead_source(lead), now / 1000)
    return ident


def update(db, ident, raw):
    state = string(raw.get("status"), 10)
    if state not in ("new", "replied", "booked") or type(raw.get("revision")) is not int:
        raise Problem()
    db.execute("BEGIN IMMEDIATE")
    cutoff = int(time.time() * 1000) - RETENTION_MS
    row = db.execute("SELECT record FROM enquiries WHERE id=? AND created>?", (ident, cutoff)).fetchone()
    if not row:
        raise Problem("missing", 404)
    lead = json.loads(row[0])
    if lead["revision"] != raw["revision"]:
        raise Problem("conflict", 409)
    if lead["status"] != state:
        lead.update(status=state, revision=lead["revision"] + 1)
        if state == "booked":
            lead["bookedAt"] = int(time.time() * 1000)
            site_stats.change(db, "bookings", lead["car"], site_stats.lead_source(lead), lead["bookedAt"] / 1000)
        else:
            previous = lead.pop("bookedAt", None)
            if previous:
                site_stats.change(db, "bookings", lead["car"], site_stats.lead_source(lead), previous / 1000, decrement=True)
        db.execute("UPDATE enquiries SET record=? WHERE id=?", (json.dumps(lead), ident))
    return lead
