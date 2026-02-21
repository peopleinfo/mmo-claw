# Workflow (Kanban MCP)

This document defines the delivery workflow for this repository using scrum-kanban MCP.

## Required References

- [AGENTS.md](../AGENTS.md)
- [SKILLS.md](../SKILLS.md)

## Stage Order

Follow this exact order for all work:

`sprint -> epic -> story -> ready-for-dev -> in-progress -> review -> testing -> done -> verified`

## Ownership By Stage

- `sprint`: AI plans/updates with product direction.
- `epic`: AI groups stories by coherent domain outcome.
- `story`: AI defines implementable work units.
- `ready-for-dev`: AI queues stories with complete scope.
- `in-progress`: AI implementation.
- `review`: AI deep self-review, step by step.
- `testing`: AI runs full validation, including Playwright headless E2E.
- `done`: AI moves only after all checks pass.
- `verified`: Human reviewer sign-off only.

## Mandatory Story Definition

Every new story must include all of the following:

- Problem/context.
- Clear scope boundaries.
- Acceptance criteria (numbered checklist).
- Success metrics (measurable).
- Test plan (unit/integration/E2E expectations).
- Out-of-scope notes (optional but recommended).

If acceptance criteria or success metrics are missing, do not move the story to `ready-for-dev`.

## Review Gate (AI Deep Check)

Before moving `in-progress -> review`, AI must verify step by step:

1. Requirement coverage against story acceptance criteria.
2. Regression risk for touched modules.
3. Boundary integrity (module/API contracts).
4. Error handling and edge cases.
5. Test additions/updates for changed behavior.
6. Documentation updates where behavior changed.

## Testing Gate (Required)

Before moving `review -> testing`, AI must have a runnable test setup for the story scope.

Before moving `testing -> done`, AI must pass:

1. Targeted tests for changed modules.
2. Repo smoke/build/lint/test checks as appropriate.
3. Playwright E2E in headless mode (mandatory for flow/UI stories).

Default E2E expectation:

```bash
pnpm exec playwright test --headless
```

If Playwright is not yet configured for a required story, that setup work must be completed first, and the story remains in `testing` until E2E passes.

## Queue Discipline

- Do not start the next `ready-for-dev` story until the current story has completed `review -> testing` validation gates.
- Do not bypass `testing`.
- `done` is AI-complete, not human sign-off.
- `verified` is human approval after review/testing evidence is inspected.

## Kanban MCP Operating Notes

- Use story locks before edits/moves for active stories.
- Prefer targeted status moves and story updates over full-state replacement.
- Sync `.next-gen/scrum-state.json` after workflow-impacting updates.

## Definition Of Done vs Verified

- `done`: implemented, reviewed, tested (including required headless E2E), synced.
- `verified`: human confirms behavior and acceptance criteria are satisfied.
