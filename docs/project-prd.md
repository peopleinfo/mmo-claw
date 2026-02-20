# 🕹️ Project Draft v2 — AI-Driven Content Creator & MMO Automation Platform

> **One-liner:** Self-hosted desktop app where content creators and MMO players run AI-driven browser actors, controllable 24/7 via Telegram, with anti-detect browsers, team profiles, and proxy management. Open source alternative to AdsPower + openclaw + Apify — combined, not rebuilt.

---

## 🎯 Core Vision

```
Content creators run AI-driven browser actors
controllable 24/7 via Telegram
with anti-detect browser, team profiles & proxy management
Python tools installable built-in — no technical setup required
```

---

## 📚 Companion Docs

- `docs/project-tech-stack.md` — technology choices, licenses, and stack rationale.
- `docs/project-architecture.md` — monorepo structure, layered architecture, UI pages, and runtime/user flows.

---

## 🗓️ Build Phases

### Phase 0 — Monorepo Setup
- Turborepo init
- `apps/desktop` — Electron + Vite + React + shadcn + Zustand scaffold
- `apps/pocketpaw` — fork and run locally
- `packages/ipc`, `packages/db`, `packages/ui` scaffolded
- Basic Electron window loads PocketPaw at :8888

### Phase 1 — uvx Manager + Python Bundling
- Bundle `uv` binary for all platforms in `resources/bin/`
- `packages/uvx-manager` — install/run/uninstall via bundled uv
- Install Camoufox via uvx-manager
- Install PocketPaw fork via uvx-manager
- Marketplace UI skeleton

### Phase 2 — First Actor (Instagram Poster)
- `packages/browser` — BrowserProvider abstraction
- Camoufox provider wired
- `packages/actors/instagram-poster` — Crawlee actor
- PocketPaw skill wrapper
- Full flow: Telegram → PocketPaw → skill → actor → Camoufox → post

### Phase 3 — Profile + Proxy + Account CRUD
- SQLite schema finalized
- Profile Manager UI
- Proxy Manager UI
- Account Manager UI
- Profile → Proxy → Browser context wiring

### Phase 4 — Anti-Detect Full Stack
- playwright-extra + stealth provider
- fingerprint-suite integrated into BrowserPool
- proxy-chain per-profile routing
- Provider selection per actor

### Phase 5 — Team + Auth
- Casdoor SSO auth on PocketPaw fork REST API
- Team Manager UI
- Role-based access (admin/editor/viewer)
- Multi-user SQLite (per-team data isolation)

### Phase 6 — More Actors
- TikTok Poster
- YouTube Description Updater
- Twitter/X Thread Poster
- Facebook Group Poster
- MMO Daily Task (generic + game-specific)
- Content Queue manager

### Phase 7 — Polish
- Auto-update (electron-updater)
- Onboarding wizard
- Actor Marketplace with ratings/install counts
- ClawHub skill references adapted for our format
- Cross-platform packaging (dmg, exe, AppImage)

