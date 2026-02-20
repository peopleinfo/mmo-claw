---
name: pocketpaw-fork-integration
description: Integrate and extend PocketPaw fork runtime and API bridge. Use when wiring agent brain, daemon lifecycle, and web embedding.
---

# pocketpaw-fork-integration

## Inputs
- Fork location or pinned revision.
- Required extension points from the product roadmap.

## Workflow
1. Pin a known-good PocketPaw fork revision and record it in project docs.
2. Implement runtime supervisor to start, health-check, and stop PocketPaw cleanly.
3. Add a bridge layer for REST and WebSocket communication used by desktop UI.
4. Inject runtime context into skill runs (team/profile/proxy/run metadata).
5. Keep fork edits minimal and isolated to small patch surfaces so upstream sync stays feasible.
6. Add retry and timeout handling around daemon calls to avoid UI deadlocks.
7. Capture structured logs for command input, actor start/end, and error outcomes.

## Validation
- Confirm daemon health endpoint reports ready.
- Confirm chat/command path can trigger one actor run.
- Confirm clean shutdown does not leave orphan processes.

## Done Criteria
- Desktop can control PocketPaw lifecycle reliably.
- Extension points exist without tightly coupling to PocketPaw internals.
- Upgrade path remains practical.
