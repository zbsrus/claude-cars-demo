"""Fresh release, sample inventory, and backup must preserve their distinct data."""
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import catalogue
from backup import snapshot
from preview import settings_for


class ReleaseModes(unittest.TestCase):
    def test_fresh_production_and_restore(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {"CLAUDE_PUBLIC_ORIGIN": "https://local.example"}):
            live = Path(tmp) / "live"
            db = settings_for(live, production=True).db_path
            with catalogue.connection(db) as connection:
                self.assertEqual(catalogue.listings(connection), [])
                draft, = catalogue.listings(connection, owner=True)
                self.assertEqual(draft["status"], "draft")
                self.assertTrue(all(draft[key] is None for key in ("year", "km", "price")))
                self.assertEqual(draft["translations"], {})
                self.assertEqual(len(draft["photos"]), 3)
                draft.update(status="available", year=1995, km=100)
                with self.assertRaisesRegex(catalogue.Problem, "price_required"):
                    catalogue.normalized(connection, draft)
            restored = Path(tmp) / "snapshot"
            snapshot(live, restored)
            database = settings_for(restored, production=True).db_path
            with catalogue.connection(database) as connection:
                self.assertEqual(connection.execute("PRAGMA integrity_check").fetchone(), ("ok",))
                self.assertEqual(len(catalogue.listings(connection, owner=True)), 1)
            self.assertEqual((live / "session-key").read_bytes(), (restored / "session-key").read_bytes())

    def test_samples_persist_only_in_explicit_demo(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {"CLAUDE_PUBLIC_ORIGIN": ""}):
            demo = Path(tmp) / "demo"
            for _ in range(2):
                db = settings_for(demo, demo=True).db_path
                with catalogue.connection(db) as connection:
                    cars = catalogue.listings(connection)
                    samples = [car for car in cars if car["id"].startswith("collection-")]
                    self.assertEqual((len(cars), len(samples)), (6, 5))
                    self.assertTrue(all(car["cover"] for car in samples))
            with self.assertRaises(SystemExit):
                settings_for(demo)
            with patch.dict(os.environ, {"CLAUDE_PUBLIC_ORIGIN": "https://local.example"}):
                with self.assertRaises(SystemExit):
                    settings_for(demo, production=True)
            private = Path(tmp) / "private"
            settings_for(private)
            with self.assertRaises(SystemExit):
                settings_for(private, demo=True)


if __name__ == "__main__":
    unittest.main()
