import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Actor } from '../../shared/actor.types'
import { actorIpc } from '../ipc'

export function useActors() {
  const [actors, setActors] = useState<Actor[]>([])
  const [selectedActorName, setSelectedActorName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedActor = useMemo(
    () => actors.find((actor) => actor.name === selectedActorName) ?? null,
    [actors, selectedActorName]
  )

  const loadActors = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const items = await actorIpc.list()
      setActors(items)
      setSelectedActorName((prev) => (prev && items.some((item) => item.name === prev) ? prev : items[0]?.name ?? ''))
    } catch (loadError) {
      setError(formatError(loadError, 'Failed to load actors'))
    } finally {
      setLoading(false)
    }
  }, [])

  const installActor = useCallback(
    async (repoUrl: string, name?: string) => {
      setLoading(true)
      setError('')
      try {
        await actorIpc.install(repoUrl, name)
        await loadActors()
      } catch (installError) {
        setError(formatError(installError, 'Failed to install actor'))
      } finally {
        setLoading(false)
      }
    },
    [loadActors]
  )

  const uninstallActor = useCallback(
    async (name: string) => {
      setLoading(true)
      setError('')
      try {
        await actorIpc.uninstall(name)
        await loadActors()
      } catch (uninstallError) {
        setError(formatError(uninstallError, 'Failed to uninstall actor'))
      } finally {
        setLoading(false)
      }
    },
    [loadActors]
  )

  useEffect(() => {
    void loadActors()
  }, [loadActors])

  return {
    actors,
    selectedActor,
    selectedActorName,
    setSelectedActorName,
    loading,
    error,
    loadActors,
    installActor,
    uninstallActor,
  }
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
