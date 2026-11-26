"""Durable inventory and owner-only drafts for Claude Cars."""
import contextlib
from decimal import Decimal
import io
import hashlib
import json
import re
import secrets
import sqlite3
import unicodedata
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent
LANGS = ("fr", "nl", "de", "en", "es")
FIELDS = ("intro", "history", "condition", "equipment", "documents", "opinion")
STATUSES = {"draft", "available", "soon", "reserved", "sold"}
CHANNELS = {"whatsapp", "facebook"}
SEED_PHOTOS = {f"/assets/z4/{i}.webp" for i in range(1, 4)}
UPLOAD_PATH = re.compile(r"/media/([a-f0-9]{32})\.(webp|mp4|webm)\Z")


class Problem(Exception):
    def __init__(self, code="invalid", status=400):
        super().__init__(code)
        self.code = code
        self.status = status


def db_connect(path):
    db = sqlite3.connect(path, timeout=15)
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA secure_delete=ON")
    return db


@contextlib.contextmanager
def connection(path):
    with contextlib.closing(db_connect(path)) as db, db:
        yield db


def initial_draft(seed):
    car = {key: seed[key] for key in ("id", "make", "model", "cover", "photos")}
    car.update(revision=1, status="draft", year=None, km=None, price=None, video="", carpass="",
               translations={}, approved=dict.fromkeys(LANGS, False))
    return car


def init(path, *, draft_seed=False, demo=False):
    with connection(path) as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.executescript("""
            CREATE TABLE IF NOT EXISTS cars (
                id TEXT PRIMARY KEY, version INTEGER NOT NULL, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS media (
                path TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL);
            CREATE TABLE IF NOT EXISTS assets (
                car_id TEXT NOT NULL REFERENCES cars(id), path TEXT NOT NULL REFERENCES media(path),
                PRIMARY KEY(car_id,path));
            CREATE INDEX IF NOT EXISTS media_ref ON assets(path);
            CREATE TABLE IF NOT EXISTS creation_requests (
                request_id TEXT PRIMARY KEY, car_id TEXT NOT NULL REFERENCES cars(id), fingerprint TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS shares (
                car_id TEXT NOT NULL REFERENCES cars(id), channel TEXT NOT NULL, lang TEXT NOT NULL,
                text TEXT NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY(car_id,channel,lang));
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL, owner_key TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS login_attempts (
                address TEXT PRIMARY KEY, since INTEGER NOT NULL, attempts INTEGER NOT NULL);
        """)
        seed = json.loads((ROOT / "content/z4.json").read_text())
        if draft_seed:
            seed = initial_draft(seed)
        if demo:
            from demo_inventory import seed_examples
            seed_examples(db)
        db.execute("INSERT OR IGNORE INTO cars VALUES(?,1,?)", (seed["id"], json.dumps(seed)))


def listing(db, ident):
    row = db.execute("SELECT data FROM cars WHERE id=?", (ident,)).fetchone()
    if row is None:
        raise Problem("missing", 404)
    return json.loads(row[0])


def public(car):
    if car["status"] == "draft":
        raise Problem("missing", 404)
    result = dict(car)
    if car["status"] == "sold":
        result["price"] = None
    result["translations"] = {lang: value for lang, value in car["translations"].items()
                              if lang == "fr" or car.get("approved", {}).get(lang)}
    result.pop("approved", None)
    return result


def listings(db, owner=False):
    result = []
    for (raw,) in db.execute("SELECT data FROM cars ORDER BY rowid DESC"):
        car = json.loads(raw)
        if owner or car["status"] != "draft":
            result.append(car if owner else public(car))
    return result


def string(value, limit=10000):
    if not isinstance(value, str) or len(value) > limit or re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff]", value):
        raise Problem()
    return value.strip()


def number(value, low, high, cents=False):
    if value is None or value == "":
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not low <= value <= high:
        raise Problem()
    if int(value) == value:
        return int(value)
    if cents and Decimal(str(value)).as_tuple().exponent >= -2:
        return value
    raise Problem()


def normalized(db, raw):
    obj = {"make": string(raw.get("make", ""), 100), "model": string(raw.get("model", ""), 160)}
    obj["status"] = string(raw.get("status", ""), 20)
    if not obj["make"] or not obj["model"] or obj["status"] not in STATUSES:
        raise Problem()
    if obj["status"] == "draft":
        draft_status = raw.get("draftStatus", "available")
        if draft_status not in ("available", "soon", "reserved", "sold"):
            raise Problem()
        if "draftStatus" in raw:
            obj["draftStatus"] = draft_status
        if raw.get("archived") is True:
            obj["archived"] = True
    obj["year"] = number(raw.get("year"), 1886, 2100)
    obj["km"] = number(raw.get("km"), 0, 9999999)
    obj["price"] = number(raw.get("price"), 0, 999999999, cents=True)
    if obj["status"] == "available" and not obj["price"]:
        raise Problem("price_required")
    obj["cover"] = string(raw.get("cover", ""), 200)
    obj["video"] = string(raw.get("video", ""), 200)
    photos = raw.get("photos", [])
    if not isinstance(photos, list) or len(photos) > 40:
        raise Problem()
    obj["photos"] = list(dict.fromkeys(string(v, 200) for v in photos))
    if not obj["cover"] and obj["photos"]:
        obj["cover"] = obj["photos"][0]
    if obj["cover"] and obj["cover"] not in obj["photos"]:
        raise Problem()
    if obj["status"] != "draft" and (obj["year"] is None or obj["km"] is None or not obj["cover"]):
        raise Problem()
    for url in obj["photos"] + ([obj["video"]] if obj["video"] else []):
        is_video = url == obj["video"]
        if url in SEED_PHOTOS and not is_video:
            continue
        match = UPLOAD_PATH.fullmatch(url)
        if not match or (match[2] != "webp") != is_video:
            raise Problem("media")
        if not db.execute("SELECT 1 FROM media WHERE path=?", (url,)).fetchone():
            raise Problem("media")
    obj["carpass"] = string(raw.get("carpass", ""), 1200)
    if obj["carpass"]:
        try:
            u = urlsplit(obj["carpass"])
            valid = u.scheme == "https" and u.hostname and not u.username and not u.password
        except ValueError:
            valid = False
        if not valid:
            raise Problem()
    texts, approved = raw.get("translations", {}), raw.get("approved", {})
    if not isinstance(texts, dict) or not isinstance(approved, dict):
        raise Problem()
    obj["translations"], obj["approved"] = {}, {}
    for lang in LANGS:
        section = texts.get(lang, {})
        if not isinstance(section, dict):
            raise Problem()
        obj["translations"][lang] = {k: string(section.get(k, "")) for k in FIELDS}
        obj["approved"][lang] = lang == "fr" or approved.get(lang) is True
    return obj


def save_car(db, raw, ident=None):
    db.execute("BEGIN IMMEDIATE")
    car = normalized(db, raw)
    request_id = raw.get("requestId") if not ident else None
    if request_id is not None:
        if not isinstance(request_id, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{12,100}", request_id):
            raise Problem()
        fingerprint = hashlib.sha256(json.dumps(car, sort_keys=True).encode()).hexdigest()
        earlier = db.execute("SELECT car_id,fingerprint FROM creation_requests WHERE request_id=?",
                             (request_id,)).fetchone()
        if earlier:
            if fingerprint != earlier[1]:
                raise Problem("conflict", 409)
            return listing(db, earlier[0])
    if ident:
        current = listing(db, ident)
        if raw.get("revision") != current["revision"]:
            raise Problem("conflict", 409)
        car.update(id=ident, revision=current["revision"] + 1)
        db.execute("UPDATE cars SET version=?,data=? WHERE id=?", (car["revision"], json.dumps(car), ident))
        db.execute("DELETE FROM assets WHERE car_id=?", (ident,))
    else:
        base = unicodedata.normalize("NFKD", car["make"] + "-" + car["model"]).encode("ascii", "ignore").decode()
        ident = (re.sub("[^a-z0-9]+", "-", base.lower()).strip("-")[:64] or "car") + "-" + secrets.token_hex(5)
        car.update(id=ident, revision=1)
        db.execute("INSERT INTO cars VALUES(?,1,?)", (ident, json.dumps(car)))
        if request_id:
            db.execute("INSERT INTO creation_requests VALUES(?,?,?)", (request_id, ident, fingerprint))
    for path in set(car["photos"] + [car["video"]]):
        if UPLOAD_PATH.fullmatch(path):
            db.execute("INSERT INTO assets VALUES(?,?)", (ident, path))
    return car


def store_media(db, data, mime):
    if mime.startswith("image/"):
        try:
            with Image.open(io.BytesIO(data)) as source:
                if source.format not in ("JPEG", "WEBP", "PNG") or source.width * source.height > 60000000:
                    raise Problem("media", 415)
                img = ImageOps.exif_transpose(source)
                img.thumbnail((2400, 2400))
                output = io.BytesIO()
                img.convert("RGB").save(output, "WEBP", quality=87)
                data = output.getvalue()
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            raise Problem("media", 415)
        suffix, mime = "webp", "image/webp"
    elif mime == "video/mp4" and data[4:8] == b"ftyp":
        suffix = "mp4"
    elif mime == "video/webm" and data.startswith(b"\x1aE\xdf\xa3"):
        suffix = "webm"
    else:
        raise Problem("media", 415)
    path = f"/media/{secrets.token_hex(16)}.{suffix}"
    db.execute("INSERT INTO media VALUES(?,?,?)", (path, mime, data))
    return path
