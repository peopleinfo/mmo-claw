#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

import json
import os
import time


def main() -> int:
    raw = os.getenv("CLAW_INPUT", "{}")
    payload = json.loads(raw)
    print("[CLAW:INFO] Template actor booted")
    print(f"[CLAW:DEBUG] Input payload: {json.dumps(payload)}")
    time.sleep(0.1)
    print("[CLAW:INFO] Template actor finished")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
