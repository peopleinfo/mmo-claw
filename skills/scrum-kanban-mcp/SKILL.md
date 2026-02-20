---
name: scrum-kanban-mcp
description: Operate the scrum-kanban MCP server for Scrum/BMAD board state, stories, epics, sprints, and BMAD context artifacts. Use when work needs board updates, story status moves, lock-safe edits, scrum-state sync, or BMAD document/context generation through MCP tools.
---

# scrum-kanban-mcp

## Inputs
- Requested board/story/epic/sprint outcome.
- Target workspace path (`cwd`) when syncing state or writing BMAD artifacts.
- Story identity as key (`next-dev:12`) or UUID when available.

## Workflow
1. Confirm `scrum-kanban` MCP server is enabled before work.
2. Read state with `scrum_get_state` once at task start, cache ids in working memory, and reuse them across steps.
3. Resolve board/list/card ids from cached state first; refresh state only when ids are missing, stale, or conflicting.
4. Use targeted mutation tools (`scrum_add_card`, `scrum_move_card`, `scrum_update_card`, `scrum_complete_story`) instead of rewriting full state unless full replacement is requested.
5. Acquire lock with `scrum_acquire_lock` before editing an active story and release with `scrum_release_lock` after completion or rollback.
6. Prefer status-aware flows for BMAD boards (`backlog`, `ready-for-dev`, `in-progress`, `review`, `done`).
7. Use `scrum_sync2project` or `scrum_sync2store` for filesystem synchronization when `.next-gen/scrum-state.json` must mirror MCP store state.
8. For planning artifacts, use BMAD/context tools (`bmad_*`, `generate_prd`, `update_prd`, `add_prd_features`, `context_*`) instead of manual boilerplate edits.
9. Verify changes with targeted reads (`scrum_get_story_by_id`, `scrum_get_stories_by_status`) and call `scrum_get_state` only when a full snapshot is necessary.

## Tool Routing
- Read `references/tool-routing.md` for grouped tools and task-to-tool selection.

## Validation
- Confirm requested entities exist after operation (board/list/card/epic/sprint).
- Confirm story status transition is reflected in target list.
- Confirm sync actions report `success=true` and expected output path.
- Confirm BMAD/context file operations write to the requested project path.
- Prefer minimal verification calls; avoid repeated full-state pulls in the same task unless state drift is suspected.

## Done Criteria
- Requested Scrum/BMAD changes are applied and verifiable in MCP state.
- Locks are released after edits.
- Project state/doc files are synced when requested.
