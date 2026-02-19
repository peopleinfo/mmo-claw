import { ipcMain, shell } from 'electron'
import fs from 'fs-extra'
import os from 'os'
import { v4 as uuid } from 'uuid'
import { DEFAULT_CONFIG, type AppConfig } from '../shared/config.types'
import { IPC, type ScheduledJob } from '../shared/ipc.types'
import { type Actor } from '../shared/actor.types'
import type { WorkspaceManager } from './workspaceManager'

export function registerIpcHandlers(deps: {
  workspaceManager: WorkspaceManager
  configPath: string
}) {
  const { workspaceManager, configPath } = deps
  const scheduledJobs: ScheduledJob[] = []
  const configKeys = new Set<keyof AppConfig>(Object.keys(DEFAULT_CONFIG) as Array<keyof AppConfig>)

  ipcMain.handle(IPC.WORKSPACE_LIST, () => workspaceManager.list())
  ipcMain.handle(IPC.WORKSPACE_GET, (_, payload) => workspaceManager.get(requireString(payload?.id, 'id')))
  ipcMain.handle(IPC.WORKSPACE_CREATE, (_, payload) => workspaceManager.create(requireString(payload?.name, 'name')))
  ipcMain.handle(IPC.WORKSPACE_DELETE, (_, payload) => workspaceManager.delete(requireString(payload?.id, 'id')))

  ipcMain.handle(IPC.ACTOR_LIST, () => [] as Actor[])
  ipcMain.handle(IPC.ACTOR_GET, () => null)
  ipcMain.handle(IPC.ACTOR_INSTALL, (_, payload) => {
    const repoUrl = requireString(payload?.repoUrl, 'repoUrl')
    const name = optionalString(payload?.name, 'name')
    const actorName = name ?? repoUrl.split('/').filter(Boolean).at(-1) ?? `actor-${uuid().slice(0, 8)}`
    const actor: Actor = {
      name: actorName,
      version: '0.0.0',
      title: actorName,
      runtime: 'python',
      entry: 'main.py',
      category: 'utility',
      dir: '',
      entrypoint: '',
      builtin: false,
    }
    return actor
  })
  ipcMain.handle(IPC.ACTOR_UNINSTALL, (_, payload) => {
    requireString(payload?.name, 'name')
  })

  ipcMain.handle(IPC.QUEUE_ENQUEUE, (_, payload) => {
    requireString(payload?.wsId, 'wsId')
    requireString(payload?.actor, 'actor')
    return uuid()
  })
  ipcMain.handle(IPC.QUEUE_LIST, (_, payload) => {
    requireString(payload?.wsId, 'wsId')
    return []
  })
  ipcMain.handle(IPC.QUEUE_KILL, (_, payload) => {
    requireString(payload?.wsId, 'wsId')
    requireString(payload?.taskId, 'taskId')
    return false
  })
  ipcMain.handle(IPC.QUEUE_KILL_ALL, (_, payload) => {
    requireString(payload?.wsId, 'wsId')
  })

  ipcMain.handle(IPC.SCHEDULE_ADD, (_, payload) => {
    requireString(payload?.workspaceId, 'workspaceId')
    requireString(payload?.actor, 'actor')
    requireString(payload?.cronExpr, 'cronExpr')
    const job: ScheduledJob = {
      id: uuid(),
      workspaceId: payload.workspaceId,
      actor: payload.actor,
      cronExpr: payload.cronExpr,
      nextRun: Date.now(),
    }
    scheduledJobs.push(job)
    return job.id
  })
  ipcMain.handle(IPC.SCHEDULE_REMOVE, (_, payload) => {
    const jobId = requireString(payload?.jobId, 'jobId')
    const index = scheduledJobs.findIndex((item) => item.id === jobId)
    if (index >= 0) {
      scheduledJobs.splice(index, 1)
    }
  })
  ipcMain.handle(IPC.SCHEDULE_LIST, () => scheduledJobs)

  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return readConfig(configPath)
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_, { key, value }: { key: keyof AppConfig; value: unknown }) => {
    if (!configKeys.has(key)) {
      throw new Error(`Unsupported settings key: ${String(key)}`)
    }

    const config = await readConfig(configPath)
    ;(config as Record<keyof AppConfig, unknown>)[key] = value
    await fs.writeJson(configPath, config, { spaces: 2 })
  })

  ipcMain.handle(IPC.SETTINGS_OPEN_HOME, async () => {
    const config = await readConfig(configPath)
    const homeDir = config.homeDir.replace('~', os.homedir())
    await shell.openPath(homeDir)
  })
}

async function readConfig(configPath: string): Promise<AppConfig> {
  const fileConfig = (await fs.readJson(configPath).catch(() => ({}))) as Partial<AppConfig>
  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
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
