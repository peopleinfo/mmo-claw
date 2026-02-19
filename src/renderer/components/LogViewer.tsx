import type { ActorLogLine } from '../hooks/useLogs'

interface LogViewerProps {
  lines: ActorLogLine[]
  onClear: () => void
}

export function LogViewer({ lines, onClear }: LogViewerProps) {
  return (
    <section className="rounded-md border border-border bg-background/30">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-medium">Live Logs</h3>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-border px-2 py-1 text-xs transition hover:bg-accent"
        >
          Clear
        </button>
      </header>
      <div className="max-h-80 overflow-y-auto p-3 font-mono text-xs">
        {lines.length === 0 && <div className="text-muted-foreground">No logs yet.</div>}
        {lines.map((line) => (
          <div key={line.id} className="mb-1">
            <span className="text-muted-foreground">{new Date(line.ts).toLocaleTimeString()}</span>
            <span className={`ml-2 ${levelClass(line.level)}`}>[{line.level.toUpperCase()}]</span>
            <span className="ml-2">{line.message}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function levelClass(level: ActorLogLine['level']): string {
  if (level === 'error') {
    return 'text-destructive'
  }
  if (level === 'warn') {
    return 'text-amber-300'
  }
  if (level === 'debug') {
    return 'text-cyan-300'
  }
  return 'text-emerald-300'
}
