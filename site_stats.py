"""Aggregate counts only. No visitor, request, URL or click-level rows."""
import json
import re
import time
from datetime import datetime
from urllib.parse import parse_qs, urlsplit
from zoneinfo import ZoneInfo

SOURCES = ("direct", "facebook", "whatsapp", "other")
PUBLIC_PAGE = re.compile(r"/(fr|nl|de|en|es)(?:/?|/(?:cars|about|contact|privacy)/?|/cars/([a-z0-9][a-z0-9-]{0,96})/?)\Z")


def initialize(db):
    db.executescript("""
        CREATE TABLE IF NOT EXISTS daily_activity (
            day TEXT NOT NULL, car TEXT NOT NULL,
            kind TEXT NOT NULL CHECK(kind IN ('visit','view','whatsapp','phone','saved','bookings')),
            source TEXT NOT NULL CHECK(source IN ('direct','facebook','whatsapp','other')),
            count INTEGER NOT NULL CHECK(count >= 0),
            PRIMARY KEY(day,car,kind,source)) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS stats_migrations (name TEXT PRIMARY KEY);
    """)
    # Convert the earlier aggregate table and private inbox once, including records
    # that will leave the private inbox on this startup. Do not manufacture past traffic.
    db.execute("BEGIN IMMEDIATE")
    if db.execute("SELECT 1 FROM stats_migrations WHERE name='initial-daily-activity'").fetchone():
        return
    db.execute("""INSERT INTO daily_activity(day,car,kind,source,count)
                  SELECT day,car,'view','other',count FROM vehicle_views""")
    for (record,) in db.execute("SELECT record FROM enquiries"):
        lead = json.loads(record)
        source = lead_source(lead)
        change(db, "saved", lead["car"], source, lead["time"] / 1000)
        if lead.get("bookedAt") and lead.get("status") == "booked":
            change(db, "bookings", lead["car"], source, lead["bookedAt"] / 1000)
    db.execute("INSERT INTO stats_migrations VALUES('initial-daily-activity')")


def lead_source(lead):
    return lead.get("origin", "whatsapp" if lead["type"] == "manual" else "other")


def change(db, kind, car, source, timestamp=None, decrement=False):
    now = time.time() if timestamp is None else timestamp
    day = datetime.fromtimestamp(now, ZoneInfo("Europe/Brussels")).date().isoformat()
    key = (day, car, kind, source)
    if decrement:
        db.execute("""UPDATE daily_activity SET count=count-1
                      WHERE day=? AND car=? AND kind=? AND source=? AND count>0""", key)
        return
    db.execute("""INSERT INTO daily_activity(day,car,kind,source,count) VALUES(?,?,?,?,1)
                  ON CONFLICT(day,car,kind,source) DO UPDATE SET count=count+1""", key)


def report(db):
    rows = db.execute("SELECT day,car,kind,source,count FROM daily_activity WHERE count>0 ORDER BY day,car")
    return [dict(day=day, car=car, kind=kind, source=source, count=count) for day, car, kind, source, count in rows]


def tag(query):
    params = parse_qs(query)
    values = params.get("src") or params.get("utm_source")
    if values:
        label = values[0].lower()
        return label if label in ("facebook", "whatsapp") else "other"


def referring_page(referer, origin):
    if not referer:
        return None, "direct"
    try:
        parts = urlsplit(referer)
        domain = parts.hostname or ""
    except ValueError:
        return None, "other"
    if (parts.scheme, parts.netloc) == (urlsplit(origin).scheme, urlsplit(origin).netloc):
        return parts, tag(parts.query) or "other"
    for channel, domains in (("facebook", ("facebook.com", "fb.com")), ("whatsapp", ("whatsapp.com", "wa.me"))):
        if any(domain == item or domain.endswith("." + item) for item in domains):
            return None, channel
    return None, "other"


def record_page(db, url, car, referer, origin):
    if "preview" in parse_qs(url.query, keep_blank_values=True):
        return
    previous, incoming = referring_page(referer, origin)
    source = tag(url.query) or incoming
    if previous is None:
        change(db, "visit", car, source)
    if car:
        before = PUBLIC_PAGE.fullmatch(previous.path) if previous else None
        after = PUBLIC_PAGE.fullmatch(url.path)
        language_switch = after and before and before[2] == car and before[1] != after[1]
        if not language_switch:
            change(db, "view", car, source)
