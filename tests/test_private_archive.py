"""A private archive entry keeps its dossier and can be published at the same address."""
import tempfile
import unittest
from pathlib import Path

import catalogue


class PrivateArchive(unittest.TestCase):
    def test_archive_restore_and_legacy_request_retry(self):
        with tempfile.TemporaryDirectory() as folder:
            database = Path(folder) / "inventory.db"
            catalogue.init(database, draft_seed=True)
            with catalogue.connection(database) as db:
                draft = {"requestId": "original-draft-request", "make": "BMW", "model": "Z3", "status": "draft"}
                created = catalogue.save_car(db, draft)
                db.commit()
                retry = catalogue.save_car(db, {**draft, "archived": False})
                self.assertEqual(retry, created)
                self.assertNotIn("archived", retry)
                db.commit()
                private = catalogue.save_car(db, {**created, "archived": True, "draftStatus": "reserved"}, created["id"])
                db.commit()
                self.assertTrue(private["archived"])
                self.assertEqual(catalogue.listings(db), [])
                with self.assertRaises(catalogue.Problem) as missing:
                    catalogue.public(catalogue.listing(db, created["id"]))
                self.assertEqual(missing.exception.status, 404)
                with self.assertRaises(catalogue.Problem):
                    catalogue.save_car(db, {**private, "status": "available"}, created["id"])
                db.rollback()
                cover = "/assets/z4/1.webp"
                ready = {**private, "year": 1999, "km": 90000, "price": 14000, "photos": [cover], "cover": cover, "status": "available"}
                published = catalogue.save_car(db, ready, created["id"])
                self.assertEqual(published["id"], private["id"])
                self.assertNotIn("archived", published)
                self.assertNotIn("draftStatus", published)
                self.assertEqual([car["id"] for car in catalogue.listings(db)], [private["id"]])
