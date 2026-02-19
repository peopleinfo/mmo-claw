#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
PocketPaw bridge placeholder.
This keeps an executable contract so uv can launch the sidecar.
"""

from __future__ import annotations

import json
import os
import time
import urllib.request


def fetch_status(gateway_url: str) -> None:
    req = urllib.request.Request(f"{gateway_url}/status", method="GET")
    with urllib.request.urlopen(req, timeout=5) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
        print("[POCKETPAW] status", json.dumps(payload))


def main() -> int:
    gateway_url = os.getenv("MMO_CLAW_GATEWAY_URL", "http://127.0.0.1:3717")
    print("[POCKETPAW] bridge started")
    while True:
        try:
            fetch_status(gateway_url)
        except Exception as exc:  # pragma: no cover
            print("[POCKETPAW] bridge error", str(exc))
        time.sleep(15)


if __name__ == "__main__":
    raise SystemExit(main())
