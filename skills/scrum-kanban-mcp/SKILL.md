---
name: scrum-kanban-mcp
description: Operate the scrum-kanban MCP server for Scrum/BMAD board state, stories, epics, sprints, and BMAD context artifacts. Use when work needs board updates, story status moves, lock-safe edits, scrum-state sync, or BMAD document/context generation through MCP tools.
---

# scrum-kanban-mcp

## Inputs
- Requested board/story/epic/sprint outcome.
- Target workspace path (`cwd`) when syncing state or writing BMAD artifacts.
- Story identity as key (`next-dev:12`) or UUID when available.
- Workflow policy in `docs/workflow.md`.

## Workflow
1. Confirm `scrum-kanban` MCP server is enabled before work.
2. Follow stage order from `docs/workflow.md`: `sprint -> epic -> story -> ready-for-dev -> in-progress -> review -> testing -> done -> verified`.
3. Read state with `scrum_get_state` once at task start, cache ids in working memory, and reuse them across steps.
4. Resolve board/list/card ids from cached state first; refresh state only when ids are missing, stale, or conflicting.
5. Ensure board has workflow lists for `Review`, `Testing`, `Done`, and `Verified` in addition to BMAD defaults; create missing lists with `scrum_add_list`.
6. Before moving a story to `ready-for-dev`, ensure description includes acceptance criteria and success metrics. If missing, update the story first with `scrum_update_card`.
7. Acquire lock with `scrum_acquire_lock` before editing an active story and release with `scrum_release_lock` after completion or rollback.
8. Use targeted mutation tools (`scrum_add_card`, `scrum_move_card`, `scrum_update_card`) instead of rewriting full state unless full replacement is requested.
9. Do not pull/start the next `ready-for-dev` story until the current story passes `testing` gate.
10. At `review`, perform deep step-by-step check against acceptance criteria, regression risk, and boundary contracts.
11. At `testing`, require passing test evidence, including Playwright headless E2E (`pnpm exec playwright test --headless`) before moving to `done`.
12. Only move stories to `done` after testing evidence is present; treat `verified` as human sign-off (AI should not move to `verified` unless explicitly instructed by human reviewer).
13. Use `scrum_sync2project` or `scrum_sync2store` for filesystem synchronization when `.next-gen/scrum-state.json` must mirror MCP store state.
14. For planning artifacts, use BMAD/context tools (`bmad_*`, `generate_prd`, `update_prd`, `add_prd_features`, `context_*`) instead of manual boilerplate edits.
15. Verify changes with targeted reads (`scrum_get_story_by_id`, `scrum_get_stories_by_status`) and call `scrum_get_state` only when a full snapshot is necessary.

## Tool Routing
- Read `references/tool-routing.md` for grouped tools and task-to-tool selection.

## Validation
- Confirm requested entities exist after operation (board/list/card/epic/sprint).
- Confirm story status transition is reflected in target list.
- Confirm story includes acceptance criteria and success metrics before `ready-for-dev`.
- Confirm testing evidence includes headless Playwright E2E before `done`.
- Confirm `verified` transition is performed by human reviewer decision.
- Confirm sync actions report `success=true` and expected output path.
- Confirm BMAD/context file operations write to the requested project path.
- Prefer minimal verification calls; avoid repeated full-state pulls in the same task unless state drift is suspected.

## Done Criteria
- Requested Scrum/BMAD changes are applied and verifiable in MCP state.
- Locks are released after edits.
- Project state/doc files are synced when requested.
