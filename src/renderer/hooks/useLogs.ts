import { useEffect, useMemo, useState } from 'react'
import { IPC } from '../../shared/ipc.types'
import { on } from '../ipc'

export interface ActorLogLine {
  id: string
  wsId: string
  taskId: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  ts: number
}

export function useLogs(workspaceId: string, limit = 400) {
  const [lines, setLines] = useState<ActorLogLine[]>([])

  useEffect(() => {
    setLines([])
  }, [workspaceId])

  useEffect(() => {
    const offLog = on(IPC.EVENT_ACTOR_LOG, (payload) => {
      if (payload.wsId !== workspaceId) {
        return
      }

      setLines((prev) => {
        const next = [
          ...prev,
          {
            id: `${payload.taskId}-${payload.ts}-${prev.length}`,
            wsId: payload.wsId,
            taskId: payload.taskId,
            level: payload.level,
            message: payload.message,
            ts: payload.ts,
          },
        ]
        if (next.length > limit) {
          return next.slice(next.length - limit)
        }
        return next
      })
    })

    const offStart = on(IPC.EVENT_ACTOR_STARTED, (payload) => {
      if (payload.wsId !== workspaceId) {
        return
      }
      setLines((prev) => [
        ...prev,
        {
          id: `${payload.taskId}-start-${Date.now()}`,
          wsId: payload.wsId,
          taskId: payload.taskId,
          level: 'info',
          message: `Actor ${payload.actor} started`,
          ts: Date.now(),
        },
      ])
    })

    const offDone = on(IPC.EVENT_ACTOR_DONE, (payload) => {
      if (payload.wsId !== workspaceId) {
        return
      }
      setLines((prev) => [
        ...prev,
        {
          id: `${payload.taskId}-done-${Date.now()}`,
          wsId: payload.wsId,
          taskId: payload.taskId,
          level: 'info',
          message: 'Actor finished',
          ts: Date.now(),
        },
      ])
    })

    const offFail = on(IPC.EVENT_ACTOR_FAILED, (payload) => {
      if (payload.wsId !== workspaceId) {
        return
      }
      setLines((prev) => [
        ...prev,
        {
          id: `${payload.taskId}-fail-${Date.now()}`,
          wsId: payload.wsId,
          taskId: payload.taskId,
          level: 'error',
          message: payload.error,
          ts: Date.now(),
        },
      ])
    })

    return () => {
      offLog()
      offStart()
      offDone()
      offFail()
    }
  }, [limit, workspaceId])

  const sorted = useMemo(
    () => [...lines].sort((a, b) => a.ts - b.ts),
    [lines]
  )

  return {
    lines: sorted,
    clear: () => setLines([]),
  }
}
