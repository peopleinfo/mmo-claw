import { useCallback, useEffect, useState } from 'react'
import type { ActorInput } from '../../shared/actor.types'
import { IPC } from '../../shared/ipc.types'
import type { Task, TaskStatus } from '../../shared/workspace.types'
import { on, queueIpc } from '../ipc'

export function useQueue(workspaceId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(
    async (status?: TaskStatus) => {
      if (!workspaceId) {
        setTasks([])
        return
      }

      setLoading(true)
      setError('')
      try {
        const rows = await queueIpc.list(workspaceId, status)
        setTasks(rows)
      } catch (refreshError) {
        setError(formatError(refreshError, 'Failed to load queue'))
      } finally {
        setLoading(false)
      }
    },
    [workspaceId]
  )

  const enqueue = useCallback(
    async (actor: string, input: ActorInput) => {
      if (!workspaceId) {
        throw new Error('Workspace is required')
      }
      const taskId = await queueIpc.enqueue(workspaceId, actor, input)
      await refresh()
      return taskId
    },
    [refresh, workspaceId]
  )

  const kill = useCallback(
    async (taskId: string) => {
      if (!workspaceId) {
        return false
      }
      const result = await queueIpc.kill(workspaceId, taskId)
      await refresh()
      return result
    },
    [refresh, workspaceId]
  )

  const killAll = useCallback(async () => {
    if (!workspaceId) {
      return
    }
    await queueIpc.killAll(workspaceId)
    await refresh()
  }, [refresh, workspaceId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const off = on(IPC.EVENT_QUEUE_UPDATE, (payload) => {
      if (payload.wsId === workspaceId) {
        void refresh()
      }
    })
    return off
  }, [refresh, workspaceId])

  return {
    tasks,
    loading,
    error,
    refresh,
    enqueue,
    kill,
    killAll,
  }
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
