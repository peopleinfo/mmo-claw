import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Workspace } from '../shared/workspace.types'
import type { AppConfig } from '../shared/config.types'
import { queueIpc, settingsIpc, workspaceIpc } from './ipc'

type SaveState = 'idle' | 'saving'

export default function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceName, setWorkspaceName] = useState('')
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('')
  const [queueActor, setQueueActor] = useState('mmo-farmer')
  const [queueInput, setQueueInput] = useState('{"mode":"quick"}')
  const [queueResult, setQueueResult] = useState('')
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [status, setStatus] = useState('')
  const [busyWorkspace, setBusyWorkspace] = useState(false)
  const [busySettings, setBusySettings] = useState<SaveState>('idle')

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  )

  const loadWorkspaces = useCallback(async () => {
    setBusyWorkspace(true)
    try {
      const items = await workspaceIpc.list()
      setWorkspaces(items)
      setActiveWorkspaceId((prev) => {
        if (prev && items.some((workspace) => workspace.id === prev)) {
          return prev
        }
        return items[0]?.id ?? ''
      })
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
      setStatus('Workspace name is required.')
      return
    }

    setBusyWorkspace(true)
    try {
      const created = await workspaceIpc.create(name)
      setWorkspaceName('')
      await loadWorkspaces()
      setActiveWorkspaceId(created.id)
      setStatus(`Workspace "${created.name}" created.`)
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
      setQueueResult('')
      setStatus('Workspace deleted.')
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
      await loadSettings()
      setStatus('Settings saved.')
    } catch (error) {
      setStatus(formatError(error, 'Failed to save settings'))
    } finally {
      setBusySettings('idle')
    }
  }

  async function handleOpenHome() {
    try {
      await settingsIpc.openHome()
      setStatus('Home directory opened.')
    } catch (error) {
      setStatus(formatError(error, 'Failed to open home directory'))
    }
  }

  async function handleEnqueue() {
    if (!activeWorkspaceId) {
      setStatus('Select a workspace first.')
      return
    }

    let payload: Record<string, unknown> = {}
    try {
      payload = queueInput.trim() ? (JSON.parse(queueInput) as Record<string, unknown>) : {}
    } catch {
      setStatus('Queue input must be valid JSON.')
      return
    }

    try {
      const taskId = await queueIpc.enqueue(activeWorkspaceId, queueActor.trim() || 'mmo-farmer', payload)
      setQueueResult(taskId)
      setStatus('Task enqueued.')
    } catch (error) {
      setStatus(formatError(error, 'Failed to enqueue task'))
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <header className="mb-8 space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight" data-testid="app-title">
            MMO Claw
          </h1>
          <p className="text-sm text-muted-foreground">
            Desktop automation shell for MMO tasks, scraping flows, and actor orchestration.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-medium">Workspaces</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create isolated environments for actors and data.</p>

            <div className="mt-4 flex gap-2">
              <input
                data-testid="workspace-name-input"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Workspace name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:opacity-60"
                disabled={busyWorkspace}
              />
              <button
                data-testid="create-workspace-button"
                type="button"
                onClick={handleCreateWorkspace}
                disabled={busyWorkspace}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyWorkspace ? 'Saving...' : 'Create'}
              </button>
            </div>

            <ul data-testid="workspace-list" className="mt-4 space-y-2">
              {workspaces.length === 0 && (
                <li className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  No workspace yet. Create one to start automation.
                </li>
              )}

              {workspaces.map((workspace) => {
                const active = workspace.id === activeWorkspaceId
                return (
                  <li
                    key={workspace.id}
                    data-testid={`workspace-item-${workspace.id}`}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                      active ? 'border-primary/60 bg-primary/10' : 'border-border'
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => setActiveWorkspaceId(workspace.id)}
                    >
                      <div className="truncate text-sm font-medium">{workspace.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{workspace.id}</div>
                    </button>
                    <button
                      data-testid={`delete-workspace-button-${workspace.id}`}
                      type="button"
                      onClick={() => handleDeleteWorkspace(workspace.id)}
                      disabled={busyWorkspace}
                      className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-medium">Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Global defaults for runtime behavior and theme.</p>

            <div className="mt-4 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Theme</span>
                <select
                  data-testid="settings-theme-select"
                  value={config?.theme ?? 'dark'}
                  onChange={(event) =>
                    setConfig((prev) => (prev ? { ...prev, theme: event.target.value as AppConfig['theme'] } : prev))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:opacity-60"
                  disabled={!config}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Max concurrent actors</span>
                <input
                  data-testid="settings-concurrency-input"
                  value={config?.maxConcurrentActors ?? 1}
                  type="number"
                  min={1}
                  max={20}
                  onChange={(event) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            maxConcurrentActors: clampNumber(Number(event.target.value), 1, 20),
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  disabled={!config}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  data-testid="save-settings-button"
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={!config || busySettings === 'saving'}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busySettings === 'saving' ? 'Saving...' : 'Save settings'}
                </button>
                <button
                  data-testid="open-home-button"
                  type="button"
                  onClick={handleOpenHome}
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-accent"
                >
                  Open home dir
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-medium">Quick Task</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enqueue an actor run quickly for active workspace validation and smoke automation checks.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</span>
              <select
                data-testid="enqueue-workspace-select"
                value={activeWorkspace?.id ?? ''}
                onChange={(event) => setActiveWorkspaceId(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {workspaces.length === 0 && <option value="">No workspace</option>}
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Actor name</span>
              <input
                data-testid="enqueue-actor-input"
                value={queueActor}
                onChange={(event) => setQueueActor(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Input JSON</span>
              <input
                data-testid="enqueue-input-json"
                value={queueInput}
                onChange={(event) => setQueueInput(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              data-testid="enqueue-button"
              type="button"
              onClick={handleEnqueue}
              disabled={!activeWorkspaceId}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enqueue actor
            </button>
            {queueResult && (
              <span data-testid="queue-result" className="rounded-md border border-border px-2 py-1 text-xs">
                Task ID: {queueResult}
              </span>
            )}
          </div>
        </section>

        <footer className="mt-6 rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-muted-foreground">
          <span data-testid="status-message">{status || 'Ready'}</span>
        </footer>
      </section>
    </main>
  )
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
