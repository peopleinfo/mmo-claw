# Project Skill System

This file defines how AI agents in this repo create and use skills.

## Skill Folder Contract

Each skill lives in `skills/<skill-name>/` and must include:

- `skills/<skill-name>/SKILL.md`

Optional:

- `skills/<skill-name>/scripts/`
- `skills/<skill-name>/references/`
- `skills/<skill-name>/assets/`
- `skills/<skill-name>/agents/openai.yaml`

Skill names must be lowercase kebab-case.

## SKILL.md Minimum Format

```md
---
name: skill-name
description: What this skill does and when to use it.
---
```

The `description` line must include trigger context so agents can decide when to load it.

## Usage Rules

1. Use the smallest set of skills needed for the current task.
2. Read only the relevant reference files; avoid bulk loading.
3. Prefer scripts for deterministic repeatable work.
4. Keep `SKILL.md` focused on workflow and decision rules.
5. Move long details to `references/`.

## Skill Lifecycle

1. Create: `npx -y skills init skills/<name>`.
2. Implement: fill `SKILL.md` and add scripts/references/assets.
3. Validate: `npx -y skills list`, then verify each skill has valid `name` + `description` frontmatter.
4. Use on real tasks.
5. Iterate when gaps are found.

## Initial Backlog (From PRD)

Create these first as separate skills:

1. `monorepo-bootstrap`: Turborepo, apps/packages base layout.
2. `desktop-shell`: Electron + Vite + React shell with typed IPC.
3. `pocketpaw-fork-integration`: Run, wrap, and extend PocketPaw.
4. `uvx-runtime-manager`: Bundled `uv`/`uvx` lifecycle and marketplace actions.
5. `browser-provider-layer`: Camoufox, stealth providers, fingerprint + proxy flow.
6. `actor-kit`: Actor template, schema, runtime wrapper, and run logging.
7. `data-layer-sqlite`: SQLite schema and query layer.
8. `team-auth-casdoor`: Team roles with Casdoor SSO policy.
9. `release-packaging`: Build, signing, auto-update, and cross-platform packaging.

## Additional Skills (Added via npx skills)

1. `ipc-contracts`: Typed Electron main/renderer contract design and evolution.
2. `profile-proxy-crud`: Profile/proxy/account CRUD and assignment workflows.
3. `telegram-control-flow`: Telegram command, authorization, dedupe, and status messaging.
4. `scrum-kanban-mcp`: Scrum/BMAD MCP operations for board state, story flow, locks, sync, and artifact/context tools.

## Task Routing Priority

When multiple skills match:

1. Security and secrets handling skills first.
2. Build/runtime skills second.
3. Workflow state skills (for example `scrum-kanban-mcp`) third when the task changes planning/scrum truth.
4. Feature/domain skills fourth.
5. Packaging/release skills last.
