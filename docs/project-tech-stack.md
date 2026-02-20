# 🛠️ Technology Stack — MMO Claw

> Source of truth for technology choices, license posture, and stack rationale.

---

## Stack Summary

| Area | Primary Choices |
|---|---|
| Desktop shell | Electron, Vite, React, shadcn/ui, Zustand |
| Agent runtime | PocketPaw fork, Telegram gateway, REST/WebSocket |
| Actor execution | Crawlee, Apify actor pattern, Playwright tooling |
| Anti-detect browsers | Camoufox, playwright-extra + stealth, puppeteer-extra + stealth, fingerprint-suite, proxy-chain |
| Python/runtime management | Bundled `uv` binary, `uvx` |
| Data and local storage | SQLite (`better-sqlite3`), `electron-store` |
| Security and secrets | `keytar`, PocketPaw encrypted vault |
| Team and auth | Casdoor SSO |
| Contracts and process bridge | Typed Electron IPC (`packages/ipc`) |
| Build and distribution | Turborepo, electron-updater, dmg/exe/AppImage packaging |

---

## License Summary

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

## Why This Stack Wins

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
