import { v4 as uuid } from 'uuid'
import type { ScheduleAddPayload, ScheduledJob } from '../shared/ipc.types'
import type { QueueEngine } from './queueEngine'

interface SchedulerDeps {
  queueEngine: QueueEngine
  onEnqueued: (wsId: string) => void
}

type StoredJob = ScheduledJob & {
  input: Record<string, unknown>
  runOnce: boolean
}

export class Scheduler {
  private readonly jobs = new Map<string, StoredJob>()
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly deps: SchedulerDeps) {}

  start() {
    if (this.timer) {
      return
    }

    this.timer = setInterval(() => this.tick(), 1000 * 20)
  }

  stop() {
    if (!this.timer) {
      return
    }
    clearInterval(this.timer)
    this.timer = null
  }

  add(payload: ScheduleAddPayload): string {
    const id = uuid()
    const now = Date.now()
    const job: StoredJob = {
      id,
      workspaceId: payload.workspaceId,
      actor: payload.actor,
      cronExpr: payload.cronExpr,
      input: payload.input,
      runOnce: Boolean(payload.runOnce),
      lastRun: undefined,
      nextRun: computeNextRun(now),
    }
    this.jobs.set(id, job)
    return id
  }

  remove(jobId: string): void {
    this.jobs.delete(jobId)
  }

  list(): ScheduledJob[] {
    return [...this.jobs.values()].map(({ input: _input, runOnce: _runOnce, ...job }) => job)
  }

  private tick() {
    const now = Date.now()
    for (const job of this.jobs.values()) {
      if (!shouldRun(job, now)) {
        continue
      }

      this.deps.queueEngine.enqueue({
        wsId: job.workspaceId,
        actor: job.actor,
        input: job.input,
      })
      this.deps.onEnqueued(job.workspaceId)

      job.lastRun = now
      job.nextRun = computeNextRun(now)
      if (job.runOnce) {
        this.jobs.delete(job.id)
      }
    }
  }
}

function shouldRun(job: StoredJob, now: number): boolean {
  if (job.lastRun && now - job.lastRun < 60_000) {
    return false
  }
  return cronMatches(job.cronExpr, new Date(now))
}

function computeNextRun(now: number): number {
  return now + 60_000
}

function cronMatches(expr: string, date: Date): boolean {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) {
    return false
  }

  return (
    matchField(parts[0], date.getMinutes()) &&
    matchField(parts[1], date.getHours()) &&
    matchField(parts[2], date.getDate()) &&
    matchField(parts[3], date.getMonth() + 1) &&
    matchField(parts[4], normalizeWeekday(date.getDay()))
  )
}

function matchField(field: string, value: number): boolean {
  if (field === '*') {
    return true
  }

  return field.split(',').some((segment) => matchSegment(segment.trim(), value))
}

function matchSegment(segment: string, value: number): boolean {
  if (!segment) {
    return false
  }

  if (segment.startsWith('*/')) {
    const step = Number(segment.slice(2))
    return Number.isInteger(step) && step > 0 && value % step === 0
  }

  if (segment.includes('-')) {
    const [minRaw, maxRaw] = segment.split('-', 2)
    const min = Number(minRaw)
    const max = Number(maxRaw)
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      return false
    }
    return value >= min && value <= max
  }

  const single = Number(segment)
  return Number.isInteger(single) && value === single
}

function normalizeWeekday(value: number): number {
  return value === 0 ? 7 : value
}
