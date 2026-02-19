import type { Actor, ActorInput } from './actor.types'
import type { AppConfig } from './config.types'
import type { Task, TaskStatus, Workspace } from './workspace.types'

export const IPC = {
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_GET: 'workspace:get',
  ACTOR_LIST: 'actor:list',
  ACTOR_INSTALL: 'actor:install',
  ACTOR_UNINSTALL: 'actor:uninstall',
  ACTOR_GET: 'actor:get',
  QUEUE_ENQUEUE: 'queue:enqueue',
  QUEUE_LIST: 'queue:list',
  QUEUE_KILL: 'queue:kill',
  QUEUE_KILL_ALL: 'queue:killAll',
  SCHEDULE_ADD: 'schedule:add',
  SCHEDULE_REMOVE: 'schedule:remove',
  SCHEDULE_LIST: 'schedule:list',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_OPEN_HOME: 'settings:openHomeDir',
  CHAT_SEND: 'chat:send',
  CHAT_HISTORY: 'chat:history',
  CHAT_LOOP_START: 'chat:loop:start',
  CHAT_LOOP_STOP: 'chat:loop:stop',
  CHAT_LOOP_STATUS: 'chat:loop:status',
  EVENT_ACTOR_LOG: 'actor:log',
  EVENT_ACTOR_STARTED: 'actor:started',
  EVENT_ACTOR_DONE: 'actor:done',
  EVENT_ACTOR_FAILED: 'actor:failed',
  EVENT_QUEUE_UPDATE: 'queue:update',
  EVENT_CHAT_MESSAGE: 'chat:message',
  EVENT_CHAT_LOOP_STATE: 'chat:loop:state',
} as const

export interface IpcRequestMap {
  [IPC.WORKSPACE_LIST]: [void, Workspace[]]
  [IPC.WORKSPACE_CREATE]: [{ name: string }, Workspace]
  [IPC.WORKSPACE_DELETE]: [{ id: string }, void]
  [IPC.WORKSPACE_GET]: [{ id: string }, Workspace | null]
  [IPC.ACTOR_LIST]: [void, Actor[]]
  [IPC.ACTOR_INSTALL]: [{ repoUrl: string; name?: string }, Actor]
  [IPC.ACTOR_UNINSTALL]: [{ name: string }, void]
  [IPC.ACTOR_GET]: [{ name: string }, Actor | null]
  [IPC.QUEUE_ENQUEUE]: [
    { wsId: string; actor: string; input: ActorInput; priority?: number; runAt?: number },
    string
  ]
  [IPC.QUEUE_LIST]: [{ wsId: string; status?: TaskStatus }, Task[]]
  [IPC.QUEUE_KILL]: [{ wsId: string; taskId: string }, boolean]
  [IPC.QUEUE_KILL_ALL]: [{ wsId: string }, void]
  [IPC.SCHEDULE_ADD]: [ScheduleAddPayload, string]
  [IPC.SCHEDULE_REMOVE]: [{ jobId: string }, void]
  [IPC.SCHEDULE_LIST]: [void, ScheduledJob[]]
  [IPC.SETTINGS_GET]: [void, AppConfig]
  [IPC.SETTINGS_SET]: [{ key: keyof AppConfig; value: unknown }, void]
  [IPC.SETTINGS_OPEN_HOME]: [void, void]
  [IPC.CHAT_SEND]: [{ message: string; wsId?: string }, ChatMessage]
  [IPC.CHAT_HISTORY]: [{ limit?: number } | void, ChatMessage[]]
  [IPC.CHAT_LOOP_START]: [ChatLoopStartPayload, ChatLoopState]
  [IPC.CHAT_LOOP_STOP]: [void, ChatLoopState]
  [IPC.CHAT_LOOP_STATUS]: [void, ChatLoopState]
}

export interface IpcEventMap {
  [IPC.EVENT_ACTOR_LOG]: { wsId: string; taskId: string; level: LogLevel; message: string; ts: number }
  [IPC.EVENT_ACTOR_STARTED]: { wsId: string; taskId: string; actor: string }
  [IPC.EVENT_ACTOR_DONE]: { wsId: string; taskId: string; output?: unknown }
  [IPC.EVENT_ACTOR_FAILED]: { wsId: string; taskId: string; error: string }
  [IPC.EVENT_QUEUE_UPDATE]: { wsId: string }
  [IPC.EVENT_CHAT_MESSAGE]: ChatMessage
  [IPC.EVENT_CHAT_LOOP_STATE]: ChatLoopState
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

export interface ChatMessage {
  id: string
  source: 'user' | 'assistant' | 'gateway'
  message: string
  wsId?: string
  ts: number
}

export interface ChatLoopStartPayload {
  wsId?: string
  objective?: string
  intervalMs?: number
}

export interface ChatLoopState {
  running: boolean
  wsId?: string
  objective?: string
  intervalMs: number
  tick: number
  lastTickAt?: number
}
