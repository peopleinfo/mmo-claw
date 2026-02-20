---
name: uvx-runtime-manager
description: Manage bundled uv and uvx runtime install/update/uninstall flows. Use for Python toolchain lifecycle and actor marketplace operations.
---

# uvx-runtime-manager

## Inputs
- Platform targets and bundled  artifact locations.
- Runtime packages to support in marketplace.

## Workflow
1. Resolve bundled  binary path per platform at runtime.
2. Build a runtime manager API for install, update, uninstall, and list operations.
3. Persist installed-tool state (version, install path, health status, last action).
4. Stream install progress and errors back to renderer via typed IPC events.
5. Enforce per-tool isolation so broken package installs do not affect other tools.
6. Add health probes for  and package executable checks.
7. Expose marketplace-friendly actions with idempotent behavior.

## Validation
- Verify  detection on current OS.
- Run one install and uninstall cycle.
- Verify failed install yields actionable error details.

## Done Criteria
- Runtime actions are deterministic and observable.
- Marketplace can manage Python-side dependencies without manual shell steps.
- No dependency on system-level Python setup.
