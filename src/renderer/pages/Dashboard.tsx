import { useState } from 'react'
import { LogViewer } from '../components/LogViewer'
import { QueueTable } from '../components/QueueTable'
import { useActors } from '../hooks/useActors'
import { useLogs } from '../hooks/useLogs'
import { useQueue } from '../hooks/useQueue'

interface DashboardProps {
  workspaceId: string
}

export function Dashboard({ workspaceId }: DashboardProps) {
  const queue = useQueue(workspaceId)
  const logs = useLogs(workspaceId)
  const { actors } = useActors()
  const [actorName, setActorName] = useState('mmo-farmer')
  const [inputJson, setInputJson] = useState('{"mode":"quick"}')
  const [status, setStatus] = useState('')

  async function handleEnqueue() {
    if (!workspaceId) {
      setStatus('Select workspace first')
      return
    }

    let input: Record<string, unknown> = {}
    try {
      input = inputJson.trim() ? (JSON.parse(inputJson) as Record<string, unknown>) : {}
    } catch {
      setStatus('Input JSON is invalid')
      return
    }

    try {
      const taskId = await queue.enqueue(actorName, input)
      setStatus(`Task enqueued: ${taskId}`)
    } catch (error) {
      setStatus(formatError(error, 'Failed to enqueue'))
    }
  }

  return (
    <section className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-medium">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Live queue status and actor logs for selected workspace.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Actor</span>
            <input
              value={actorName}
              onChange={(event) => setActorName(event.target.value)}
              list="actor-list"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <datalist id="actor-list">
              {actors.map((actor) => (
                <option key={actor.name} value={actor.name} />
              ))}
            </datalist>
          </label>

          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Input JSON</span>
            <input
              value={inputJson}
              onChange={(event) => setInputJson(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleEnqueue()}
            disabled={!workspaceId}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enqueue
          </button>
          <button
            type="button"
            onClick={() => void queue.killAll()}
            disabled={!workspaceId}
            className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Kill all
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Queue</h3>
          <button
            type="button"
            onClick={() => void queue.refresh()}
            className="rounded-md border border-border px-2 py-1 text-xs transition hover:bg-accent"
          >
            Refresh
          </button>
        </div>
        <QueueTable tasks={queue.tasks} onKill={(taskId) => void queue.kill(taskId)} />
      </section>

      <LogViewer lines={logs.lines} onClear={logs.clear} />

      <footer className="rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-muted-foreground">
        {queue.error || status || (queue.loading ? 'Loading queue...' : 'Ready')}
      </footer>
    </section>
  )
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
