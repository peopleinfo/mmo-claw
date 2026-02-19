import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import os from 'os'
import path from 'path'
import type { Actor } from '../shared/actor.types'
import { IPC, type IpcEventMap, type LogLevel } from '../shared/ipc.types'
import type { Task } from '../shared/workspace.types'
import type { ActorRegistry } from './actorRegistry'
import type { QueueEngine } from './queueEngine'
import type { WorkspaceManager } from './workspaceManager'

interface RunnerDeps {
  workspaceManager: WorkspaceManager
  actorRegistry: ActorRegistry
  queueEngine: QueueEngine
  getMaxConcurrent: () => number
  emit: <C extends keyof IpcEventMap>(channel: C, payload: IpcEventMap[C]) => void
}

type RunningTask = {
  taskId: string
  child: ChildProcessWithoutNullStreams
}

type AssetRow = {
  id: string
  filepath: string
  platform: string | null
  caption: string | null
  hashtags: string | null
}

type AccountRow = {
  id: string
  platform: string
  username: string | null
  proxy: string | null
}

export class ActorRunner {
  private readonly running = new Map<string, Map<string, RunningTask>>()
  private pollTimer: NodeJS.Timeout | null = null

  constructor(private readonly deps: RunnerDeps) {}

  start() {
    if (this.pollTimer) {
      return
    }
    this.pollTimer = setInterval(() => this.tickAll(), 1500)
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    for (const [wsId, tasks] of this.running.entries()) {
      for (const runningTask of tasks.values()) {
        runningTask.child.kill()
      }
      this.running.delete(wsId)
    }
  }

  kick(wsId: string) {
    void this.drainWorkspace(wsId)
  }

  isRunning(wsId: string, taskId: string): boolean {
    return this.running.get(wsId)?.has(taskId) ?? false
  }

  kill(wsId: string, taskId: string): boolean {
    const task = this.running.get(wsId)?.get(taskId)
    if (!task) {
      return false
    }
    task.child.kill()
    return true
  }

  killAll(wsId: string): void {
    const tasks = this.running.get(wsId)
    if (!tasks) {
      return
    }
    for (const task of tasks.values()) {
      task.child.kill()
    }
  }

  private tickAll() {
    for (const ws of this.deps.workspaceManager.listLoaded()) {
      void this.drainWorkspace(ws.id)
    }
  }

  private async drainWorkspace(wsId: string): Promise<void> {
    const ws = this.deps.workspaceManager.getLoaded(wsId)
    if (!ws) {
      return
    }

    const maxConcurrent = Math.max(1, this.deps.getMaxConcurrent())
    const runningCount = this.running.get(wsId)?.size ?? 0
    if (runningCount >= maxConcurrent) {
      return
    }

    const task = this.deps.queueEngine.nextPending(wsId)
    if (!task) {
      return
    }

    this.deps.queueEngine.markRunning(wsId, task.id)
    this.runTask(wsId, task)
  }

  private runTask(wsId: string, task: Task) {
    const ws = this.deps.workspaceManager.getLoaded(wsId)
    const actor = this.deps.actorRegistry.get(task.actor)
    if (!ws || !actor) {
      this.deps.queueEngine.markFailed(wsId, task.id, `Actor not found: ${task.actor}`)
      this.deps.emit(IPC.EVENT_ACTOR_FAILED, { wsId, taskId: task.id, error: `Actor not found: ${task.actor}` })
      this.deps.emit(IPC.EVENT_QUEUE_UPDATE, { wsId })
      return
    }

    const runner = buildRunnerCommand(actor)
    const account = this.pickAccount(wsId, actor)
    const asset = this.claimAsset(wsId, actor)
    const env = {
      ...process.env,
      CLAW_WORKSPACE_ID: wsId,
      CLAW_WORKSPACE_ROOT: ws.root,
      CLAW_TASK_ID: task.id,
      CLAW_INPUT: task.input ?? '{}',
      CLAW_PROXY: account?.proxy ?? '',
      CLAW_ACCOUNT_ID: account?.id ?? '',
      CLAW_ACCOUNT_PLATFORM: account?.platform ?? '',
      CLAW_ACCOUNT_USERNAME: account?.username ?? '',
      CLAW_ASSET_ID: asset?.id ?? '',
      CLAW_ASSET_PATH: asset?.filepath ?? '',
      CLAW_ASSET_CAPTION: asset?.caption ?? '',
      CLAW_ASSET_HASHTAGS: asset?.hashtags ?? '',
    }

    const child = spawn(runner.bin, runner.args, {
      cwd: actor.dir,
      env,
      shell: false,
      windowsHide: true,
    })

    this.registerRunning(wsId, task.id, child)
    this.deps.emit(IPC.EVENT_ACTOR_STARTED, { wsId, taskId: task.id, actor: actor.name })
    this.deps.emit(IPC.EVENT_QUEUE_UPDATE, { wsId })

    child.stdout.on('data', (chunk) => {
      this.emitOutput(wsId, task.id, String(chunk))
    })
    child.stderr.on('data', (chunk) => {
      this.emitOutput(wsId, task.id, String(chunk), 'error')
    })
    child.on('error', (error) => {
      this.deps.queueEngine.markFailed(wsId, task.id, error.message)
      this.markAssetFailed(wsId, asset?.id)
      this.deps.emit(IPC.EVENT_ACTOR_FAILED, { wsId, taskId: task.id, error: error.message })
      this.finishTask(wsId, task.id)
    })
    child.on('close', (code) => {
      if (code === 0) {
        this.deps.queueEngine.markDone(wsId, task.id, { code })
        this.markAssetDone(wsId, asset?.id, task.id)
        this.deps.emit(IPC.EVENT_ACTOR_DONE, { wsId, taskId: task.id, output: { code } })
      } else {
        const message = `Actor exited with code ${code ?? -1}`
        this.deps.queueEngine.markFailed(wsId, task.id, message)
        this.markAssetFailed(wsId, asset?.id)
        this.deps.emit(IPC.EVENT_ACTOR_FAILED, { wsId, taskId: task.id, error: message })
      }
      this.finishTask(wsId, task.id)
    })
  }

  private finishTask(wsId: string, taskId: string) {
    const tasks = this.running.get(wsId)
    tasks?.delete(taskId)
    if (tasks && tasks.size === 0) {
      this.running.delete(wsId)
    }
    this.deps.emit(IPC.EVENT_QUEUE_UPDATE, { wsId })
    void this.drainWorkspace(wsId)
  }

  private registerRunning(wsId: string, taskId: string, child: ChildProcessWithoutNullStreams) {
    const existing = this.running.get(wsId) ?? new Map<string, RunningTask>()
    existing.set(taskId, { taskId, child })
    this.running.set(wsId, existing)
  }

  private emitOutput(wsId: string, taskId: string, value: string, fallback: LogLevel = 'info') {
    const lines = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    for (const line of lines) {
      const parsed = parseClawLog(line)
      this.deps.emit(IPC.EVENT_ACTOR_LOG, {
        wsId,
        taskId,
        level: parsed?.level ?? fallback,
        message: parsed?.message ?? line,
        ts: Date.now(),
      })
    }
  }

  private pickAccount(wsId: string, actor: Actor): AccountRow | null {
    const ws = this.deps.workspaceManager.getLoaded(wsId)
    if (!ws) {
      return null
    }

    const platform = inferPlatform(actor.name)
    const account = ws.db
      .prepare(
        `
        SELECT id, platform, username, proxy
        FROM accounts
        WHERE status = 'active' AND (? IS NULL OR platform = ?)
        ORDER BY COALESCE(last_used, 0) ASC, created_at ASC
        LIMIT 1
      `
      )
      .get(platform, platform) as AccountRow | undefined

    if (!account) {
      return null
    }

    ws.db.prepare(`UPDATE accounts SET last_used = ? WHERE id = ?`).run(Date.now(), account.id)
    this.deps.emit(IPC.EVENT_ACTOR_LOG, {
      wsId,
      taskId: '',
      level: 'debug',
      message: `Using account ${account.username ?? account.id} for ${platform ?? 'generic'} actor`,
      ts: Date.now(),
    })

    return account
  }

  private claimAsset(wsId: string, actor: Actor): AssetRow | null {
    const ws = this.deps.workspaceManager.getLoaded(wsId)
    if (!ws) {
      return null
    }

    const platform = inferPlatform(actor.name)
    const asset = ws.db
      .prepare(
        `
        SELECT id, filepath, platform, caption, hashtags
        FROM assets
        WHERE status = 'pending' AND (? IS NULL OR platform = ?)
        ORDER BY COALESCE(scheduled_at, created_at) ASC
        LIMIT 1
      `
      )
      .get(platform, platform) as AssetRow | undefined

    if (!asset) {
      return null
    }

    ws.db
      .prepare(`UPDATE assets SET status = 'processing' WHERE id = ? AND status = 'pending'`)
      .run(asset.id)
    return asset
  }

  private markAssetDone(wsId: string, assetId: string | undefined, taskId: string): void {
    if (!assetId) {
      return
    }
    const ws = this.deps.workspaceManager.getLoaded(wsId)
    if (!ws) {
      return
    }
    ws.db
      .prepare(`UPDATE assets SET status = 'done', posted_at = ?, task_id = ? WHERE id = ?`)
      .run(Date.now(), taskId, assetId)
  }

  private markAssetFailed(wsId: string, assetId: string | undefined): void {
    if (!assetId) {
      return
    }
    const ws = this.deps.workspaceManager.getLoaded(wsId)
    if (!ws) {
      return
    }
    ws.db.prepare(`UPDATE assets SET status = 'failed' WHERE id = ?`).run(assetId)
  }
}

function buildRunnerCommand(actor: Actor): { bin: string; args: string[] } {
  if (actor.runtime === 'python') {
    return {
      bin: getUvBin(),
      args: ['run', path.basename(actor.entrypoint)],
    }
  }

  return {
    bin: process.execPath,
    args: [path.basename(actor.entrypoint)],
  }
}

export function getUvBin(): string {
  const fromEnv = process.env.UV_BIN?.trim()
  if (fromEnv) {
    return fromEnv
  }
  return os.platform() === 'win32' ? 'uv.exe' : 'uv'
}

function parseClawLog(line: string): { level: LogLevel; message: string } | null {
  const match = line.match(/^\[CLAW:(INFO|WARN|ERROR|DEBUG)\]\s*(.*)$/)
  if (!match) {
    return null
  }

  return {
    level: match[1].toLowerCase() as LogLevel,
    message: match[2] || '',
  }
}

function inferPlatform(actorName: string): string | null {
  const lowered = actorName.toLowerCase()
  if (lowered.includes('tiktok')) {
    return 'tiktok'
  }
  if (lowered.includes('instagram')) {
    return 'instagram'
  }
  return null
}
