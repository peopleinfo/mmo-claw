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

## 🏗️ Monorepo Structure (Turborepo)

```
your-app/  (Turborepo)
│
├── apps/
│   ├── desktop/          ← Electron + Vite + React + shadcn + Zustand
│   └── pocketpaw/        ← PocketPaw fork (Python, uvx runnable)
│
├── packages/
│   ├── ui/               ← shared shadcn component library
│   ├── ipc/              ← shared IPC type contracts (main ↔ renderer)
│   ├── db/               ← shared SQLite schema + queries (better-sqlite3)
│   ├── actors/           ← Crawlee actor library (all platform actors)
│   ├── browser/          ← anti-detect browser layer abstraction
│   ├── proxy/            ← proxy-chain + profile assignment
│   └── uvx-manager/      ← lightweight Pinokio-style Python runtime manager
│
└── skills/               ← PocketPaw skill files (one per platform/task)
    ├── instagram-poster/
    ├── tiktok-poster/
    ├── youtube-updater/
    ├── twitter-thread/
    ├── facebook-group/
    └── mmo-daily-task/
```

---

## 🧩 Layer by Layer

---

### Layer 1 — Desktop Shell
**`apps/desktop/`**

| Decision | Choice | Why |
|---|---|---|
| Framework | **Electron** | You know it, mature, cross-platform |
| Build tool | **Vite** | Fast HMR, modern ESM |
| UI | **React + shadcn/ui** | Component library ready, Radix primitives |
| State | **Zustand** | Lightweight, no boilerplate vs Redux |
| IPC bridge | **Electron IPC** (typed via `packages/ipc`) | Main ↔ renderer, fully typed contracts |
| Keychain | **keytar** | OS keychain for API keys + tokens |
| Local store | **electron-store** | App settings, window state |
| Tray | **Electron system tray** | 24/7 background, minimize to tray |
| Auto-launch | **electron-auto-launch** | Start on OS login |
| Python runtime | **uv bundled binary** | Shipped inside Electron resources/ |

**What the Electron app does:**
- Wraps PocketPaw fork web UI at `localhost:8888` in a BrowserWindow
- Adds system tray, auto-launch, native OS integrations
- Renders YOUR custom pages (Profile, Proxy, Team, Marketplace) as additional React routes
- Communicates with PocketPaw fork via HTTP/WebSocket
- Manages uvx-manager for Python actor installs

---

### Layer 2 — AI Agent Brain
**`apps/pocketpaw/`** — Fork of `github.com/pocketpaw/pocketpaw`

**Why fork instead of just running it?**
- Add custom skill auto-discovery from `packages/actors`
- Add profile + proxy context injection into every skill run
- Add team auth via Casdoor SSO integration layer on top of the REST API
- Customize the web dashboard to embed your CRUD pages
- Ship it bundled and runnable via the uvx-manager

| Feature | From PocketPaw (keep) |
|---|---|
| 24/7 daemon | ✅ |
| Telegram gateway | ✅ first-class |
| Multi-agent Command Center | ✅ |
| Plugin/skill system | ✅ → your actors plug in as skills |
| Playwright browser tools | ✅ |
| Memory + RAG (Mem0) | ✅ |
| Cron scheduler | ✅ |
| Encrypted vault | ✅ |
| REST API :8888 | ✅ |
| Discord, Slack, WhatsApp | ✅ |
| Web dashboard | ✅ → extended with your pages |

**What you add to the fork:**
- Casdoor SSO auth middleware on the REST API
- Profile + proxy context passed to every skill at runtime
- Custom skill registry that reads from `skills/` directory
- Actor run status pushed to Electron via WebSocket events
- Lightweight changes only — stays mergeable upstream

---

### Layer 3 — Actor System
**`packages/actors/`** — Crawlee + Apify actor pattern

**Pattern borrowed from:** `github.com/apify/actor-scraper` + `github.com/apify/crawlee`

Each actor follows the Apify input schema pattern:
```
actors/
├── instagram-poster/
│   ├── input_schema.json   ← defines form fields shown in UI
│   ├── actor.ts            ← Crawlee crawler implementation
│   └── skill.py            ← PocketPaw skill entry point
├── tiktok-poster/
├── youtube-updater/
├── twitter-thread/
├── facebook-group/
└── mmo-daily-task/
```

**Actor provider pattern** — each actor declares which browser provider it needs:

| Provider | Engine | Use Case |
|---|---|---|
| `camoufox` | Firefox via Camoufox | Highest anti-detect, TikTok, Instagram |
| `playwright-stealth` | Chromium via playwright-extra | General stealth, YouTube, Twitter |
| `puppeteer-stealth` | Chromium via puppeteer-extra | Legacy sites, MMO portals |
| `playwright-vanilla` | Standard Playwright | Low-risk tasks, YouTube description edit |

Crawlee `BrowserPool` manages concurrency, retries, and session rotation across providers.

---

### Layer 4 — Anti-Detect Browser
**`packages/browser/`**

Abstracts all browser engines behind a single `BrowserProvider` interface. Actors request a provider — the layer handles fingerprints, proxy assignment, and session isolation.

| Tool | Role | License | Install |
|---|---|---|---|
| **Camoufox** | Firefox-level fingerprint spoofing | MIT | `uvx camoufox` via uvx-manager |
| **playwright-extra + stealth** | Chromium stealth | MIT | npm |
| **puppeteer-extra + stealth** | Chromium stealth (alt) | MIT | npm |
| **fingerprint-suite** (Apify) | Fingerprint generation + injection | Apache 2.0 | npm |
| **proxy-chain** (Apify) | Per-profile proxy routing | Apache 2.0 | npm |

**Profile → Browser session flow:**
```
User selects profile in UI
  → profile loaded from SQLite (fingerprint config + proxy ID)
  → proxy-chain creates tunneled proxy URL
  → fingerprint-suite injects fingerprint into browser context
  → Camoufox or playwright-extra launches with isolated session
  → actor runs inside that session
  → session closed, logs saved
```

---

### Layer 5 — uvx Manager (Lightweight Pinokio)
**`packages/uvx-manager/`**

Inspired by Pinokio but lightweight and embedded. Handles Python runtime and tool management without requiring users to install Python separately.

**Key capabilities:**

| Feature | How |
|---|---|
| Bundled Python | `uv` binary shipped in Electron `resources/` — no Python install required |
| Install Python actors | `uvx install actor-name` via uv |
| Install Camoufox | `uvx camoufox` — managed automatically |
| Install other Python tools | Any `uvx`-compatible package from PyPI |
| Version management | uv handles venvs and versions per tool |
| UI | Actor Marketplace screen shows install/update/uninstall |

**uv binary bundling strategy:**
- Download platform-specific `uv` binary at build time (macOS arm64, macOS x64, Windows x64, Linux x64)
- Ship inside `resources/bin/uv`
- uvx-manager always calls THIS binary, never relies on system Python
- User installs your app → Python ecosystem available immediately

**Supported platforms at launch:**
- macOS (arm64 + x64)
- Windows 11 (x64)
- Linux (x64, AppImage)

---

### Layer 6 — Data Layer
**`packages/db/`**

Local-first SQLite via `better-sqlite3`. No cloud, no external DB. All data on user's machine.

**Schema (core tables):**

| Table | Purpose |
|---|---|
| `profiles` | Browser fingerprint profiles (UA, viewport, timezone, WebGL, etc.) |
| `proxies` | Proxy list (HTTP/SOCKS5, auth, test status) |
| `profile_proxy` | Many-to-many: which proxy assigned to which profile |
| `teams` | Team metadata |
| `team_members` | User accounts, roles (admin / editor / viewer) |
| `sessions` | Agent session history |
| `actors` | Installed actor registry |
| `schedules` | Cron schedules per actor |
| `runs` | Actor run history + logs |
| `accounts` | Social media / MMO accounts linked to profiles |
| `content_queue` | Scheduled content waiting to be posted |

---

### Layer 7 — Shared IPC Contracts
**`packages/ipc/`**

Fully typed IPC channel definitions shared between Electron main process and renderer. No stringly-typed `ipcRenderer.invoke('do-something')` anywhere.

Every IPC call has a TypeScript type contract. Renderer calls typed functions. Main process handles typed requests. Preload exposes typed `window.api.*` surface only.

---

## 📱 UI Pages (Electron Renderer)

| Page | What it does | Data source |
|---|---|---|
| **Chat** | Talk to PocketPaw agent, stream responses | PocketPaw WS :8888 |
| **Dashboard** | Live agent status, running actors, recent runs | PocketPaw REST + SQLite |
| **Profiles** | Create/edit/delete browser fingerprint profiles | SQLite via IPC |
| **Proxies** | Add/test/assign proxies, rotation settings | SQLite via IPC |
| **Accounts** | Link social/MMO accounts to profiles | SQLite via IPC |
| **Marketplace** | Browse/install/update/uninstall actors | uvx-manager via IPC |
| **Schedule** | View/create/edit scheduled actor runs | PocketPaw cron + SQLite |
| **Runs** | Actor run history, logs, screenshots | SQLite via IPC |
| **Team** | Invite members, manage roles, Casdoor SSO | SQLite + Casdoor via IPC |
| **Settings** | API keys (keychain), LLM provider, Telegram token | keytar via IPC |

---

## 🔄 User Flows

### First Launch
```
App opens → uvx-manager checks bundled uv binary
→ PocketPaw fork starts via uvx in background
→ Settings page prompts for LLM API key (stored in keychain)
→ Telegram token setup (optional, stored in vault)
→ PocketPaw daemon running, tray icon appears
```

### Content Creator Flow (Desktop)
```
1. Create browser profile (fingerprint config)
2. Add proxy → assign to profile
3. Link Instagram account to profile
4. Install "Instagram Poster" from Marketplace
5. Add content to queue (caption + media)
6. Schedule: daily 9am
→ Actor runs in background via PocketPaw skill
→ Camoufox opens with profile fingerprint + proxy
→ Posts content, closes browser
→ Run logged, notification sent
```

### Remote Control Flow (Telegram)
```
User: "Post my TikTok draft now"
→ PocketPaw Telegram bot receives message
→ Agent reasons: pick tiktok-poster skill
→ Loads profile + proxy from SQLite context
→ Runs Crawlee actor with Camoufox
→ Posts, captures screenshot as proof
→ Bot replies: "✅ Posted to @handle — see screenshot"
```

### Team Flow
```
Admin creates team → invites editors via email
Editor logs in with Casdoor SSO → sees only assigned profiles/actors
Admin dashboard → all team runs, usage, schedules
Role-based: editors run actors, only admin manages team/billing
```

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

---

## 📦 License Summary

| Tool | License | Safe? |
|---|---|---|
| PocketPaw (fork) | MIT | ✅ |
| Electron | MIT | ✅ |
| Vite | MIT | ✅ |
| React | MIT | ✅ |
| shadcn/ui | MIT | ✅ |
| Zustand | MIT | ✅ |
| Crawlee | Apache 2.0 | ✅ |
| apify/actor-scraper | Apache 2.0 | ✅ reference |
| playwright-extra + stealth | MIT | ✅ |
| puppeteer-extra + stealth | MIT | ✅ |
| fingerprint-suite | Apache 2.0 | ✅ |
| proxy-chain | Apache 2.0 | ✅ |
| Camoufox | MIT | ✅ |
| uv / uvx | MIT | ✅ |
| better-sqlite3 | MIT | ✅ |
| keytar | MIT | ✅ |
| openai-agents-js | MIT | ✅ |
| Turborepo | MIT | ✅ |
| clawe | AGPL-3.0 | ❌ SKIP |

> All core tools are MIT or Apache 2.0. Zero AGPL or GPL contamination.

---

## 🏆 Why This Stack Wins

| Concern | Answer |
|---|---|
| Not rebuilding everything | PocketPaw fork handles 80% of agent brain |
| You know Electron | Desktop shell is your home turf |
| No Python setup for users | uv binary bundled — Python included in app |
| Anti-detect serious | Camoufox (Firefox) + playwright-extra (Chromium) + fingerprint-suite |
| Actor extensibility | Apify actor pattern — anyone can write a skill |
| No vendor lock-in | Fully local-first, SQLite, no cloud dependency |
| No existing competitor | Commercial tools cost $30–200/month, none have AI agent or Telegram control |
| Team support | Casdoor SSO + roles built into PocketPaw fork API |
| Cross-platform | Electron + uv binary strategy covers macOS, Windows, Linux |

