# MMO Claw

Monorepo foundation for the AI-driven creator and MMO automation desktop platform.

## Workspace Commands

- `pnpm install`
- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm smoke`

## Workspace Layout

- `apps/desktop`: Electron + Vite + React shell (UI components bundled in `src/ui/`).
- `apps/pocketpaw`: PocketPaw runtime supervisor wrapper.
- `packages/ipc`: Typed IPC contracts.
- `packages/db`: SQLite schema and repository contracts.
- `packages/proxy`: Proxy models and validators.
- `packages/browser`: Browser provider abstraction.
- `packages/actors`: Actor registry and starter actor modules.
- `packages/uvx-manager`: Bundled uv/uvx runtime manager.
