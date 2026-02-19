import { v4 as uuid } from 'uuid'
import type { ActorInput } from '../shared/actor.types'
import type { Task, TaskStatus } from '../shared/workspace.types'
import type { Workspace } from './workspace'
import type { WorkspaceManager } from './workspaceManager'

type TaskRow = {
  id: string
  actor: string
  status: TaskStatus
  input: string | null
  output: string | null
  error: string | null
  attempts: number
  max_attempts: number
  priority: number
  run_at: number
  started_at: number | null
  finished_at: number | null
  created_at: number
}

export interface EnqueueTaskInput {
  wsId: string
  actor: string
  input: ActorInput
  priority?: number
  runAt?: number
  maxAttempts?: number
}

export class QueueEngine {
  constructor(private readonly workspaceManager: WorkspaceManager) {}

  enqueue(payload: EnqueueTaskInput): string {
    const ws = this.requireWorkspace(payload.wsId)
    const taskId = uuid()
    const now = Date.now()
    const runAt = payload.runAt ?? now
    const maxAttempts = Math.max(1, payload.maxAttempts ?? 3)
    const inputJson = safeJsonStringify(payload.input)

    ws.db
      .prepare(
        `
        INSERT INTO tasks (
          id, actor, status, input, attempts, max_attempts, priority, run_at, created_at
        ) VALUES (?, ?, 'pending', ?, 0, ?, ?, ?, ?)
      `
      )
      .run(taskId, payload.actor, inputJson, maxAttempts, payload.priority ?? 0, runAt, now)

    return taskId
  }

  list(wsId: string, status?: TaskStatus): Task[] {
    const ws = this.requireWorkspace(wsId)
    const rows = status
      ? (ws.db
          .prepare(
            `
            SELECT
              id, actor, status, input, output, error, attempts, max_attempts,
              priority, run_at, started_at, finished_at, created_at
            FROM tasks
            WHERE status = ?
            ORDER BY created_at DESC
          `
          )
          .all(status) as TaskRow[])
      : (ws.db
          .prepare(
            `
            SELECT
              id, actor, status, input, output, error, attempts, max_attempts,
              priority, run_at, started_at, finished_at, created_at
            FROM tasks
            ORDER BY created_at DESC
          `
          )
          .all() as TaskRow[])

    return rows.map(mapTaskRow)
  }

  nextPending(wsId: string): Task | null {
    const ws = this.requireWorkspace(wsId)
    const row = ws.db
      .prepare(
        `
        SELECT
          id, actor, status, input, output, error, attempts, max_attempts,
          priority, run_at, started_at, finished_at, created_at
        FROM tasks
        WHERE status = 'pending' AND run_at <= ?
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `
      )
      .get(Date.now()) as TaskRow | undefined

    return row ? mapTaskRow(row) : null
  }

  markRunning(wsId: string, taskId: string): void {
    const ws = this.requireWorkspace(wsId)
    ws.db
      .prepare(
        `
        UPDATE tasks
        SET status = 'running', started_at = ?, attempts = attempts + 1
        WHERE id = ? AND status = 'pending'
      `
      )
      .run(Date.now(), taskId)
  }

  markDone(wsId: string, taskId: string, output?: unknown): void {
    const ws = this.requireWorkspace(wsId)
    ws.db
      .prepare(
        `
        UPDATE tasks
        SET status = 'done', output = ?, error = NULL, finished_at = ?
        WHERE id = ?
      `
      )
      .run(output === undefined ? null : safeJsonStringify(output), Date.now(), taskId)
  }

  markFailed(wsId: string, taskId: string, error: string): void {
    const ws = this.requireWorkspace(wsId)
    ws.db
      .prepare(
        `
        UPDATE tasks
        SET status = 'failed', error = ?, finished_at = ?
        WHERE id = ?
      `
      )
      .run(error, Date.now(), taskId)
  }

  kill(wsId: string, taskId: string): boolean {
    const ws = this.requireWorkspace(wsId)
    const result = ws.db
      .prepare(
        `
        UPDATE tasks
        SET status = 'cancelled', finished_at = ?
        WHERE id = ? AND status IN ('pending', 'running')
      `
      )
      .run(Date.now(), taskId)

    return result.changes > 0
  }

  killAll(wsId: string): void {
    const ws = this.requireWorkspace(wsId)
    ws.db
      .prepare(
        `
        UPDATE tasks
        SET status = 'cancelled', finished_at = ?
        WHERE status IN ('pending', 'running')
      `
      )
      .run(Date.now())
  }

  countRunning(wsId: string): number {
    const ws = this.requireWorkspace(wsId)
    const row = ws.db
      .prepare(`SELECT COUNT(*) as total FROM tasks WHERE status = 'running'`)
      .get() as { total: number } | undefined
    return row?.total ?? 0
  }

  workspaceSummary(): Array<{
    id: string
    name: string
    pending: number
    running: number
    failed: number
    done: number
  }> {
    return this.workspaceManager.listLoaded().map((ws) => {
      const counts = this.countByStatus(ws)
      return {
        id: ws.id,
        name: ws.name,
        pending: counts.pending,
        running: counts.running,
        failed: counts.failed,
        done: counts.done,
      }
    })
  }

  private countByStatus(ws: Workspace): Record<'pending' | 'running' | 'failed' | 'done', number> {
    const rows = ws.db
      .prepare(`SELECT status, COUNT(*) as total FROM tasks GROUP BY status`)
      .all() as Array<{ status: TaskStatus; total: number }>

    const counts: Record<'pending' | 'running' | 'failed' | 'done', number> = {
      pending: 0,
      running: 0,
      failed: 0,
      done: 0,
    }

    for (const row of rows) {
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = row.total
      }
    }

    return counts
  }

  private requireWorkspace(wsId: string) {
    const ws = this.workspaceManager.getLoaded(wsId)
    if (!ws) {
      throw new Error(`Workspace not found: ${wsId}`)
    }
    return ws
  }
}

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    actor: row.actor,
    status: row.status,
    input: row.input ?? undefined,
    output: row.output ?? undefined,
    error: row.error ?? undefined,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    priority: row.priority,
    runAt: row.run_at,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    createdAt: row.created_at,
  }
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return '{}'
  }
}
