# AGENTS.md instructions for mmo-claw

<INSTRUCTIONS>
## Baseline
- Use `agent.md` as the operating contract.
- Use `project-prd.md` for product direction and scope.
- Use `SKILLS.md` for skill policy and lifecycle.
- Use `npx skills` as the canonical skill CLI.

## Architecture Non-Negotiables
- Modular-first always: organize by bounded domains/features, not by random file type sprawl.
- Keep strict boundaries: each module exposes a small public API; do not import module internals from outside.
- Enforce DRY: when logic repeats the second time, extract shared code into the right module/package.
- Avoid god files: split large files by responsibility; prefer focused units over mixed concerns.
- Keep dependency direction clean: UI -> application/services -> domain -> infrastructure/adapters.
- Prefer composition over duplication; prefer reusable helpers over copy-paste variants.
- Centralize cross-cutting concerns (logging, error mapping, config, auth guards, validation).
- Require typed contracts at boundaries (IPC, API, DB repositories, provider interfaces).
- For big-project maintainability, each feature must include: clear ownership, test points, and extension points.
- If a requested change would break modularity/DRY, refactor structure first, then implement behavior.

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
- team-auth-casdoor: Implement team role model with Casdoor SSO and role policies. Use for multi-user access control and permission boundaries. (file: `skills/team-auth-casdoor/SKILL.md`)
- release-packaging: Build signing, auto-update, and cross-platform packaging pipelines. Use for release readiness and distribution workflows. (file: `skills/release-packaging/SKILL.md`)
- ipc-contracts: Define and enforce typed IPC contracts between Electron main and renderer. Use when adding or changing cross-process APIs. (file: `skills/ipc-contracts/SKILL.md`)
- profile-proxy-crud: Implement profile, proxy, and account CRUD with assignment and validation flows. Use for profile management and proxy operations. (file: `skills/profile-proxy-crud/SKILL.md`)
- telegram-control-flow: Implement Telegram command routing, authorization, and run-status messaging for remote actor control. Use for Telegram-driven operations. (file: `skills/telegram-control-flow/SKILL.md`)

### How to use skills
- Trigger rules: Use a skill when the user names it (for example `$desktop-shell`) or the task clearly matches its description.
- Multiple matches: Use the minimal set that covers the task; if two skills overlap, prioritize by `SKILLS.md` task routing order.
- Progressive disclosure: Read `SKILL.md` first, then only open needed files under `references/`, `scripts/`, or `assets/`.
- Execution preference: Prefer running or editing scripts in `scripts/` over rewriting large repeated logic in chat.
- Validation: Run `npx -y skills list` after creating or updating skills, then ensure each active skill has `name` and `description` frontmatter.
- Missing/blocked: If a skill file is missing or incomplete, state the gap briefly and proceed with the best safe fallback.
- Context hygiene: Avoid bulk-loading every skill file; load only what is required by the active task.

## Quick commands
- List skills: `npx -y skills list`
- Initialize skill: `npx -y skills init skills/<name>`
- Find skills: `npx -y skills find <query>`
- Check updates: `npx -y skills check`
- Update skills: `npx -y skills update`
</INSTRUCTIONS>
