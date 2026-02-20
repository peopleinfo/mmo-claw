---
name: desktop-shell
description: Build Electron + Vite + React desktop shell with typed IPC bridge. Use for desktop foundation and shell features.
---

# desktop-shell

## Inputs
- Desktop routes and pages to expose.
- Required native integrations (tray, auto-launch, notifications).

## Workflow
1. Establish Electron process split: main, preload, renderer.
2. Set up Vite-based renderer and wire Electron dev/start scripts.
3. Expose only typed preload APIs; block direct Node access in renderer.
4. Add shell capabilities required by the PRD: tray behavior, startup mode, and window lifecycle rules.
5. Add navigation shell pages and route placeholders for Dashboard, Profiles, Proxies, Accounts, Marketplace, Schedule, Runs, Team, and Settings.
6. Route all desktop-to-core actions through typed IPC contracts from `packages/ipc`.
7. Add startup health checks for dependencies (PocketPaw daemon, DB readiness, runtime manager).

## Validation
- Run desktop app in dev mode and confirm renderer loads.
- Verify IPC call success path and error path.
- Verify tray actions and window restore behavior.

## Done Criteria
- Secure preload boundary with no untyped channel usage.
- Desktop shell can host both local pages and PocketPaw UI surface.
- Startup and shutdown flows are deterministic.
