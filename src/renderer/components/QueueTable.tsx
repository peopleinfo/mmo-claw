import type { Task } from '../../shared/workspace.types'

interface QueueTableProps {
  tasks: Task[]
  onKill: (taskId: string) => void
}

export function QueueTable({ tasks, onKill }: QueueTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        Queue is empty.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Task</th>
            <th className="px-3 py-2">Actor</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Attempts</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-t border-border">
              <td className="px-3 py-2 font-mono text-xs">{task.id.slice(0, 8)}</td>
              <td className="px-3 py-2">{task.actor}</td>
              <td className="px-3 py-2">
                <span className={`rounded px-2 py-1 text-xs ${statusClass(task.status)}`}>{task.status}</span>
              </td>
              <td className="px-3 py-2">
                {task.attempts}/{task.maxAttempts}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(task.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2">
                {task.status === 'running' || task.status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => onKill(task.id)}
                    className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10"
                  >
                    Kill
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function statusClass(status: Task['status']): string {
  if (status === 'running') {
    return 'bg-blue-500/20 text-blue-300'
  }
  if (status === 'done') {
    return 'bg-emerald-500/20 text-emerald-300'
  }
  if (status === 'failed') {
    return 'bg-destructive/20 text-destructive'
  }
  if (status === 'cancelled') {
    return 'bg-amber-500/20 text-amber-300'
  }
  return 'bg-muted text-muted-foreground'
}
