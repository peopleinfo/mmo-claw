import { useCallback, useEffect, useState } from 'react'
import type { ScheduledJob } from '../../shared/ipc.types'
import { scheduleIpc } from '../ipc'
import { useActors } from '../hooks/useActors'

interface SchedulerProps {
  workspaceId: string
}

export function Scheduler({ workspaceId }: SchedulerProps) {
  const { actors } = useActors()
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [actor, setActor] = useState('')
  const [cronExpr, setCronExpr] = useState('*/5 * * * *')
  const [inputJson, setInputJson] = useState('{}')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const next = await scheduleIpc.list()
      setJobs(next)
    } catch (error) {
      setStatus(formatError(error, 'Failed to load schedules'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setActor((prev) => prev || actors[0]?.name || '')
  }, [actors])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  async function handleAdd() {
    if (!workspaceId) {
      setStatus('Select workspace first')
      return
    }
    if (!actor.trim()) {
      setStatus('Actor is required')
      return
    }
    if (!cronExpr.trim()) {
      setStatus('Cron expression is required')
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
      await scheduleIpc.add({
        workspaceId,
        actor: actor.trim(),
        cronExpr: cronExpr.trim(),
        input,
      })
      setStatus('Schedule added')
      await loadJobs()
    } catch (error) {
      setStatus(formatError(error, 'Failed to create schedule'))
    }
  }

  async function handleRemove(jobId: string) {
    try {
      await scheduleIpc.remove(jobId)
      await loadJobs()
      setStatus('Schedule removed')
    } catch (error) {
      setStatus(formatError(error, 'Failed to remove schedule'))
    }
  }

  return (
    <section className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-medium">Scheduler</h2>
        <p className="mt-1 text-sm text-muted-foreground">Set cron schedules to auto-enqueue actor runs.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Actor</span>
            <select
              value={actor}
              onChange={(event) => setActor(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select actor</option>
              {actors.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Cron</span>
            <input
              value={cronExpr}
              onChange={(event) => setCronExpr(event.target.value)}
              placeholder="*/5 * * * *"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Input JSON</span>
            <input
              value={inputJson}
              onChange={(event) => setInputJson(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={!workspaceId}
          className="mt-3 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add schedule
        </button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Scheduled Jobs</h3>
          <button
            type="button"
            onClick={() => void loadJobs()}
            className="rounded-md border border-border px-2 py-1 text-xs transition hover:bg-accent"
          >
            Refresh
          </button>
        </div>

        {jobs.length === 0 && (
          <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            No jobs scheduled.
          </div>
        )}

        {jobs.length > 0 && (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.id} className="rounded-md border border-border px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{job.actor}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.cronExpr} | ws: {job.workspaceId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      next: {job.nextRun ? new Date(job.nextRun).toLocaleString() : '-'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemove(job.id)}
                    className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-muted-foreground">
        {loading ? 'Loading schedules...' : status || 'Ready'}
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
