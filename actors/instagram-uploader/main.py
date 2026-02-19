#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

import json
import os
import time


def main() -> int:
    payload = json.loads(os.getenv("CLAW_INPUT", "{}"))
    asset = payload.get("assetPath", "unknown-asset")
    hashtags = payload.get("hashtags", "")
    dry_run = bool(payload.get("dryRun", True))

    print("[CLAW:INFO] Instagram uploader started")
    print(f"[CLAW:DEBUG] Asset: {asset}")
    if hashtags:
        print(f"[CLAW:DEBUG] Hashtags: {hashtags}")
    time.sleep(0.2)
    if dry_run:
        print("[CLAW:WARN] Dry-run enabled, upload skipped")
    else:
        print("[CLAW:INFO] Upload simulated")
    print("[CLAW:INFO] Instagram uploader done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
