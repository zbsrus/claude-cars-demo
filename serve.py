"""Serve Claude Cars behind a TLS reverse proxy using Waitress."""
import argparse
from email.message import Message
from http import HTTPStatus
import logging
import os
from pathlib import Path
import sqlite3
from threading import Event, Thread
from urllib.parse import quote

from waitress import serve

from preview import MIB, SiteRequest, clean_expired, settings_for


def application(settings):
    def handle(environ, start_response):
        headers = Message()
        for name, value in environ.items():
            if name.startswith("HTTP_"):
                headers[name[5:].replace("_", "-")] = value
        for name in ("CONTENT_TYPE", "CONTENT_LENGTH"):
            if environ.get(name):
                headers[name.replace("_", "-")] = environ[name]
        path = quote(environ.get("PATH_INFO", "/"), safe="/-._~")
        if environ.get("QUERY_STRING"):
            path += "?" + environ["QUERY_STRING"]
        request = SiteRequest(settings, environ["REQUEST_METHOD"], path, headers,
                              environ["wsgi.input"], environ.get("REMOTE_ADDR", ""))
        status, response_headers, body = request.route()
        start_response(f"{status} {HTTPStatus(status).phrase}", response_headers)
        return [body]
    return handle


def maintain(db_path, stopped):
    delay = 3600
    while not stopped.wait(delay):
        try:
            clean_expired(db_path)
            delay = 3600
        except sqlite3.OperationalError:
            logging.exception("Could not expire old records")
            delay = 60


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", required=True, type=Path)
    parser.add_argument("--port", type=int, default=8000)
    options = parser.parse_args()
    os.umask(0o077)
    settings = settings_for(options.data_dir.resolve(), production=True)
    stopped = Event()
    cleanup = Thread(target=maintain, args=(settings.db_path, stopped), daemon=True)
    cleanup.start()
    try:
        serve(application(settings), host="127.0.0.1", port=options.port,
              threads=4, connection_limit=100, channel_timeout=60,
              max_request_header_size=32768, max_request_body_size=64*MIB,
              expose_tracebacks=False)
    finally:
        stopped.set()
        cleanup.join()


if __name__ == "__main__":
    main()
