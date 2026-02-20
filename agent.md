# AI Operating Contract (Vibe Mode)

This repository is operated by AI agents first. Human work is prompt-level direction and review.

Primary product intent lives in `project-prd.md`.

## Mission

Build and ship the platform in `project-prd.md` through small, reversible, test-backed slices.

## Source Of Truth

Resolve conflicts in this order:

1. Latest user instruction in chat.
2. `project-prd.md`.
3. `agent.md`.
4. `SKILLS.md`.

## Execution Loop

For every task, run this loop:

1. Read only the relevant files.
2. State a short implementation plan.
3. Implement a vertical slice, not a broad unfinished scaffold.
4. Run checks (`lint`, `test`, `build`) for touched areas.
5. Self-review for regressions and missing edge cases.
6. Commit with a conventional message.
7. Report what changed, what was verified, and what remains.

## Default Engineering Rules

- Prefer deterministic scripts over manual repeated edits.
- Keep changes small enough to revert safely.
- Do not commit secrets, tokens, or private keys.
- Keep interfaces typed where possible.
- Add tests for behavior changes.
- Update docs when behavior, commands, or structure changes.

## Git Workflow

- Branch naming: `feat/<slice>`, `fix/<slice>`, `chore/<slice>`.
- Commit style: `type(scope): summary`.
- Never force-push shared branches.
- Rebase before push when branch is behind remote.

## Definition Of Done

A task is done only when all are true:

1. Code is implemented and locally validated.
2. Tests for changed behavior exist and pass.
3. Relevant docs are updated (`agent.md`, `SKILLS.md`, skill docs, or feature docs).
4. Changes are committed and pushed (unless user says otherwise).

## Autonomous Decision Policy

- If details are missing, choose the safest reasonable default and proceed.
- Stop only for decisions that materially affect architecture, security, or cost.
- When stopped, ask one concrete question with clear options.
