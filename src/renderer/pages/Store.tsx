import { useState } from 'react'
import type { ActorInput } from '../../shared/actor.types'
import { ActorForm } from '../components/ActorForm'
import { useActors } from '../hooks/useActors'
import { useQueue } from '../hooks/useQueue'

interface StoreProps {
  workspaceId: string
}

export function Store({ workspaceId }: StoreProps) {
  const { actors, selectedActor, selectedActorName, setSelectedActorName, loading, error, installActor, uninstallActor } =
    useActors()
  const queue = useQueue(workspaceId)
  const [repoUrl, setRepoUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [status, setStatus] = useState('')

  async function handleInstall() {
    const trimmed = repoUrl.trim()
    if (!trimmed) {
      setStatus('Repository URL is required')
      return
    }
    await installActor(trimmed, alias.trim() || undefined)
    setRepoUrl('')
    setAlias('')
    setStatus('Actor installed')
  }

  async function handleRun(input: ActorInput) {
    if (!selectedActor) {
      return
    }
    if (!workspaceId) {
      throw new Error('Select workspace first')
    }
    const taskId = await queue.enqueue(selectedActor.name, input)
    setStatus(`Task enqueued: ${taskId}`)
  }

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-medium">Actor Store</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Install actors from GitHub (including Apify-style repos) and run them in your workspace.
        </p>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <input
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/org/actor-repo"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring md:col-span-2"
          />
          <input
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="alias (optional)"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleInstall()}
          disabled={loading}
          className="mt-3 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Installing...' : 'Install actor'}
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium">Available Actors</h3>
          <ul className="mt-3 space-y-2">
            {actors.map((actor) => (
              <li key={actor.name}>
                <button
                  type="button"
                  onClick={() => setSelectedActorName(actor.name)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    selectedActorName === actor.name ? 'border-primary/60 bg-primary/10' : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">{actor.title}</div>
                  <div className="text-xs text-muted-foreground">{actor.name}</div>
                </button>
              </li>
            ))}
            {actors.length === 0 && (
              <li className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No actors found.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{selectedActor?.title ?? 'Actor Form'}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedActor?.description ?? 'Select an actor to render INPUT_SCHEMA fields.'}
              </p>
            </div>
            {selectedActor && !selectedActor.builtin && (
              <button
                type="button"
                onClick={() => void uninstallActor(selectedActor.name)}
                className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10"
              >
                Uninstall
              </button>
            )}
          </div>
          <ActorForm actor={selectedActor} onSubmit={handleRun} disabled={!workspaceId} />
        </section>
      </div>

      <footer className="rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-muted-foreground">
        {error || queue.error || status || 'Ready'}
      </footer>
    </section>
  )
}
