import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppConfig } from '../shared/config.types'
import type { Workspace } from '../shared/workspace.types'
import { GlobalChatDrawer } from './components/GlobalChatDrawer'
import { Dashboard } from './pages/Dashboard'
import { Scheduler } from './pages/Scheduler'
import { Store } from './pages/Store'
import { settingsIpc, workspaceIpc } from './ipc'

type SaveState = 'idle' | 'saving'
type AppTab = 'dashboard' | 'store' | 'scheduler' | 'settings'

export default function App() {
  const [tab, setTab] = useState<AppTab>('dashboard')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceName, setWorkspaceName] = useState('')
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('')
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [status, setStatus] = useState('')
  const [busyWorkspace, setBusyWorkspace] = useState(false)
  const [busySettings, setBusySettings] = useState<SaveState>('idle')
  const [chatOpen, setChatOpen] = useState(false)

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaces]
  )

  const loadWorkspaces = useCallback(async () => {
    setBusyWorkspace(true)
    try {
      const items = await workspaceIpc.list()
      setWorkspaces(items)
      setActiveWorkspaceId((prev) => (prev && items.some((ws) => ws.id === prev) ? prev : items[0]?.id ?? ''))
      setStatus('')
    } catch (error) {
      setStatus(formatError(error, 'Failed to load workspaces'))
    } finally {
      setBusyWorkspace(false)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const nextConfig = await settingsIpc.get()
      setConfig(nextConfig)
    } catch (error) {
      setStatus(formatError(error, 'Failed to load settings'))
    }
  }, [])

  useEffect(() => {
    void Promise.all([loadWorkspaces(), loadSettings()])
  }, [loadSettings, loadWorkspaces])

  useEffect(() => {
    if (!config) {
      return
    }
    document.documentElement.classList.toggle('dark', config.theme === 'dark')
  }, [config])

  async function handleCreateWorkspace() {
    const name = workspaceName.trim()
    if (!name) {
      setStatus('Workspace name is required')
      return
    }

    setBusyWorkspace(true)
    try {
      const created = await workspaceIpc.create(name)
      setWorkspaceName('')
      await loadWorkspaces()
      setActiveWorkspaceId(created.id)
      setStatus(`Workspace "${created.name}" created`)
    } catch (error) {
      setStatus(formatError(error, 'Failed to create workspace'))
    } finally {
      setBusyWorkspace(false)
    }
  }

  async function handleDeleteWorkspace(id: string) {
    setBusyWorkspace(true)
    try {
      await workspaceIpc.delete(id)
      await loadWorkspaces()
      setStatus('Workspace deleted')
    } catch (error) {
      setStatus(formatError(error, 'Failed to delete workspace'))
    } finally {
      setBusyWorkspace(false)
    }
  }

  async function handleSaveSettings() {
    if (!config) {
      return
    }

    setBusySettings('saving')
    try {
      await settingsIpc.set('theme', config.theme)
      await settingsIpc.set('defaultProxy', config.defaultProxy)
      await settingsIpc.set('maxConcurrentActors', Number(config.maxConcurrentActors))
      await settingsIpc.set('telegramBotToken', config.telegramBotToken)
      await settingsIpc.set('telegramAllowedUserId', config.telegramAllowedUserId)
      await loadSettings()
      setStatus('Settings saved')
    } catch (error) {
      setStatus(formatError(error, 'Failed to save settings'))
    } finally {
      setBusySettings('idle')
    }
  }

  async function handleOpenHome() {
    try {
      await settingsIpc.openHome()
      setStatus('Home directory opened')
    } catch (error) {
      setStatus(formatError(error, 'Failed to open home directory'))
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">MMO Claw Control Center</h1>
            <p className="text-sm text-muted-foreground">
              Pinokio-style local runtime for actors, scheduler, PocketPaw bridge, and queue ops.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
            >
              Open Global Chat
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <aside className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold">Workspaces</h2>
            <p className="mt-1 text-xs text-muted-foreground">Select a target workspace for queue and chat.</p>

            <div className="mt-3 flex gap-2">
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Workspace name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                disabled={busyWorkspace}
              />
              <button
                type="button"
                onClick={() => void handleCreateWorkspace()}
                disabled={busyWorkspace}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <div
                    className={`rounded-md border px-3 py-2 ${
                      workspace.id === activeWorkspaceId ? 'border-primary/60 bg-primary/10' : 'border-border'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveWorkspaceId(workspace.id)}
                      className="w-full text-left"
                    >
                      <div className="truncate text-sm font-medium">{workspace.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{workspace.id}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteWorkspace(workspace.id)}
                      className="mt-2 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {workspaces.length === 0 && (
                <li className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  No workspace yet.
                </li>
              )}
            </ul>
          </aside>

          <section className="space-y-4">
            <nav className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
              <TabButton current={tab} value="dashboard" onClick={setTab} />
              <TabButton current={tab} value="store" onClick={setTab} />
              <TabButton current={tab} value="scheduler" onClick={setTab} />
              <TabButton current={tab} value="settings" onClick={setTab} />
              <span className="ml-auto rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                Active: {activeWorkspace?.name ?? 'No workspace'}
              </span>
            </nav>

            {tab === 'dashboard' && <Dashboard workspaceId={activeWorkspaceId} />}
            {tab === 'store' && <Store workspaceId={activeWorkspaceId} />}
            {tab === 'scheduler' && <Scheduler workspaceId={activeWorkspaceId} />}
            {tab === 'settings' && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-medium">Settings</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure runtime defaults and PocketPaw Telegram bridge credentials.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Theme</span>
                    <select
                      value={config?.theme ?? 'dark'}
                      onChange={(event) =>
                        setConfig((prev) => (prev ? { ...prev, theme: event.target.value as AppConfig['theme'] } : prev))
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      disabled={!config}
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Default proxy</span>
                    <input
                      value={config?.defaultProxy ?? ''}
                      onChange={(event) =>
                        setConfig((prev) => (prev ? { ...prev, defaultProxy: event.target.value } : prev))
                      }
                      placeholder="http://127.0.0.1:8080"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      disabled={!config}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Max concurrent actors</span>
                    <input
                      value={config?.maxConcurrentActors ?? 1}
                      type="number"
                      min={1}
                      max={20}
                      onChange={(event) =>
                        setConfig((prev) =>
                          prev ? { ...prev, maxConcurrentActors: clampNumber(Number(event.target.value), 1, 20) } : prev
                        )
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      disabled={!config}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Telegram Bot Token</span>
                    <input
                      value={config?.telegramBotToken ?? ''}
                      onChange={(event) =>
                        setConfig((prev) => (prev ? { ...prev, telegramBotToken: event.target.value } : prev))
                      }
                      placeholder="1234567:AA..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      disabled={!config}
                    />
                  </label>

                  <label className="block space-y-1 md:col-span-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Telegram Allowed User ID</span>
                    <input
                      value={config?.telegramAllowedUserId ?? ''}
                      onChange={(event) =>
                        setConfig((prev) => (prev ? { ...prev, telegramAllowedUserId: event.target.value } : prev))
                      }
                      placeholder="123456789"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      disabled={!config}
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveSettings()}
                    disabled={!config || busySettings === 'saving'}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busySettings === 'saving' ? 'Saving...' : 'Save settings'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleOpenHome()}
                    className="rounded-md border border-border px-3 py-2 text-sm transition hover:bg-accent"
                  >
                    Open home dir
                  </button>
                </div>
              </section>
            )}
          </section>
        </div>

        <footer className="mt-4 rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-muted-foreground">
          {status || 'Ready'}
        </footer>
      </div>

      <GlobalChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        workspaces={workspaces}
        workspaceId={activeWorkspaceId}
        onWorkspaceChange={setActiveWorkspaceId}
      />
    </main>
  )
}

function TabButton({
  current,
  value,
  onClick,
}: {
  current: AppTab
  value: AppTab
  onClick: (value: AppTab) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
        current === value ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'
      }`}
    >
      {labelForTab(value)}
    </button>
  )
}

function labelForTab(value: AppTab): string {
  if (value === 'dashboard') {
    return 'Dashboard'
  }
  if (value === 'store') {
    return 'Store'
  }
  if (value === 'scheduler') {
    return 'Scheduler'
  }
  return 'Settings'
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min
  }
  return Math.min(Math.max(value, min), max)
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
