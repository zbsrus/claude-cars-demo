"""Create a private, consistent snapshot of a Claude Cars data directory."""
import argparse
import os
from pathlib import Path
import shutil
import sqlite3
from tempfile import TemporaryDirectory


def snapshot(source, destination):
    source = source.resolve()
    destination = destination.resolve()
    if destination == source or destination.is_relative_to(source):
        raise ValueError("Choose a destination outside the live data directory.")
    if destination.exists():
        raise FileExistsError(destination)
    database = source / "catalogue.sqlite3"
    if not database.is_file() or not (source / "session-key").is_file():
        raise ValueError("The source is not an initialized Claude Cars data directory.")
    with TemporaryDirectory(dir=destination.parent) as staging:
        target = Path(staging) / "snapshot"
        target.mkdir(mode=0o700)
        live = sqlite3.connect(database.as_uri() + "?mode=ro", uri=True)
        copy = sqlite3.connect(target / database.name)
        try:
            live.backup(copy, pages=256)
            if copy.execute("PRAGMA integrity_check").fetchone() != ("ok",):
                raise ValueError("Database verification failed.")
        finally:
            copy.close()
            live.close()
        for name in ("session-key", "owner-password"):
            if (source / name).is_file():
                shutil.copyfile(source / name, target / name)
        target.rename(destination)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    snapshot(args.source, args.destination)
