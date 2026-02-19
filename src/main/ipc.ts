import { BrowserWindow, ipcMain, shell } from 'electron'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { DEFAULT_CONFIG, type AppConfig } from '../shared/config.types'
import {
  IPC,
  type ChatLoopStartPayload,
  type ChatLoopState,
  type ChatMessage,
  type IpcEventMap,
} from '../shared/ipc.types'
import type { WorkspaceManager } from './workspaceManager'
import { ActorRegistry } from './actorRegistry'
import { ActorRunner } from './actorRunner'
import { GatewayServer } from './gateway'
import { QueueEngine } from './queueEngine'
import { Scheduler } from './scheduler'

export function registerIpcHandlers(deps: {
  workspaceManager: WorkspaceManager
  configPath: string
  appHome: string
}): () => void {
  const { workspaceManager, configPath, appHome } = deps
  let currentConfig = readConfigSync(configPath)
  const configKeys = new Set<keyof AppConfig>(Object.keys(DEFAULT_CONFIG) as Array<keyof AppConfig>)

  const queueEngine = new QueueEngine(workspaceManager)
  const actorRegistry = new ActorRegistry(appHome)
  const chatMessages: ChatMessage[] = []
  let loopTimer: NodeJS.Timeout | null = null
  let lastBusyNoticeTick = 0
  const chatLoopState: ChatLoopState = {
    running: false,
    intervalMs: 15_000,
    tick: 0,
  }

  const emit = <C extends keyof IpcEventMap>(channel: C, payload: IpcEventMap[C]) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(channel, payload)
    }
  }

  const actorRunner = new ActorRunner({
    workspaceManager,
    actorRegistry,
    queueEngine,
    getMaxConcurrent: () => currentConfig.maxConcurrentActors,
    emit,
  })
  actorRunner.start()

  const scheduler = new Scheduler({
    queueEngine,
    onEnqueued: (wsId) => {
      emit(IPC.EVENT_QUEUE_UPDATE, { wsId })
      actorRunner.kick(wsId)
    },
  })
  scheduler.start()

  const gateway = new GatewayServer({
    appHome,
    bridgeScriptPath: path.join(process.cwd(), 'bridge', 'gateway_bridge.py'),
    getStatus: () => ({
      workspaces: workspaceManager.list().map((workspace) => ({ id: workspace.id, name: workspace.name })),
      queue: queueEngine.workspaceSummary(),
      schedulerJobs: scheduler.list(),
      loop: getLoopState(),
    }),
    onChatMessage: async (message, wsId) => {
      return processChatMessage(message, wsId, 'gateway').message
    },
  })
  void gateway.start().then(() => updateGatewayConfig())

  function updateGatewayConfig() {
    gateway.updateConfig({
      enabled: true,
      token: currentConfig.telegramBotToken,
      allowedUserId: currentConfig.telegramAllowedUserId,
    })
  }

  function appendChatMessage(message: Omit<ChatMessage, 'id' | 'ts'>): ChatMessage {
    const saved: ChatMessage = {
      id: uuid(),
      ts: Date.now(),
      ...message,
    }
    chatMessages.push(saved)
    if (chatMessages.length > 300) {
      chatMessages.splice(0, chatMessages.length - 300)
    }
    emit(IPC.EVENT_CHAT_MESSAGE, saved)
    return saved
  }

  function appendAssistantReply(replyText: string, wsId?: string): ChatMessage {
    return appendChatMessage({
      source: 'assistant',
      message: replyText,
      wsId,
    })
  }

  function emitLoopState() {
    emit(IPC.EVENT_CHAT_LOOP_STATE, getLoopState())
  }

  function getLoopState(): ChatLoopState {
    return {
      running: chatLoopState.running,
      wsId: chatLoopState.wsId,
      objective: chatLoopState.objective,
      intervalMs: chatLoopState.intervalMs,
      tick: chatLoopState.tick,
      lastTickAt: chatLoopState.lastTickAt,
    }
  }

  function startLoop(payload: ChatLoopStartPayload): ChatLoopState {
    const wsId = optionalString(payload.wsId, 'wsId') ?? chatLoopState.wsId
    if (wsId && !workspaceManager.getLoaded(wsId)) {
      throw new Error(`Workspace not found: ${wsId}`)
    }

    const nextInterval = clampNumber(optionalNumber(payload.intervalMs) ?? chatLoopState.intervalMs, 4_000, 120_000)
    const objective = optionalString(payload.objective, 'objective') ?? chatLoopState.objective

    stopLoop(undefined, false)
    chatLoopState.running = true
    chatLoopState.wsId = wsId
    chatLoopState.objective = objective
    chatLoopState.intervalMs = nextInterval
    chatLoopState.tick = 0
    chatLoopState.lastTickAt = undefined
    lastBusyNoticeTick = 0

    appendChatMessage({
      source: 'gateway',
      wsId,
      message: `PocketPaw loop started (${Math.floor(nextInterval / 1000)}s cadence)${objective ? ` objective="${objective}"` : ''}.`,
    })
    emitLoopState()

    void runLoopTick()
    loopTimer = setInterval(() => {
      void runLoopTick()
    }, chatLoopState.intervalMs)

    return getLoopState()
  }

  function stopLoop(reason?: string, announce = true): ChatLoopState {
    if (loopTimer) {
      clearInterval(loopTimer)
      loopTimer = null
    }

    const wasRunning = chatLoopState.running
    chatLoopState.running = false
    chatLoopState.lastTickAt = Date.now()
    emitLoopState()

    if (announce && wasRunning) {
      appendChatMessage({
        source: 'gateway',
        wsId: chatLoopState.wsId,
        message: reason ?? 'PocketPaw loop stopped.',
      })
    }

    return getLoopState()
  }

  async function runLoopTick() {
    if (!chatLoopState.running) {
      return
    }

    const wsId = chatLoopState.wsId ?? workspaceManager.list()[0]?.id
    if (!wsId || !workspaceManager.getLoaded(wsId)) {
      stopLoop('Loop stopped: target workspace is missing.')
      return
    }

    chatLoopState.wsId = wsId
    chatLoopState.tick += 1
    chatLoopState.lastTickAt = Date.now()
    emitLoopState()

    const tasks = queueEngine.list(wsId)
    const counts = countTasks(tasks.map((task) => task.status))
    if (counts.running === 0 && counts.pending === 0) {
      const actorName = pickLoopActor(chatLoopState.objective)
      if (!actorName) {
        appendChatMessage({
          source: 'gateway',
          wsId,
          message: `Loop tick #${chatLoopState.tick}: no actor available for objective.`,
        })
        return
      }

      const taskId = queueEngine.enqueue({
        wsId,
        actor: actorName,
        input: {
          mode: 'loop',
          objective: chatLoopState.objective ?? '',
          tick: chatLoopState.tick,
          source: 'pocketpaw-loop',
        },
        priority: 1,
      })
      emit(IPC.EVENT_QUEUE_UPDATE, { wsId })
      actorRunner.kick(wsId)
      appendChatMessage({
        source: 'gateway',
        wsId,
        message: `Loop tick #${chatLoopState.tick}: queued ${actorName} (task ${taskId.slice(0, 8)}).`,
      })
      return
    }

    if (chatLoopState.tick - lastBusyNoticeTick >= 4) {
      lastBusyNoticeTick = chatLoopState.tick
      appendChatMessage({
        source: 'gateway',
        wsId,
        message: `Loop monitor: pending=${counts.pending}, running=${counts.running}, done=${counts.done}, failed=${counts.failed}.`,
      })
    }
  }

  function pickLoopActor(objective?: string): string | null {
    const actors = actorRegistry.list()
    if (actors.length === 0) {
      return null
    }

    const normalizedObjective = (objective ?? '').toLowerCase()
    if (normalizedObjective) {
      const direct = actors.find(
        (actor) =>
          normalizedObjective.includes(actor.name.toLowerCase()) ||
          normalizedObjective.includes((actor.title ?? '').toLowerCase())
      )
      if (direct) {
        return direct.name
      }
    }

    const preferred = actors.find((actor) => actor.name.includes('tiktok') || actor.name.includes('instagram'))
    return preferred?.name ?? actors[0].name
  }

  function buildChatReply(message: string, wsId?: string): string {
    const trimmed = message.trim()
    if (!trimmed) {
      return 'Send a message to start PocketPaw loop.'
    }

    if (/^\/help\b/i.test(trimmed)) {
      return 'Commands: /status, /loop start [objective], /loop stop, /loop status. Sending plain text will start/update the loop objective.'
    }

    if (/^\/status\b/i.test(trimmed)) {
      const queue = wsId
        ? queueEngine.list(wsId)
        : queueEngine.workspaceSummary().flatMap((item) => [
            ...Array(item.pending).fill('pending'),
            ...Array(item.running).fill('running'),
            ...Array(item.failed).fill('failed'),
            ...Array(item.done).fill('done'),
          ])
      const counts = countTasks(queue.map((item) => (typeof item === 'string' ? item : item.status)))
      return `Queue status${wsId ? ` (${wsId})` : ''}: pending=${counts.pending}, running=${counts.running}, done=${counts.done}, failed=${counts.failed}. ${describeLoopState(getLoopState())}`
    }

    if (/^\/loop\s+status\b/i.test(trimmed)) {
      return describeLoopState(getLoopState())
    }

    if (/^\/loop\s+stop\b/i.test(trimmed)) {
      const state = stopLoop('PocketPaw loop stopped by command.')
      return describeLoopState(state)
    }

    const intervalMatch = trimmed.match(/^\/loop\s+interval\s+(\d+)\s*$/i)
    if (intervalMatch) {
      const intervalSeconds = Number(intervalMatch[1])
      const state = startLoop({
        wsId: wsId ?? chatLoopState.wsId,
        objective: chatLoopState.objective,
        intervalMs: intervalSeconds * 1000,
      })
      return `Loop interval set to ${Math.floor(state.intervalMs / 1000)}s. ${describeLoopState(state)}`
    }

    const startMatch = trimmed.match(/^\/loop\s+start\b\s*(.*)$/i)
    if (startMatch) {
      const objective = startMatch[1]?.trim() || chatLoopState.objective
      const state = startLoop({
        wsId: wsId ?? chatLoopState.wsId,
        objective,
      })
      return `Loop started. ${describeLoopState(state)}`
    }

    const nextState = startLoop({
      wsId: wsId ?? chatLoopState.wsId,
      objective: trimmed,
    })
    return `Objective accepted. ${describeLoopState(nextState)}`
  }

  function describeLoopState(state: ChatLoopState): string {
    if (!state.running) {
      return 'Loop is stopped.'
    }

    const target = state.wsId ?? 'auto-workspace'
    const cadence = Math.floor(state.intervalMs / 1000)
    return `Loop running on ${target} every ${cadence}s (tick=${state.tick})${state.objective ? ` objective="${state.objective}"` : ''}.`
  }

  function processChatMessage(message: string, wsId?: string, source: ChatMessage['source'] = 'user'): ChatMessage {
    appendChatMessage({ source, message, wsId })
    const reply = appendAssistantReply(buildChatReply(message, wsId), wsId)
    return reply
  }

  ipcMain.handle(IPC.WORKSPACE_LIST, () => workspaceManager.list())
  ipcMain.handle(IPC.WORKSPACE_GET, (_, payload) => workspaceManager.get(requireString(payload?.id, 'id')))
  ipcMain.handle(IPC.WORKSPACE_CREATE, (_, payload) => workspaceManager.create(requireString(payload?.name, 'name')))
  ipcMain.handle(IPC.WORKSPACE_DELETE, async (_, payload) => {
    const wsId = requireString(payload?.id, 'id')
    if (chatLoopState.running && chatLoopState.wsId === wsId) {
      stopLoop(`Loop stopped: workspace ${wsId} was deleted.`)
    }
    actorRunner.killAll(wsId)
    queueEngine.killAll(wsId)
    await workspaceManager.delete(wsId)
  })

  ipcMain.handle(IPC.ACTOR_LIST, () => actorRegistry.list())
  ipcMain.handle(IPC.ACTOR_GET, (_, payload) => actorRegistry.get(requireString(payload?.name, 'name')))
  ipcMain.handle(IPC.ACTOR_INSTALL, (_, payload) => {
    const repoUrl = requireString(payload?.repoUrl, 'repoUrl')
    const name = optionalString(payload?.name, 'name')
    return actorRegistry.install(repoUrl, name)
  })
  ipcMain.handle(IPC.ACTOR_UNINSTALL, (_, payload) => {
    const name = requireString(payload?.name, 'name')
    actorRegistry.uninstall(name)
  })

  ipcMain.handle(IPC.QUEUE_ENQUEUE, (_, payload) => {
    const wsId = requireString(payload?.wsId, 'wsId')
    const actor = requireString(payload?.actor, 'actor')
    const taskId = queueEngine.enqueue({
      wsId,
      actor,
      input: ensureObject(payload?.input, 'input'),
      priority: optionalNumber(payload?.priority),
      runAt: optionalNumber(payload?.runAt),
    })
    emit(IPC.EVENT_QUEUE_UPDATE, { wsId })
    actorRunner.kick(wsId)
    return taskId
  })
  ipcMain.handle(IPC.QUEUE_LIST, (_, payload) => {
    const wsId = requireString(payload?.wsId, 'wsId')
    return queueEngine.list(wsId, payload?.status)
  })
  ipcMain.handle(IPC.QUEUE_KILL, (_, payload) => {
    const wsId = requireString(payload?.wsId, 'wsId')
    const taskId = requireString(payload?.taskId, 'taskId')
    actorRunner.kill(wsId, taskId)
    const killed = queueEngine.kill(wsId, taskId)
    emit(IPC.EVENT_QUEUE_UPDATE, { wsId })
    return killed
  })
  ipcMain.handle(IPC.QUEUE_KILL_ALL, (_, payload) => {
    const wsId = requireString(payload?.wsId, 'wsId')
    actorRunner.killAll(wsId)
    queueEngine.killAll(wsId)
    emit(IPC.EVENT_QUEUE_UPDATE, { wsId })
  })

  ipcMain.handle(IPC.SCHEDULE_ADD, (_, payload) => {
    const workspaceId = requireString(payload?.workspaceId, 'workspaceId')
    const actor = requireString(payload?.actor, 'actor')
    const cronExpr = requireString(payload?.cronExpr, 'cronExpr')
    return scheduler.add({
      workspaceId,
      actor,
      cronExpr,
      input: ensureObject(payload?.input, 'input'),
      runOnce: Boolean(payload?.runOnce),
    })
  })
  ipcMain.handle(IPC.SCHEDULE_REMOVE, (_, payload) => {
    scheduler.remove(requireString(payload?.jobId, 'jobId'))
  })
  ipcMain.handle(IPC.SCHEDULE_LIST, () => scheduler.list())

  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    currentConfig = await readConfig(configPath)
    return currentConfig
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_, { key, value }: { key: keyof AppConfig; value: unknown }) => {
    if (!configKeys.has(key)) {
      throw new Error(`Unsupported settings key: ${String(key)}`)
    }

    const next = await readConfig(configPath)
    ;(next as Record<keyof AppConfig, unknown>)[key] = value
    currentConfig = sanitizeConfig(next)
    await fs.writeJson(configPath, currentConfig, { spaces: 2 })
    updateGatewayConfig()
  })

  ipcMain.handle(IPC.SETTINGS_OPEN_HOME, async () => {
    const config = await readConfig(configPath)
    const homeDir = config.homeDir.replace('~', os.homedir())
    await shell.openPath(homeDir)
  })

  ipcMain.handle(IPC.CHAT_SEND, async (_, payload) => {
    const message = requireString(payload?.message, 'message')
    const wsId = optionalString(payload?.wsId, 'wsId')
    return processChatMessage(message, wsId, 'user')
  })
  ipcMain.handle(IPC.CHAT_HISTORY, (_, payload) => {
    const limit = optionalNumber(payload?.limit) ?? 100
    return chatMessages.slice(-Math.max(1, Math.min(500, limit)))
  })
  ipcMain.handle(IPC.CHAT_LOOP_START, (_, payload) => {
    return startLoop(payload ?? {})
  })
  ipcMain.handle(IPC.CHAT_LOOP_STOP, () => {
    return stopLoop()
  })
  ipcMain.handle(IPC.CHAT_LOOP_STATUS, () => {
    return getLoopState()
  })

  return () => {
    stopLoop(undefined, false)
    actorRunner.stop()
    scheduler.stop()
    void gateway.stop()
  }
}

async function readConfig(configPath: string): Promise<AppConfig> {
  const fileConfig = (await fs.readJson(configPath).catch(() => ({}))) as Partial<AppConfig>
  return sanitizeConfig({
    ...DEFAULT_CONFIG,
    ...fileConfig,
  })
}

function readConfigSync(configPath: string): AppConfig {
  const fileConfig = (fs.readJsonSync(configPath, { throws: false }) ?? {}) as Partial<AppConfig>
  return sanitizeConfig({
    ...DEFAULT_CONFIG,
    ...fileConfig,
  })
}

function sanitizeConfig(config: AppConfig): AppConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    maxConcurrentActors: clampNumber(config.maxConcurrentActors, 1, 20),
    telegramBotToken: String(config.telegramBotToken ?? ''),
    telegramAllowedUserId: String(config.telegramAllowedUserId ?? ''),
    defaultProxy: String(config.defaultProxy ?? ''),
    homeDir: String(config.homeDir ?? DEFAULT_CONFIG.homeDir),
    theme: config.theme === 'light' ? 'light' : 'dark',
  }
}

function requireString(value: unknown, key: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid payload: ${key} must be a string`)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`Invalid payload: ${key} cannot be empty`)
  }

  return trimmed
}

function optionalString(value: unknown, key: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new Error(`Invalid payload: ${key} must be a string`)
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function ensureObject(value: unknown, key: string): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {}
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid payload: ${key} must be an object`)
  }
  return value as Record<string, unknown>
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined
  }
  return value
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(Math.max(value, min), max)
}

function countTasks(statuses: string[]): { pending: number; running: number; done: number; failed: number } {
  const counts = { pending: 0, running: 0, done: 0, failed: 0 }
  for (const status of statuses) {
    if (status === 'pending') {
      counts.pending += 1
      continue
    }
    if (status === 'running') {
      counts.running += 1
      continue
    }
    if (status === 'done') {
      counts.done += 1
      continue
    }
    if (status === 'failed') {
      counts.failed += 1
    }
  }
  return counts
}
