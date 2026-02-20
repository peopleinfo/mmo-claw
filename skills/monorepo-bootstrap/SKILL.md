---
name: monorepo-bootstrap
description: Bootstrap Turborepo apps/packages structure and base tooling. Use for initial repository setup and workspace wiring.
---

# monorepo-bootstrap

## Inputs
- Target package manager (`pnpm` default).
- Initial app/package list from `docs/project-prd.md`.

## Workflow
1. Create root workspace files (`package.json`, `turbo.json`, workspace config) and deterministic scripts for `dev`, `build`, `lint`, and `test`.
2. Create baseline structure: `apps/desktop`, `apps/pocketpaw`, `packages/ui`, `packages/ipc`, `packages/db`, `packages/actors`, `packages/browser`, `packages/proxy`, and `packages/uvx-manager`.
3. Add shared TypeScript config and lint config, then inherit from every package to avoid config drift.
4. Wire local package dependencies through workspace references instead of relative path imports.
5. Add root task graph rules so package builds run in dependency order and cache correctly.
6. Add a smoke command that verifies workspace install and one full build pass.

## Validation
- Run install using the chosen package manager.
- Run `build` at root.
- Run `lint` at root.
- Confirm every workspace is discovered by the task runner.

## Done Criteria
- Clean workspace bootstrap with reproducible install.
- Root commands run without manual per-package steps.
- New package can be added by copying an existing package template.
