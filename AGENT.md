# AGENT.md — MMO Claw

> Full coding instructions for local AI assistant.
> Read this entire file before writing any code.
> Follow every section in order. Do not skip constraints.

---

## 0. Project Summary

MMO Claw is a **Pinokio-style Electron desktop shell** for running automation actors (bots).

It combines:

- **Pinokio concept** — home dir, one-click actor install from GitHub, visual process dashboard
- **uv runtime** — replaces conda/pip entirely. Single bundled Rust binary. PEP 723 inline deps.
- **Apify/Crawlee** — browser automation and scraping actors (JS/TS, npm package)
- **apify/actor-scraper** — git submodule, provides ready-made scraper actors
- **pocketpaw** — git submodule, provides Telegram bot gateway + WebSocket message bus

Primary use cases: MMO automation, social media upload/post/download, scraping, queue/schedule management. Telegram bot controls everything remotely.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 29+ |
| Main process | Node.js + TypeScript (`tsconfig.main.json`, CommonJS target) |
| Renderer | React 18 + TypeScript + Vite 5 |
| Styling | TailwindCSS 3 |
| UI components | shadcn/ui (Radix UI primitives + Tailwind) |
| State | Zustand 4 |
| Data fetching | TanStack Query v5 (wraps IPC calls) |
| IPC typing | `src/shared/ipc.types.ts` — used by BOTH main + renderer |
| Database | better-sqlite3 (main process only, never renderer) |
| Queue | SQLite-backed, no Redis |
| Scheduler | node-cron |
| Actor runtime | uv (bundled Rust binary, ~10MB) |
| Forms | react-hook-form + zod + shadcn `<Form>` |
| Icons | lucide-react |
| Class utils | clsx + tailwind-merge (via `cn()` helper) |

---

## 2. Repository Layout

```
MMO Claw/
├── AGENT.md
├── package.json
├── tsconfig.json                    ← base tsconfig
├── tsconfig.main.json               ← main process (Node, CommonJS)
├── tsconfig.renderer.json           ← renderer (DOM, ESNext)
├── electron-builder.yml
├── vite.config.ts
├── tailwind.config.ts
├── .gitmodules
│
├── vendor/                          ← git submodules, READ-ONLY, never edit
│   ├── pocketpaw/                   ← MIT
│   └── actor-scraper/               ← Apache-2.0
│
├── resources/
│   └── bin/
│       ├── uv                       ← Linux/Mac x64
│       ├── uv.exe                   ← Windows
│       └── uv-aarch64               ← Apple Silicon
│
├── actors/                          ← built-in actors shipped with app
│   ├── _template/
│   │   ├── actor.json
│   │   ├── INPUT_SCHEMA.json
│   │   └── main.py
│   ├── tiktok-poster/
│   ├── instagram-uploader/
│   ├── youtube-shorts/
│   ├── facebook-poster/
│   ├── x-poster/
│   ├── mmo-farmer/
│   └── bulk-downloader/
│
├── bridge/
│   └── gateway_bridge.py            ← PocketPaw bus ↔ MMO Claw REST (~100 lines)
│
└── src/
    ├── shared/                      ← imported by BOTH main and renderer
    │   ├── ipc.types.ts             ← ALL channel names + payload types
    │   ├── actor.types.ts           ← Actor, InputSchema, ActorInput
    │   ├── workspace.types.ts       ← Workspace, Task, Account, Asset
    │   └── config.types.ts          ← AppConfig + DEFAULT_CONFIG
    │
    ├── main/                        ← Electron main process
    │   ├── index.ts                 ← BrowserWindow, bootstrap
    │   ├── workspace.ts             ← Workspace class, path jail, SQLite schema
    │   ├── workspaceManager.ts      ← create / list / get / delete
    │   ├── actorRunner.ts           ← spawn uv, parse logs, emit IPC events
    │   ├── actorRegistry.ts         ← install from GitHub, load actor.json
    │   ├── queueEngine.ts           ← SQLite task queue per workspace
    │   ├── scheduler.ts             ← cron + interval + one-shot
    │   ├── proxyManager.ts          ← pool, rotation, health check
    │   ├── accountVault.ts          ← AES-256 encrypted credentials
    │   ├── gateway.ts               ← spawn pocketpaw sidecar, REST API
    │   └── ipc.ts                   ← ALL ipcMain.handle() registrations
    │
    └── renderer/
        ├── index.html
        ├── globals.css              ← Tailwind directives + shadcn CSS vars
        ├── main.tsx
        ├── preload.ts               ← contextBridge, compiled separately
        ├── App.tsx
        ├── ipc.ts                   ← typed wrapper over window.electron
        ├── lib/
        │   └── utils.ts             ← cn() helper (clsx + tailwind-merge)
        ├── components/
        │   ├── ui/                  ← shadcn/ui generated components (DO NOT HAND-EDIT)
        │   │   ├── button.tsx
        │   │   ├── badge.tsx
        │   │   ├── card.tsx
        │   │   ├── dialog.tsx
        │   │   ├── dropdown-menu.tsx
        │   │   ├── form.tsx
        │   │   ├── input.tsx
        │   │   ├── label.tsx
        │   │   ├── progress.tsx
        │   │   ├── scroll-area.tsx
        │   │   ├── select.tsx
        │   │   ├── separator.tsx
        │   │   ├── sheet.tsx
        │   │   ├── sidebar.tsx
        │   │   ├── skeleton.tsx
        │   │   ├── switch.tsx
        │   │   ├── table.tsx
        │   │   ├── tabs.tsx
        │   │   ├── textarea.tsx
        │   │   ├── toast.tsx
        │   │   ├── toaster.tsx
        │   │   └── tooltip.tsx
        │   ├── ActorForm.tsx        ← auto-renders form from INPUT_SCHEMA.json
        │   ├── QueueTable.tsx
        │   ├── LogViewer.tsx
        │   └── WorkspaceCard.tsx
        ├── pages/
        │   ├── Dashboard.tsx
        │   ├── Workspaces.tsx
        │   ├── Store.tsx
        │   ├── Scheduler.tsx
        │   └── Settings.tsx
        ├── store/
        │   ├── workspaceStore.ts    ← Zustand: active workspace
        │   └── queueStore.ts        ← Zustand: tasks per workspace
        └── hooks/
            ├── useWorkspaces.ts
            ├── useQueue.ts
            ├── useActors.ts
            └── useLogs.ts
```

---

## 3. Git Submodules

```bash
git submodule add https://github.com/pocketpaw/pocketpaw vendor/pocketpaw
git submodule add https://github.com/apify/actor-scraper vendor/actor-scraper
git submodule update --init --recursive
```

### .gitmodules

```ini
[submodule "vendor/pocketpaw"]
    path = vendor/pocketpaw
    url = https://github.com/pocketpaw/pocketpaw
    branch = main

[submodule "vendor/actor-scraper"]
    path = vendor/actor-scraper
    url = https://github.com/apify/actor-scraper
    branch = master
```

**Rules:**

- Never edit files inside `vendor/`
- PocketPaw runs as a Python subprocess via `uv run bridge/gateway_bridge.py`
- actor-scraper actors are wrapped by placing `actor.json` stubs in `actors/`

---

## 4. shadcn/ui Setup

### Install command (run once after cloning)

```bash
# shadcn init — choose: TypeScript, Vite, dark theme, src/renderer path
npx shadcn@latest init

# Add all components used in this project
npx shadcn@latest add button badge card dialog dropdown-menu form \
  input label progress scroll-area select separator sheet \
  sidebar skeleton switch table tabs textarea toast tooltip
```

### components.json (shadcn config — commit this)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/renderer/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### vite.config.ts — add `@` alias for shadcn

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  resolve: {
    alias: {
      '@':       path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
})
```

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT:          'hsl(var(--sidebar-background))',
          foreground:       'hsl(var(--sidebar-foreground))',
          primary:          'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent:           'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border:           'hsl(var(--sidebar-border))',
          ring:             'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
```

### src/renderer/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background:   0 0% 100%;
    --foreground:   240 10% 3.9%;
    --card:         0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary:      240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary:    240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted:        240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent:       240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive:  0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border:       240 5.9% 90%;
    --input:        240 5.9% 90%;
    --ring:         240 5.9% 10%;
    --radius:       0.5rem;
    --sidebar-background:         240 5.9% 10%;
    --sidebar-foreground:         240 4.8% 95.9%;
    --sidebar-primary:            224 71.4% 4.1%;
    --sidebar-primary-foreground: 210 20% 98%;
    --sidebar-accent:             240 3.7% 15.9%;
    --sidebar-accent-foreground:  240 4.8% 95.9%;
    --sidebar-border:             240 3.7% 15.9%;
    --sidebar-ring:               217.2 91.2% 59.8%;
  }

  .dark {
    --background:   240 10% 3.9%;
    --foreground:   0 0% 98%;
    --card:         240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --primary:      0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary:    240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted:        240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent:       240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive:  0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border:       240 3.7% 15.9%;
    --input:        240 3.7% 15.9%;
    --ring:         240 4.9% 83.9%;
    --sidebar-background:         240 5.9% 10%;
    --sidebar-foreground:         240 4.8% 95.9%;
    --sidebar-primary:            224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent:             240 3.7% 15.9%;
    --sidebar-accent-foreground:  240 4.8% 95.9%;
    --sidebar-border:             240 3.7% 15.9%;
    --sidebar-ring:               217.2 91.2% 59.8%;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

### src/renderer/lib/utils.ts

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Rules for shadcn components

- Files inside `components/ui/` are **generated by shadcn CLI** — treat as read-only. Customise by wrapping, not editing.
- Always import from `@/components/ui/...` not relative paths.
- Use `cn()` from `@/lib/utils` for all conditional class merging — never template literals.
- Dark mode is class-based. The root `<html>` should have `class="dark"` by default (set in `main.tsx`).

---

## 5. Shared Types (define these FIRST before any implementation)

```typescript
// src/shared/ipc.types.ts

import type { Workspace, Task, TaskStatus } from './workspace.types'
import type { Actor, ActorInput } from './actor.types'
import type { AppConfig } from './config.types'

// ─── Channel name constants ────────────────────────────────────────────────

export const IPC = {
  WORKSPACE_LIST:   'workspace:list',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_GET:    'workspace:get',

  ACTOR_LIST:      'actor:list',
  ACTOR_INSTALL:   'actor:install',
  ACTOR_UNINSTALL: 'actor:uninstall',
  ACTOR_GET:       'actor:get',

  QUEUE_ENQUEUE:  'queue:enqueue',
  QUEUE_LIST:     'queue:list',
  QUEUE_KILL:     'queue:kill',
  QUEUE_KILL_ALL: 'queue:killAll',

  SCHEDULE_ADD:    'schedule:add',
  SCHEDULE_REMOVE: 'schedule:remove',
  SCHEDULE_LIST:   'schedule:list',

  SETTINGS_GET:       'settings:get',
  SETTINGS_SET:       'settings:set',
  SETTINGS_OPEN_HOME: 'settings:openHomeDir',

  // Push events: main → renderer (use ipcRenderer.on / window.electron.on)
  EVENT_ACTOR_LOG:     'actor:log',
  EVENT_ACTOR_STARTED: 'actor:started',
  EVENT_ACTOR_DONE:    'actor:done',
  EVENT_ACTOR_FAILED:  'actor:failed',
  EVENT_QUEUE_UPDATE:  'queue:update',
} as const

// ─── Request/Response map: [RequestPayload, ResponsePayload] ──────────────

export interface IpcRequestMap {
  [IPC.WORKSPACE_LIST]:   [void,                            Workspace[]]
  [IPC.WORKSPACE_CREATE]: [{ name: string },                Workspace]
  [IPC.WORKSPACE_DELETE]: [{ id: string },                  void]
  [IPC.WORKSPACE_GET]:    [{ id: string },                  Workspace | null]

  [IPC.ACTOR_LIST]:      [void,                             Actor[]]
  [IPC.ACTOR_INSTALL]:   [{ repoUrl: string; name?: string }, Actor]
  [IPC.ACTOR_UNINSTALL]: [{ name: string },                 void]
  [IPC.ACTOR_GET]:       [{ name: string },                 Actor | null]

  [IPC.QUEUE_ENQUEUE]:  [{ wsId: string; actor: string; input: ActorInput; priority?: number; runAt?: number }, string]
  [IPC.QUEUE_LIST]:     [{ wsId: string; status?: TaskStatus }, Task[]]
  [IPC.QUEUE_KILL]:     [{ wsId: string; taskId: string },      boolean]
  [IPC.QUEUE_KILL_ALL]: [{ wsId: string },                      void]

  [IPC.SCHEDULE_ADD]:    [ScheduleAddPayload,               string]
  [IPC.SCHEDULE_REMOVE]: [{ jobId: string },                void]
  [IPC.SCHEDULE_LIST]:   [void,                             ScheduledJob[]]

  [IPC.SETTINGS_GET]:       [void,                          AppConfig]
  [IPC.SETTINGS_SET]:       [{ key: keyof AppConfig; value: unknown }, void]
  [IPC.SETTINGS_OPEN_HOME]: [void,                          void]
}

// ─── Push event payloads ───────────────────────────────────────────────────

export interface IpcEventMap {
  [IPC.EVENT_ACTOR_LOG]:     { wsId: string; taskId: string; level: LogLevel; message: string; ts: number }
  [IPC.EVENT_ACTOR_STARTED]: { wsId: string; taskId: string; actor: string }
  [IPC.EVENT_ACTOR_DONE]:    { wsId: string; taskId: string; output?: unknown }
  [IPC.EVENT_ACTOR_FAILED]:  { wsId: string; taskId: string; error: string }
  [IPC.EVENT_QUEUE_UPDATE]:  { wsId: string }
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface ScheduleAddPayload {
  workspaceId: string
  actor: string
  input: ActorInput
  cronExpr: string
  runOnce?: boolean
}

export interface ScheduledJob {
  id: string
  workspaceId: string
  actor: string
  cronExpr: string
  lastRun?: number
  nextRun?: number
}
```

```typescript
// src/shared/workspace.types.ts

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled'

export interface Workspace {
  id: string
  name: string
  root: string
  createdAt: number
}

export interface Task {
  id: string
  actor: string
  status: TaskStatus
  input?: string        // JSON string
  output?: string       // JSON string
  error?: string
  attempts: number
  maxAttempts: number
  priority: number
  runAt: number
  startedAt?: number
  finishedAt?: number
  createdAt: number
}

export interface Account {
  id: string
  platform: string
  username?: string
  credentialsEnc?: string
  proxy?: string
  status: 'active' | 'banned' | 'suspended'
  lastUsed?: number
  createdAt: number
}

export interface Asset {
  id: string
  filename: string
  filepath: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  platform?: string
  caption?: string
  hashtags?: string
  scheduledAt?: number
  postedAt?: number
  taskId?: string
  createdAt: number
}
```

```typescript
// src/shared/actor.types.ts

export type ActorInput = Record<string, unknown>

export type InputSchemaEditor =
  | 'textfield' | 'textarea' | 'number'
  | 'checkbox' | 'select' | 'filepicker'

export interface InputSchemaProperty {
  title: string
  type: 'string' | 'integer' | 'number' | 'boolean'
  description?: string
  editor?: InputSchemaEditor
  default?: unknown
  minimum?: number
  maximum?: number
  enum?: string[]
  source?: string    // e.g. "accounts:tiktok" for dynamic select
}

export interface InputSchema {
  title: string
  type: 'object'
  schemaVersion: number
  properties: Record<string, InputSchemaProperty>
  required?: string[]
}

export interface Actor {
  name: string
  version: string
  title: string
  description?: string
  author?: string
  runtime: 'python' | 'node'
  entry: string
  category: 'social' | 'scraping' | 'mmo' | 'utility'
  tags?: string[]
  schedule?: string | null
  timeout?: number
  maxRetries?: number
  needs?: {
    browser?: boolean
    proxy?: 'required' | 'optional' | false
    account?: string
  }
  // Runtime-resolved fields
  dir: string
  entrypoint: string
  inputSchema?: InputSchema | null
  builtin: boolean
}
```

```typescript
// src/shared/config.types.ts

export interface AppConfig {
  homeDir: string
  telegramBotToken: string
  telegramAllowedUserId: string
  defaultProxy: string
  maxConcurrentActors: number
  theme: 'dark' | 'light'
}

export const DEFAULT_CONFIG: AppConfig = {
  homeDir: '~/.MMO Claw',
  telegramBotToken: '',
  telegramAllowedUserId: '',
  defaultProxy: '',
  maxConcurrentActors: 3,
  theme: 'dark',
}
```

---

## 6. Preload + contextBridge

```typescript
// src/renderer/preload.ts
// Compiled with tsconfig.main.json — loaded as preload script in BrowserWindow

import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRequestMap, IpcEventMap } from '../shared/ipc.types'

type ReqChannel   = keyof IpcRequestMap
type EventChannel = keyof IpcEventMap

contextBridge.exposeInMainWorld('electron', {
  invoke: <C extends ReqChannel>(
    channel: C,
    payload?: IpcRequestMap[C][0]
  ): Promise<IpcRequestMap[C][1]> =>
    ipcRenderer.invoke(channel, payload),

  on: <C extends EventChannel>(
    channel: C,
    listener: (payload: IpcEventMap[C]) => void
  ): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: IpcEventMap[C]) => listener(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
})

// Global type augmentation — used by renderer/ipc.ts
declare global {
  interface Window {
    electron: {
      invoke<C extends ReqChannel>(channel: C, payload?: IpcRequestMap[C][0]): Promise<IpcRequestMap[C][1]>
      on<C extends EventChannel>(channel: C, listener: (payload: IpcEventMap[C]) => void): () => void
    }
  }
}
```

---

## 7. Renderer IPC Wrapper

```typescript
// src/renderer/ipc.ts
// All React code calls these helpers — never window.electron directly

import { IPC } from '../shared/ipc.types'
import type { IpcRequestMap, IpcEventMap, ScheduleAddPayload } from '../shared/ipc.types'
import type { ActorInput } from '../shared/actor.types'
import type { TaskStatus } from '../shared/workspace.types'
import type { AppConfig } from '../shared/config.types'

type ReqChannel   = keyof IpcRequestMap
type EventChannel = keyof IpcEventMap

export function invoke<C extends ReqChannel>(
  channel: C,
  payload?: IpcRequestMap[C][0]
): Promise<IpcRequestMap[C][1]> {
  return window.electron.invoke(channel, payload)
}

export function on<C extends EventChannel>(
  channel: C,
  listener: (payload: IpcEventMap[C]) => void
): () => void {
  return window.electron.on(channel, listener)
}

// ─── Domain helpers ────────────────────────────────────────────────────────

export const workspaceIpc = {
  list:   ()             => invoke(IPC.WORKSPACE_LIST),
  create: (name: string) => invoke(IPC.WORKSPACE_CREATE, { name }),
  delete: (id: string)   => invoke(IPC.WORKSPACE_DELETE, { id }),
  get:    (id: string)   => invoke(IPC.WORKSPACE_GET, { id }),
}

export const actorIpc = {
  list:      ()                                 => invoke(IPC.ACTOR_LIST),
  install:   (repoUrl: string, name?: string)   => invoke(IPC.ACTOR_INSTALL, { repoUrl, name }),
  uninstall: (name: string)                     => invoke(IPC.ACTOR_UNINSTALL, { name }),
  get:       (name: string)                     => invoke(IPC.ACTOR_GET, { name }),
}

export const queueIpc = {
  enqueue: (wsId: string, actor: string, input: ActorInput, priority = 0) =>
    invoke(IPC.QUEUE_ENQUEUE, { wsId, actor, input, priority }),
  list:    (wsId: string, status?: TaskStatus) =>
    invoke(IPC.QUEUE_LIST, { wsId, status }),
  kill:    (wsId: string, taskId: string)      =>
    invoke(IPC.QUEUE_KILL, { wsId, taskId }),
  killAll: (wsId: string)                      =>
    invoke(IPC.QUEUE_KILL_ALL, { wsId }),
}

export const scheduleIpc = {
  add:    (payload: ScheduleAddPayload) => invoke(IPC.SCHEDULE_ADD, payload),
  remove: (jobId: string)               => invoke(IPC.SCHEDULE_REMOVE, { jobId }),
  list:   ()                            => invoke(IPC.SCHEDULE_LIST),
}

export const settingsIpc = {
  get:      ()                                         => invoke(IPC.SETTINGS_GET),
  set:      (key: keyof AppConfig, value: unknown)     => invoke(IPC.SETTINGS_SET, { key, value }),
  openHome: ()                                         => invoke(IPC.SETTINGS_OPEN_HOME),
}
```

---

## 8. Main Process IPC Registration

```typescript
// src/main/ipc.ts
// ALL ipcMain.handle() calls live here — never inline in index.ts

import { ipcMain, shell } from 'electron'
import os from 'os'
import fs from 'fs-extra'
import { IPC } from '../shared/ipc.types'
import { DEFAULT_CONFIG } from '../shared/config.types'
import type { AppConfig } from '../shared/config.types'
import type { WorkspaceManager } from './workspaceManager'
import type { ActorRegistry } from './actorRegistry'
import type { ActorRunner } from './actorRunner'
import type { Scheduler } from './scheduler'

export function registerIpcHandlers(deps: {
  workspaceManager: WorkspaceManager
  actorRegistry:    ActorRegistry
  actorRunner:      ActorRunner
  scheduler:        Scheduler
  configPath:       string
}) {
  const { workspaceManager, actorRegistry, actorRunner, scheduler, configPath } = deps

  // ── Workspaces ──────────────────────────────────────────────────────────
  ipcMain.handle(IPC.WORKSPACE_LIST,   ()           => workspaceManager.list())
  ipcMain.handle(IPC.WORKSPACE_GET,    (_, { id })  => workspaceManager.get(id))
  ipcMain.handle(IPC.WORKSPACE_CREATE, (_, { name }) => workspaceManager.create(name))
  ipcMain.handle(IPC.WORKSPACE_DELETE, (_, { id })  => workspaceManager.delete(id))

  // ── Actors ───────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.ACTOR_LIST,      ()                    => actorRegistry.listAll())
  ipcMain.handle(IPC.ACTOR_GET,       (_, { name })         => actorRegistry.loadActor(name))
  ipcMain.handle(IPC.ACTOR_INSTALL,   (_, { repoUrl, name }) => actorRegistry.installFromGit(repoUrl, name))
  ipcMain.handle(IPC.ACTOR_UNINSTALL, (_, { name })         => actorRegistry.uninstall(name))

  // ── Queue ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.QUEUE_ENQUEUE, (_, { wsId, actor, input, priority, runAt }) => {
    const q = actorRunner.getQueue(wsId)
    if (!q) throw new Error(`Workspace not found: ${wsId}`)
    return q.enqueue({ actor, input, priority, runAt })
  })

  ipcMain.handle(IPC.QUEUE_LIST, (_, { wsId, status }) => {
    const q = actorRunner.getQueue(wsId)
    if (!q) throw new Error(`Workspace not found: ${wsId}`)
    return status ? q.listByStatus(status) : q.listAll()
  })

  ipcMain.handle(IPC.QUEUE_KILL, (_, { wsId, taskId }) => {
    const q = actorRunner.getQueue(wsId)
    if (!q) throw new Error(`Workspace not found: ${wsId}`)
    return q.kill(taskId)
  })

  ipcMain.handle(IPC.QUEUE_KILL_ALL, (_, { wsId }) => {
    const q = actorRunner.getQueue(wsId)
    if (!q) throw new Error(`Workspace not found: ${wsId}`)
    q.killAll()
  })

  // ── Schedule ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.SCHEDULE_ADD,    (_, payload)   => scheduler.schedule(payload))
  ipcMain.handle(IPC.SCHEDULE_REMOVE, (_, { jobId }) => { scheduler.cancel(jobId) })
  ipcMain.handle(IPC.SCHEDULE_LIST,   ()             => scheduler.listAll())

  // ── Settings ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return fs.readJson(configPath).catch(() => ({ ...DEFAULT_CONFIG }))
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_, { key, value }) => {
    const config: AppConfig = await fs.readJson(configPath).catch(() => ({ ...DEFAULT_CONFIG }))
    ;(config as Record<string, unknown>)[key] = value
    await fs.writeJson(configPath, config, { spaces: 2 })
  })

  ipcMain.handle(IPC.SETTINGS_OPEN_HOME, async () => {
    const config: AppConfig = await fs.readJson(configPath).catch(() => ({ ...DEFAULT_CONFIG }))
    const homeDir = config.homeDir.replace('~', os.homedir())
    shell.openPath(homeDir)
  })
}
```

---

## 9. Actor Runner (main process)

```typescript
// src/main/actorRunner.ts

import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc.types'
import type { WorkspaceManager } from './workspaceManager'
import type { ActorRegistry } from './actorRegistry'
import { QueueEngine } from './queueEngine'

// Actor log protocol: [CLAW:LEVEL] message
const LOG_RE = /^\[CLAW:(\w+)\]\s(.+)$/

export class ActorRunner {
  private queues   = new Map<string, QueueEngine>()
  private children = new Map<string, ChildProcess>()  // taskId → process
  private ticker:  NodeJS.Timer | null = null

  constructor(
    private wm:       WorkspaceManager,
    private registry: ActorRegistry,
    private maxConcurrentPerWorkspace = 1,
  ) {}

  async init() {
    for (const ws of this.wm.listLoaded()) {
      this.queues.set(ws.id, new QueueEngine(ws))
    }
    this.ticker = setInterval(() => this.tick(), 1000)
  }

  getQueue(wsId: string): QueueEngine | undefined {
    return this.queues.get(wsId)
  }

  onWorkspaceAdded(wsId: string, ws: any) {
    this.queues.set(wsId, new QueueEngine(ws))
  }

  onWorkspaceRemoved(wsId: string) {
    this.queues.get(wsId)?.killAll()
    this.queues.delete(wsId)
  }

  private async tick() {
    for (const [wsId, queue] of this.queues) {
      if (queue.countRunning() >= this.maxConcurrentPerWorkspace) continue

      const task = queue.next()
      if (!task) continue

      const ws = this.wm.get(wsId)
      if (!ws) continue

      const actor = await this.registry.loadActor(task.actor).catch(() => null)
      if (!actor) {
        queue.markFailed(task.id, `Actor not found: ${task.actor}`)
        continue
      }

      this.spawnActor(ws, queue, task, actor.entrypoint)
    }
  }

  private spawnActor(ws: any, queue: QueueEngine, task: any, entrypoint: string) {
    queue.markRunning(task.id)

    this.push(IPC.EVENT_ACTOR_STARTED, { wsId: ws.id, taskId: task.id, actor: task.actor })

    const child = spawn(getUvBin(), ['run', entrypoint], {
      cwd: ws.root,
      env: {
        ...process.env,
        CLAW_WORKSPACE_ROOT:   ws.root,
        CLAW_WORKSPACE_ID:     ws.id,
        CLAW_INPUT:            task.input ?? '{}',
        UV_CACHE_DIR:          path.join(ws.root, '.uv-cache'),
        UV_PYTHON_PREFERENCE:  'managed',
        UV_NO_PROGRESS:        '1',
      },
    })

    this.children.set(task.id, child)

    child.stdout?.on('data', (buf: Buffer) => {
      for (const line of buf.toString().split('\n').filter(Boolean)) {
        const m     = LOG_RE.exec(line)
        const level = (m?.[1]?.toLowerCase() ?? 'info') as any
        const msg   = m ? m[2] : line

        ws.db?.prepare('INSERT INTO logs (task_id, level, message) VALUES (?, ?, ?)').run(task.id, level, msg)
        this.push(IPC.EVENT_ACTOR_LOG, { wsId: ws.id, taskId: task.id, level, message: msg, ts: Date.now() })
      }
    })

    child.stderr?.on('data', (buf: Buffer) => {
      const msg = buf.toString().trim()
      ws.db?.prepare('INSERT INTO logs (task_id, level, message) VALUES (?, ?, ?)').run(task.id, 'error', msg)
      this.push(IPC.EVENT_ACTOR_LOG, { wsId: ws.id, taskId: task.id, level: 'error', message: msg, ts: Date.now() })
    })

    child.on('close', (code) => {
      this.children.delete(task.id)
      if (code === 0) {
        queue.markDone(task.id)
        this.push(IPC.EVENT_ACTOR_DONE, { wsId: ws.id, taskId: task.id })
      } else {
        queue.markFailed(task.id, `Exit code ${code}`)
        this.push(IPC.EVENT_ACTOR_FAILED, { wsId: ws.id, taskId: task.id, error: `Exit code ${code}` })
      }
      this.push(IPC.EVENT_QUEUE_UPDATE, { wsId: ws.id })
    })
  }

  private push(channel: string, payload: unknown) {
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send(channel, payload))
  }

  destroy() {
    if (this.ticker) clearInterval(this.ticker)
    for (const child of this.children.values()) child.kill('SIGTERM')
  }
}

export function getUvBin(): string {
  const base = process.resourcesPath ?? path.join(__dirname, '../../resources')
  if (process.platform === 'win32') return path.join(base, 'bin', 'uv.exe')
  if (process.arch   === 'arm64')  return path.join(base, 'bin', 'uv-aarch64')
  return path.join(base, 'bin', 'uv')
}
```

---

## 10. Queue Engine

```typescript
// src/main/queueEngine.ts

import { v4 as uuid } from 'uuid'
import type { Task, TaskStatus } from '../shared/workspace.types'

interface EnqueueOpts {
  actor: string
  input?: Record<string, unknown>
  priority?: number
  runAt?: number
  maxAttempts?: number
}

export class QueueEngine {
  private db: any

  constructor(private workspace: any) {
    this.db = workspace.db
  }

  enqueue({ actor, input = {}, priority = 0, runAt, maxAttempts = 3 }: EnqueueOpts): string {
    const id = uuid()
    this.db.prepare(`
      INSERT INTO tasks (id, actor, status, input, priority, run_at, max_attempts)
      VALUES (?, ?, 'pending', ?, ?, ?, ?)
    `).run(id, actor, JSON.stringify(input), priority, runAt ?? Date.now(), maxAttempts)
    return id
  }

  next(): Task | undefined {
    return this.db.prepare(`
      SELECT * FROM tasks
      WHERE status = 'pending' AND run_at <= ?
      ORDER BY priority DESC, run_at ASC LIMIT 1
    `).get(Date.now())
  }

  markRunning(id: string)                    { this.db.prepare(`UPDATE tasks SET status='running', started_at=? WHERE id=?`).run(Date.now(), id) }
  markDone(id: string, output?: unknown)     { this.db.prepare(`UPDATE tasks SET status='done', output=?, finished_at=? WHERE id=?`).run(output ? JSON.stringify(output) : null, Date.now(), id) }

  markFailed(id: string, error: string) {
    const task = this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id) as Task
    const attempts  = task.attempts + 1
    const newStatus: TaskStatus = attempts >= task.maxAttempts ? 'failed' : 'pending'
    const retryAt   = newStatus === 'pending' ? Date.now() + 10_000 * attempts : null
    this.db.prepare(`UPDATE tasks SET status=?, error=?, attempts=?, run_at=?, finished_at=? WHERE id=?`)
      .run(newStatus, error, attempts, retryAt, Date.now(), id)
  }

  kill(taskId: string): boolean {
    this.db.prepare(`UPDATE tasks SET status='cancelled' WHERE id=? AND status='pending'`).run(taskId)
    return true
  }

  killAll() {
    this.db.prepare(`UPDATE tasks SET status='cancelled' WHERE status IN ('pending','running')`).run()
  }

  countRunning(): number {
    return (this.db.prepare(`SELECT COUNT(*) as n FROM tasks WHERE status='running'`).get() as any).n
  }

  listByStatus(status: TaskStatus, limit = 50): Task[] {
    return this.db.prepare(`SELECT * FROM tasks WHERE status=? ORDER BY created_at DESC LIMIT ?`).all(status, limit)
  }

  listAll(limit = 100): Task[] {
    return this.db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?`).all(limit)
  }
}
```

---

## 11. React Hooks

```typescript
// src/renderer/hooks/useWorkspaces.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workspaceIpc } from '../ipc'

export const useWorkspaces     = () =>
  useQuery({ queryKey: ['workspaces'], queryFn: () => workspaceIpc.list() })

export const useCreateWorkspace = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => workspaceIpc.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}

export const useDeleteWorkspace = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workspaceIpc.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}
```

```typescript
// src/renderer/hooks/useQueue.ts
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queueIpc, on } from '../ipc'
import { IPC } from '../../shared/ipc.types'
import type { TaskStatus } from '../../shared/workspace.types'
import type { ActorInput } from '../../shared/actor.types'

export function useQueue(wsId: string, status?: TaskStatus) {
  const qc = useQueryClient()

  useEffect(() => {
    return on(IPC.EVENT_QUEUE_UPDATE, ({ wsId: id }) => {
      if (id === wsId) qc.invalidateQueries({ queryKey: ['queue', wsId] })
    })
  }, [wsId, qc])

  return useQuery({
    queryKey:       ['queue', wsId, status],
    queryFn:        () => queueIpc.list(wsId, status),
    refetchInterval: 3000,
    enabled:        !!wsId,
  })
}

export function useEnqueueActor(wsId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ actor, input }: { actor: string; input: ActorInput }) =>
      queueIpc.enqueue(wsId, actor, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue', wsId] }),
  })
}

export function useKillTask(wsId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => queueIpc.kill(wsId, taskId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['queue', wsId] }),
  })
}
```

```typescript
// src/renderer/hooks/useLogs.ts
import { useState, useEffect } from 'react'
import { on } from '../ipc'
import { IPC } from '../../shared/ipc.types'
import type { IpcEventMap } from '../../shared/ipc.types'

type LogEntry = IpcEventMap[typeof IPC.EVENT_ACTOR_LOG]

export function useLogs(wsId: string, maxLines = 200): LogEntry[] {
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    setLogs([])
    return on(IPC.EVENT_ACTOR_LOG, (entry) => {
      if (entry.wsId !== wsId) return
      setLogs(prev => {
        const next = [...prev, entry]
        return next.length > maxLines ? next.slice(-maxLines) : next
      })
    })
  }, [wsId, maxLines])

  return logs
}
```

---

## 12. ActorForm Component (shadcn/ui)

```tsx
// src/renderer/components/ActorForm.tsx
// Uses shadcn Form, Input, Textarea, Select, Switch, Button

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch }   from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import type { InputSchema, InputSchemaProperty, ActorInput } from '@shared/actor.types'

interface Props {
  schema:         InputSchema
  defaultValues?: ActorInput
  onSubmit:       (values: ActorInput) => void
  loading?:       boolean
}

function buildZodSchema(schema: InputSchema) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const [key, prop] of Object.entries(schema.properties)) {
    let field: z.ZodTypeAny
    switch (prop.type) {
      case 'integer':
      case 'number':  field = z.coerce.number(); break
      case 'boolean': field = z.boolean().default(false); break
      default:        field = z.string()
    }
    if (prop.minimum !== undefined) field = (field as z.ZodNumber).min(prop.minimum)
    if (prop.maximum !== undefined) field = (field as z.ZodNumber).max(prop.maximum)
    if (!schema.required?.includes(key)) field = field.optional()
    shape[key] = field
  }
  return z.object(shape)
}

function buildDefaults(schema: InputSchema): ActorInput {
  return Object.fromEntries(
    Object.entries(schema.properties)
      .filter(([, p]) => p.default !== undefined)
      .map(([k, p]) => [k, p.default])
  )
}

function FieldControl({
  prop, fieldValue, onChange,
}: { prop: InputSchemaProperty; fieldValue: unknown; onChange: (v: unknown) => void }) {
  switch (prop.editor) {
    case 'textarea':
      return (
        <Textarea
          value={String(fieldValue ?? '')}
          onChange={e => onChange(e.target.value)}
          className="min-h-[80px] resize-y"
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          value={String(fieldValue ?? '')}
          min={prop.minimum}
          max={prop.maximum}
          onChange={e => onChange(Number(e.target.value))}
        />
      )
    case 'checkbox':
      return <Switch checked={Boolean(fieldValue)} onCheckedChange={onChange} />
    case 'select':
      return (
        <Select value={String(fieldValue ?? '')} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {prop.enum?.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      )
    default:
      return (
        <Input
          type="text"
          value={String(fieldValue ?? '')}
          onChange={e => onChange(e.target.value)}
        />
      )
  }
}

export function ActorForm({ schema, defaultValues, onSubmit, loading }: Props) {
  const form = useForm({
    resolver:      zodResolver(buildZodSchema(schema)),
    defaultValues: (defaultValues ?? buildDefaults(schema)) as any,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-5">
        {Object.entries(schema.properties).map(([key, prop]) => (
          <FormField
            key={key}
            control={form.control}
            name={key as any}
            render={({ field }) => (
              <FormItem className={prop.editor === 'checkbox' ? 'flex items-center gap-3 space-y-0' : ''}>
                <FormLabel>
                  {prop.title}
                  {schema.required?.includes(key) && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </FormLabel>
                <FormControl>
                  <FieldControl prop={prop} fieldValue={field.value} onChange={field.onChange} />
                </FormControl>
                {prop.description && <FormDescription>{prop.description}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Running…' : '▶ Run Actor'}
        </Button>
      </form>
    </Form>
  )
}
```

---

## 13. Config Files

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "paths": { "@shared/*": ["src/shared/*"] }
  }
}
```

```json
// tsconfig.main.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "outDir": "dist/main",
    "rootDir": "src"
  },
  "include": ["src/main/**/*", "src/shared/**/*", "src/renderer/preload.ts"]
}
```

```json
// tsconfig.renderer.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "outDir": "dist/renderer"
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'src/shared') },
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
})
```

---

## 14. package.json

```json
{
  "name": "MMO Claw",
  "version": "0.1.0",
  "main": "dist/main/main/index.js",
  "scripts": {
    "dev":            "concurrently \"tsc -p tsconfig.main.json -w\" \"vite\" \"wait-on tcp:5173 && electron .\"",
    "build:main":     "tsc -p tsconfig.main.json",
    "build:renderer": "vite build",
    "build":          "npm run build:main && npm run build:renderer && electron-builder",
    "typecheck":      "tsc --noEmit -p tsconfig.main.json && tsc --noEmit -p tsconfig.renderer.json"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "express":        "^4.18.2",
    "fs-extra":       "^11.2.0",
    "node-cron":      "^3.0.3",
    "uuid":           "^9.0.1"
  },
  "devDependencies": {
    "@hookform/resolvers":           "^3.3.4",
    "@radix-ui/react-dialog":        "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label":         "^2.0.2",
    "@radix-ui/react-progress":      "^1.0.3",
    "@radix-ui/react-scroll-area":   "^1.0.5",
    "@radix-ui/react-select":        "^2.0.0",
    "@radix-ui/react-separator":     "^1.0.3",
    "@radix-ui/react-slot":          "^1.0.2",
    "@radix-ui/react-switch":        "^1.0.3",
    "@radix-ui/react-tabs":          "^1.0.4",
    "@radix-ui/react-toast":         "^1.1.5",
    "@radix-ui/react-tooltip":       "^1.0.7",
    "@tanstack/react-query":         "^5.28.0",
    "@types/better-sqlite3":         "^7.6.8",
    "@types/fs-extra":               "^11.0.4",
    "@types/node":                   "^20.0.0",
    "@types/node-cron":              "^3.0.11",
    "@types/react":                  "^18.2.0",
    "@types/react-dom":              "^18.2.0",
    "@types/uuid":                   "^9.0.7",
    "@vitejs/plugin-react":          "^4.2.1",
    "class-variance-authority":      "^0.7.0",
    "clsx":                          "^2.1.0",
    "cmdk":                          "^1.0.0",
    "concurrently":                  "^8.2.2",
    "electron":                      "^29.0.0",
    "electron-builder":              "^24.9.1",
    "lucide-react":                  "^0.363.0",
    "react":                         "^18.2.0",
    "react-dom":                     "^18.2.0",
    "react-hook-form":               "^7.51.0",
    "tailwind-merge":                "^2.2.2",
    "tailwindcss":                   "^3.4.1",
    "tailwindcss-animate":           "^1.0.7",
    "typescript":                    "^5.4.3",
    "vite":                          "^5.2.0",
    "wait-on":                       "^7.2.0",
    "zod":                           "^3.22.4",
    "zustand":                       "^4.5.0"
  }
}
```

---

## 15. Coding Rules for AI

1. **Never edit `vendor/`** — git submodules, read-only
2. **Never hand-edit `components/ui/`** — shadcn generated files, re-run CLI to update
3. **Define `src/shared/ipc.types.ts` FIRST** — before any main or renderer code
4. **Renderer imports only from `src/shared/` and `src/renderer/`** — never from `src/main/`
5. **Main imports only from `src/shared/` and `src/main/`** — never from `src/renderer/`
6. **All IPC calls in renderer go through `src/renderer/ipc.ts`** — never `window.electron` directly
7. **All `ipcMain.handle()` calls in `src/main/ipc.ts`** — never inline in index.ts
8. **All file writes go through `workspace.resolve()`** — path jail enforced
9. **One SQLite DB per workspace** — `workspace.db`, never shared
10. **uv binary path always via `getUvBin()`** — never hardcode
11. **Actor stdout must prefix `[CLAW:LEVEL] message`** — parsed by actorRunner for typed events
12. **New IPC channel → update `ipc.types.ts` first**, then main handler, then renderer caller
13. **Crawlee is the only browser automation lib in actors** — not raw Playwright
14. **Python actors use PEP 723 inline deps** — no requirements.txt, no setup.py
15. **No Redux** — Zustand for UI state, TanStack Query for server/IPC state
16. **Always use shadcn components** — `Button` not `<button>`, `Input` not `<input>`, etc.
17. **Use `cn()` for all conditional classes** — never string template literals for class merging
18. **shadcn imports use `@/` alias** — `import { Button } from '@/components/ui/button'`
19. **Dark mode default** — set `<html className="dark">` in `main.tsx`, theme token via CSS vars
20. **`npm run typecheck` must pass with zero errors** before any commit

---

## 16. Build Phase Order

### Phase 1 — Foundation (no features, just working shell)

- [ ] All `src/shared/*.ts` type files
- [ ] `src/renderer/preload.ts` + contextBridge
- [ ] `src/main/workspace.ts` + `workspaceManager.ts`
- [ ] `src/main/ipc.ts` with stub handlers returning empty arrays
- [ ] `src/main/index.ts` — BrowserWindow loads Vite dev server
- [ ] `src/renderer/globals.css` — Tailwind + shadcn CSS variables
- [ ] `src/renderer/lib/utils.ts` — `cn()` helper
- [ ] Run `npx shadcn@latest init` + add all components (see Section 4)
- [ ] `src/renderer/main.tsx` + `App.tsx` — empty shell with `<html className="dark">`
- [ ] ✅ `npm run typecheck` — zero errors. App opens with dark background.

### Phase 2 — Queue + Runner

- [ ] `src/main/queueEngine.ts`
- [ ] `src/main/actorRunner.ts` + `getUvBin()`
- [ ] `actors/_template/main.py` — PEP 723 hello world
- [ ] Wire queue IPC handlers in `ipc.ts`
- [ ] ✅ Enqueue template actor → runs → `[CLAW:INFO]` lines appear

### Phase 3 — Actor Registry + Store UI

- [ ] `src/main/actorRegistry.ts`
- [ ] `src/renderer/hooks/useActors.ts`
- [ ] `src/renderer/pages/Store.tsx`
- [ ] `src/renderer/components/ActorForm.tsx`
- [ ] ✅ Install actor from GitHub URL → form renders from INPUT_SCHEMA.json → run it

### Phase 4 — Dashboard

- [ ] `src/renderer/hooks/useQueue.ts` + `useLogs.ts`
- [ ] `src/renderer/pages/Dashboard.tsx`
- [ ] `src/renderer/components/QueueTable.tsx` + `LogViewer.tsx`
- [ ] ✅ Live log stream, queue status, kill button

### Phase 5 — Scheduler

- [ ] `src/main/scheduler.ts`
- [ ] Schedule IPC handlers
- [ ] `src/renderer/pages/Scheduler.tsx`
- [ ] ✅ Cron schedule fires actor at correct time

### Phase 6 — Telegram Gateway

- [ ] `src/main/gateway.ts` — Express REST API + sidecar spawn
- [ ] `bridge/gateway_bridge.py` — PocketPaw bus ↔ MMO Claw REST
- [ ] Settings UI for Telegram token + user ID
- [ ] ✅ `/status` from Telegram returns workspace summary

### Phase 7 — Social Actors

- [ ] `actors/tiktok-poster/`
- [ ] `actors/instagram-uploader/`
- [ ] Asset pipeline (pending → processing → done)
- [ ] Account + proxy injection from workspace DB

### Phase 8 — Security + Ship

- [ ] `src/main/accountVault.ts` — AES-256
- [ ] `src/main/proxyManager.ts`
- [ ] electron-builder cross-platform config
- [ ] ✅ `npm run build` produces installers for Mac/Win/Linux
