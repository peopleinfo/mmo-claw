import type { ActorInput } from '../shared/actor.types'
import type { AppConfig } from '../shared/config.types'
import { IPC, type IpcEventMap, type IpcRequestMap, type ScheduleAddPayload } from '../shared/ipc.types'
import type { TaskStatus } from '../shared/workspace.types'

type ReqChannel = keyof IpcRequestMap
type EventChannel = keyof IpcEventMap

export function invoke<C extends ReqChannel>(
  channel: C,
  payload?: IpcRequestMap[C][0]
): Promise<IpcRequestMap[C][1]> {
  return window.electron.invoke(channel, payload)
}

export function on<C extends EventChannel>(channel: C, listener: (payload: IpcEventMap[C]) => void): () => void {
  return window.electron.on(channel, listener)
}

export const workspaceIpc = {
  list: () => invoke(IPC.WORKSPACE_LIST),
  create: (name: string) => invoke(IPC.WORKSPACE_CREATE, { name }),
  delete: (id: string) => invoke(IPC.WORKSPACE_DELETE, { id }),
  get: (id: string) => invoke(IPC.WORKSPACE_GET, { id }),
}

export const actorIpc = {
  list: () => invoke(IPC.ACTOR_LIST),
  install: (repoUrl: string, name?: string) => invoke(IPC.ACTOR_INSTALL, { repoUrl, name }),
  uninstall: (name: string) => invoke(IPC.ACTOR_UNINSTALL, { name }),
  get: (name: string) => invoke(IPC.ACTOR_GET, { name }),
}

export const queueIpc = {
  enqueue: (wsId: string, actor: string, input: ActorInput, priority = 0) =>
    invoke(IPC.QUEUE_ENQUEUE, { wsId, actor, input, priority }),
  list: (wsId: string, status?: TaskStatus) => invoke(IPC.QUEUE_LIST, { wsId, status }),
  kill: (wsId: string, taskId: string) => invoke(IPC.QUEUE_KILL, { wsId, taskId }),
  killAll: (wsId: string) => invoke(IPC.QUEUE_KILL_ALL, { wsId }),
}

export const scheduleIpc = {
  add: (payload: ScheduleAddPayload) => invoke(IPC.SCHEDULE_ADD, payload),
  remove: (jobId: string) => invoke(IPC.SCHEDULE_REMOVE, { jobId }),
  list: () => invoke(IPC.SCHEDULE_LIST),
}

export const settingsIpc = {
  get: () => invoke(IPC.SETTINGS_GET),
  set: (key: keyof AppConfig, value: unknown) => invoke(IPC.SETTINGS_SET, { key, value }),
  openHome: () => invoke(IPC.SETTINGS_OPEN_HOME),
}

