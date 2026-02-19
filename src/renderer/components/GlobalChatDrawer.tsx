import { useEffect, useMemo, useState } from 'react'
import type { Workspace } from '../../shared/workspace.types'
import { IPC, type ChatLoopState, type ChatMessage } from '../../shared/ipc.types'
import { chatIpc, on } from '../ipc'

interface GlobalChatDrawerProps {
  open: boolean
  onClose: () => void
  workspaces: Workspace[]
  workspaceId: string
  onWorkspaceChange: (id: string) => void
}

const DEFAULT_LOOP_STATE: ChatLoopState = {
  running: false,
  intervalMs: 15_000,
  tick: 0,
}

export function GlobalChatDrawer({
  open,
  onClose,
  workspaces,
  workspaceId,
  onWorkspaceChange,
}: GlobalChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [loopState, setLoopState] = useState<ChatLoopState>(DEFAULT_LOOP_STATE)
  const [loopObjective, setLoopObjective] = useState('')
  const [loopIntervalSeconds, setLoopIntervalSeconds] = useState(15)
  const [loopBusy, setLoopBusy] = useState(false)

  const title = useMemo(() => {
    const ws = workspaces.find((item) => item.id === workspaceId)
    return ws ? `${ws.name}` : 'Global'
  }, [workspaceId, workspaces])

  useEffect(() => {
    if (!open) {
      return
    }

    void chatIpc.history(200).then(setMessages).catch(() => undefined)
    void chatIpc
      .loopStatus()
      .then((state) => {
        setLoopState(state)
        setLoopObjective(state.objective ?? '')
        setLoopIntervalSeconds(Math.max(4, Math.round(state.intervalMs / 1000)))
      })
      .catch(() => undefined)
  }, [open])

  useEffect(() => {
    const offMessage = on(IPC.EVENT_CHAT_MESSAGE, (payload) => {
      setMessages((prev) => {
        const next = [...prev, payload]
        return next.slice(-300)
      })
    })
    const offLoop = on(IPC.EVENT_CHAT_LOOP_STATE, (payload) => {
      setLoopState(payload)
      if (payload.objective) {
        setLoopObjective(payload.objective)
      }
      setLoopIntervalSeconds(Math.max(4, Math.round(payload.intervalMs / 1000)))
    })
    return () => {
      offMessage()
      offLoop()
    }
  }, [])

  async function handleSend() {
    const message = text.trim()
    if (!message) {
      return
    }

    setSending(true)
    setError('')
    try {
      await chatIpc.send(message, workspaceId || undefined)
      setText('')
    } catch (sendError) {
      setError(formatError(sendError, 'Failed to send message'))
    } finally {
      setSending(false)
    }
  }

  async function handleStartLoop() {
    setLoopBusy(true)
    setError('')
    try {
      const state = await chatIpc.loopStart({
        wsId: workspaceId || undefined,
        objective: loopObjective.trim() || undefined,
        intervalMs: Math.max(4, loopIntervalSeconds) * 1000,
      })
      setLoopState(state)
    } catch (loopError) {
      setError(formatError(loopError, 'Failed to start loop'))
    } finally {
      setLoopBusy(false)
    }
  }

  async function handleStopLoop() {
    setLoopBusy(true)
    setError('')
    try {
      const state = await chatIpc.loopStop()
      setLoopState(state)
    } catch (loopError) {
      setError(formatError(loopError, 'Failed to stop loop'))
    } finally {
      setLoopBusy(false)
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">PocketPaw Loop Chat</h2>
            <p className="text-xs text-muted-foreground">Agent loop + chat commands</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2 py-1 text-xs transition hover:bg-accent"
          >
            Close
          </button>
        </header>

        <div className="space-y-3 border-b border-border px-4 py-3">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Workspace target</span>
            <select
              value={workspaceId}
              onChange={(event) => onWorkspaceChange(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Global (auto workspace)</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Loop objective</span>
            <input
              value={loopObjective}
              onChange={(event) => setLoopObjective(event.target.value)}
              placeholder="ex: keep tiktok queue posting every cycle"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <div className="grid grid-cols-[1fr,auto,auto] items-end gap-2">
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Interval (seconds)</span>
              <input
                type="number"
                min={4}
                max={120}
                value={loopIntervalSeconds}
                onChange={(event) => setLoopIntervalSeconds(clampInt(Number(event.target.value), 4, 120))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleStartLoop()}
              disabled={loopBusy}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start
            </button>

            <button
              type="button"
              onClick={() => void handleStopLoop()}
              disabled={loopBusy || !loopState.running}
              className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Target: <span className="font-medium text-foreground">{title}</span> | State:{' '}
            <span className={loopState.running ? 'text-emerald-300' : 'text-muted-foreground'}>
              {loopState.running ? `running (tick ${loopState.tick})` : 'stopped'}
            </span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">No chat yet.</p>}
          {messages.map((message) => (
            <article
              key={message.id}
              className={`mb-2 rounded-md border px-3 py-2 text-sm ${
                message.source === 'user'
                  ? 'border-blue-500/40 bg-blue-500/10'
                  : message.source === 'assistant'
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-amber-500/40 bg-amber-500/10'
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{message.source}</span>
                <span>{new Date(message.ts).toLocaleTimeString()}</span>
              </div>
              <p className="whitespace-pre-wrap">{message.message}</p>
            </article>
          ))}
        </div>

        <footer className="border-t border-border px-4 py-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleSend()
                }
              }}
              placeholder="Type command or objective. Plain text starts/updates loop."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              disabled={sending}
              onClick={() => void handleSend()}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </footer>
      </aside>
    </>
  )
}

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return min
  }
  return Math.min(Math.max(Math.trunc(value), min), max)
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
