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
    caption = payload.get("caption", "")
    dry_run = bool(payload.get("dryRun", True))

    print("[CLAW:INFO] TikTok poster started")
    print(f"[CLAW:DEBUG] Asset: {asset}")
    if caption:
        print(f"[CLAW:DEBUG] Caption length: {len(str(caption))}")
    time.sleep(0.2)
    if dry_run:
        print("[CLAW:WARN] Dry-run enabled, upload skipped")
    else:
        print("[CLAW:INFO] Upload simulated")
    print("[CLAW:INFO] TikTok poster done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
