# scrum-kanban tool routing

## Core Scrum state
- `scrum_get_state`: Read full current store state. Use once at task start, then reuse cached ids; call again only when full resync is needed.
- `scrum_set_state`: Replace full store state (use only when full replacement is requested).
- `scrum_sync2project`: Write store state to project JSON.
- `scrum_sync2store`: Load project JSON into store state.

## Boards and lists
- `scrum_create_board`, `scrum_delete_board`
- `scrum_add_list`, `scrum_rename_list`, `scrum_delete_list`

## Stories and status flow
- `scrum_add_card`, `scrum_update_card`, `scrum_delete_card`
- `scrum_move_card`: Move or reorder a story across lists.
- `scrum_complete_story`: Fast-path move to done.
- `scrum_get_stories_by_status`: Query by BMAD status.
- `scrum_get_story_by_id`: Resolve story by key or UUID.
- `scrum_get_next_story`: Pull next work item from ready-for-dev.

## Locking
- `scrum_acquire_lock`: Claim a story lock before editing.
- `scrum_release_lock`: Release lock after work.

## Epics and sprints
- `scrum_create_epic`, `scrum_update_epic`
- `scrum_create_sprint`, `scrum_update_sprint`, `scrum_delete_sprint`

## BMAD helpers
- `bmad_install`, `bmad_status`, `bmad_phase_guide`
- `bmad_brainstorm_project`, `bmad_research`, `bmad_product_brief`
- `bmad_prd`, `bmad_architecture`, `bmad_create_epics_and_stories`
- `generate_prd`, `update_prd`, `add_prd_features`

## Project context files
- `context_list_files`: Enumerate known BMAD context files in repo.
- `context_read`: Read a context file.
- `context_write`: Write a context file.
