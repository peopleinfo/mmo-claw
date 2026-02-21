# 🏛️ Architecture — MMO Claw

> Source of truth for system structure, module boundaries, runtime behavior, and user-operational flows.

---

## Monorepo Structure (Turborepo)

```
your-app/  (Turborepo)
│
├── apps/
│   ├── desktop/          ← Electron + Vite + React + shadcn + Zustand
│   │   └── src/ui/       ← shadcn/Radix UI components (owned by desktop)
│   └── pocketpaw/        ← PocketPaw fork (Python, uvx runnable)
│
├── packages/
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

## Layer by Layer

### Layer 1 — Desktop Shell

**`apps/desktop/`**

This layer owns desktop orchestration, native OS integrations, and the renderer shell around the agent runtime.

**UI components** live directly in `apps/desktop/src/ui/` — shadcn/Radix primitives (`Button`, `Card`, `Dialog`, `Select`, etc.) plus a `cn` utility. There is no separate shared UI package; the desktop owns its own component library.

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

| Feature                    | From PocketPaw (keep)              |
| -------------------------- | ---------------------------------- |
| 24/7 daemon                | ✅                                 |
| Telegram gateway           | ✅ first-class                     |
| Multi-agent Command Center | ✅                                 |
| Plugin/skill system        | ✅ → your actors plug in as skills |
| Playwright browser tools   | ✅                                 |
| Memory + RAG (Mem0)        | ✅                                 |
| Cron scheduler             | ✅                                 |
| Encrypted vault            | ✅                                 |
| REST API :8888             | ✅                                 |
| Discord, Slack, WhatsApp   | ✅                                 |
| Web dashboard              | ✅ → extended with your pages      |

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

| Provider             | Engine                        | Use Case                                 |
| -------------------- | ----------------------------- | ---------------------------------------- |
| `camoufox`           | Firefox via Camoufox          | Highest anti-detect, TikTok, Instagram   |
| `playwright-stealth` | Chromium via playwright-extra | General stealth, YouTube, Twitter        |
| `puppeteer-stealth`  | Chromium via puppeteer-extra  | Legacy sites, MMO portals                |
| `playwright-vanilla` | Standard Playwright           | Low-risk tasks, YouTube description edit |

Crawlee `BrowserPool` manages concurrency, retries, and session rotation across providers.

---

### Layer 4 — Anti-Detect Browser

**`packages/browser/`**

Abstracts all browser engines behind a single `BrowserProvider` interface. Actors request a provider — the layer handles fingerprints, proxy assignment, and session isolation.

| Tool                           | Role                               | License    | Install                        |
| ------------------------------ | ---------------------------------- | ---------- | ------------------------------ |
| **Camoufox**                   | Firefox-level fingerprint spoofing | MIT        | `uvx camoufox` via uvx-manager |
| **playwright-extra + stealth** | Chromium stealth                   | MIT        | npm                            |
| **puppeteer-extra + stealth**  | Chromium stealth (alt)             | MIT        | npm                            |
| **fingerprint-suite** (Apify)  | Fingerprint generation + injection | Apache 2.0 | npm                            |
| **proxy-chain** (Apify)        | Per-profile proxy routing          | Apache 2.0 | npm                            |

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

| Feature                    | How                                                                       |
| -------------------------- | ------------------------------------------------------------------------- |
| Bundled Python             | `uv` binary shipped in Electron `resources/` — no Python install required |
| Install Python actors      | `uvx install actor-name` via uv                                           |
| Install Camoufox           | `uvx camoufox` — managed automatically                                    |
| Install other Python tools | Any `uvx`-compatible package from PyPI                                    |
| Version management         | uv handles venvs and versions per tool                                    |
| UI                         | Actor Marketplace screen shows install/update/uninstall                   |

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

| Table           | Purpose                                                            |
| --------------- | ------------------------------------------------------------------ |
| `profiles`      | Browser fingerprint profiles (UA, viewport, timezone, WebGL, etc.) |
| `proxies`       | Proxy list (HTTP/SOCKS5, auth, test status)                        |
| `profile_proxy` | Many-to-many: which proxy assigned to which profile                |
| `teams`         | Team metadata                                                      |
| `team_members`  | User accounts, roles (admin / editor / viewer)                     |
| `sessions`      | Agent session history                                              |
| `actors`        | Installed actor registry                                           |
| `schedules`     | Cron schedules per actor                                           |
| `runs`          | Actor run history + logs                                           |
| `accounts`      | Social media / MMO accounts linked to profiles                     |
| `content_queue` | Scheduled content waiting to be posted                             |

---

### Layer 7 — Shared IPC Contracts

**`packages/ipc/`**

Fully typed IPC channel definitions shared between Electron main process and renderer. No stringly-typed `ipcRenderer.invoke('do-something')` anywhere.

Every IPC call has a TypeScript type contract. Renderer calls typed functions. Main process handles typed requests. Preload exposes typed `window.api.*` surface only.

---

## UI Pages (Electron Renderer)

| Page            | What it does                                      | Data source              |
| --------------- | ------------------------------------------------- | ------------------------ |
| **Chat**        | Talk to PocketPaw agent, stream responses         | PocketPaw WS :8888       |
| **Dashboard**   | Live agent status, running actors, recent runs    | PocketPaw REST + SQLite  |
| **Profiles**    | Create/edit/delete browser fingerprint profiles   | SQLite via IPC           |
| **Proxies**     | Add/test/assign proxies, rotation settings        | SQLite via IPC           |
| **Accounts**    | Link social/MMO accounts to profiles              | SQLite via IPC           |
| **Marketplace** | Browse/install/update/uninstall actors            | uvx-manager via IPC      |
| **Schedule**    | View/create/edit scheduled actor runs             | PocketPaw cron + SQLite  |
| **Runs**        | Actor run history, logs, screenshots              | SQLite via IPC           |
| **Team**        | Invite members, manage roles, Casdoor SSO         | SQLite + Casdoor via IPC |
| **Settings**    | API keys (keychain), LLM provider, Telegram token | keytar via IPC           |

---

## User Flows

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
