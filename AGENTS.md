# AGENTS.md instructions for mmo-claw

<INSTRUCTIONS>
## Baseline
- Use `agent.md` as the operating contract.
- Use `project-prd.md` for product direction and scope.
- Use `SKILLS.md` for skill policy and lifecycle.
- Use `skill.sh` for create/list/validate actions.

## Skills
A skill is a local instruction package in `skills/<skill-name>/SKILL.md`.

### Available skills
- monorepo-bootstrap: Bootstrap Turborepo apps/packages structure and base tooling. Use for initial repository setup and workspace wiring. (file: `skills/monorepo-bootstrap/SKILL.md`)
- desktop-shell: Build Electron + Vite + React desktop shell with typed IPC bridge. Use for desktop foundation and shell features. (file: `skills/desktop-shell/SKILL.md`)
- pocketpaw-fork-integration: Integrate and extend PocketPaw fork runtime and API bridge. Use when wiring agent brain, daemon lifecycle, and web embedding. (file: `skills/pocketpaw-fork-integration/SKILL.md`)
- uvx-runtime-manager: Manage bundled uv and uvx runtime install/update/uninstall flows. Use for Python toolchain lifecycle and actor marketplace operations. (file: `skills/uvx-runtime-manager/SKILL.md`)
- browser-provider-layer: Implement browser provider abstraction with Camoufox and stealth engines, fingerprinting, and proxy assignment. Use for anti-detect runtime concerns. (file: `skills/browser-provider-layer/SKILL.md`)
- actor-kit: Scaffold and implement actor modules with input schema, runtime wrapper, and logging contracts. Use for new automation actors. (file: `skills/actor-kit/SKILL.md`)
- data-layer-sqlite: Design and implement local-first SQLite schema, queries, and migrations. Use for persistence and repository data contracts. (file: `skills/data-layer-sqlite/SKILL.md`)
- team-auth-jwt: Implement team role model and JWT auth middleware and policies. Use for multi-user access control and permission boundaries. (file: `skills/team-auth-jwt/SKILL.md`)
- release-packaging: Build signing, auto-update, and cross-platform packaging pipelines. Use for release readiness and distribution workflows. (file: `skills/release-packaging/SKILL.md`)

### How to use skills
- Trigger rules: Use a skill when the user names it (for example `$desktop-shell`) or the task clearly matches its description.
- Multiple matches: Use the minimal set that covers the task; if two skills overlap, prioritize by `SKILLS.md` task routing order.
- Progressive disclosure: Read `SKILL.md` first, then only open needed files under `references/`, `scripts/`, or `assets/`.
- Execution preference: Prefer running or editing scripts in `scripts/` over rewriting large repeated logic in chat.
- Validation: Run `bash ./skill.sh validate` after creating or updating skills.
- Missing/blocked: If a skill file is missing or incomplete, state the gap briefly and proceed with the best safe fallback.
- Context hygiene: Avoid bulk-loading every skill file; load only what is required by the active task.

## Quick commands
- List skills: `bash ./skill.sh list`
- Validate skills: `bash ./skill.sh validate`
- Create skill: `bash ./skill.sh create <name> --desc "<description>"`
</INSTRUCTIONS>
