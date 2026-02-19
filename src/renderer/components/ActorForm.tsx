import { useMemo, useState, type FormEvent } from 'react'
import type { Actor, ActorInput, InputSchemaProperty } from '../../shared/actor.types'

interface ActorFormProps {
  actor: Actor | null
  onSubmit: (input: ActorInput) => Promise<void>
  disabled?: boolean
}

export function ActorForm({ actor, onSubmit, disabled = false }: ActorFormProps) {
  const initialValues = useMemo(() => buildInitialValues(actor), [actor])
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!actor) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        Select an actor to view its input form.
      </div>
    )
  }

  const properties = actor.inputSchema?.properties ?? {}
  const propertyEntries = Object.entries(properties)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(values)
    } catch (submitError) {
      setError(formatError(submitError, 'Failed to run actor'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {propertyEntries.length === 0 && (
        <div className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          No INPUT_SCHEMA.json fields, default empty input will be used.
        </div>
      )}

      {propertyEntries.map(([name, property]) => (
        <label key={name} className="block space-y-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {property.title || name}
          </span>
          {renderField(name, property, values[name], (nextValue) =>
            setValues((prev) => ({ ...prev, [name]: nextValue }))
          )}
          {property.description && <span className="block text-xs text-muted-foreground">{property.description}</span>}
        </label>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={disabled || submitting}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Running...' : 'Run actor'}
      </button>
    </form>
  )
}

function renderField(
  name: string,
  property: InputSchemaProperty,
  value: unknown,
  onChange: (nextValue: unknown) => void
) {
  if (property.type === 'boolean') {
    return (
      <input
        name={name}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-input"
      />
    )
  }

  if (property.enum && property.enum.length > 0) {
    return (
      <select
        name={name}
        value={String(value ?? property.enum[0])}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {property.enum.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    )
  }

  const baseInputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring'

  if (property.editor === 'textarea') {
    return (
      <textarea
        name={name}
        rows={3}
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
        className={baseInputClass}
      />
    )
  }

  const type = property.type === 'number' || property.type === 'integer' ? 'number' : 'text'
  return (
    <input
      name={name}
      type={type}
      min={property.minimum}
      max={property.maximum}
      value={String(value ?? '')}
      onChange={(event) => onChange(parseValue(property, event.target.value))}
      className={baseInputClass}
    />
  )
}

function parseValue(property: InputSchemaProperty, rawValue: string): unknown {
  if (property.type === 'integer') {
    const next = Number.parseInt(rawValue, 10)
    return Number.isNaN(next) ? 0 : next
  }
  if (property.type === 'number') {
    const next = Number.parseFloat(rawValue)
    return Number.isNaN(next) ? 0 : next
  }
  return rawValue
}

function buildInitialValues(actor: Actor | null): Record<string, unknown> {
  if (!actor?.inputSchema?.properties) {
    return {}
  }

  const values: Record<string, unknown> = {}
  for (const [key, property] of Object.entries(actor.inputSchema.properties)) {
    if (property.default !== undefined) {
      values[key] = property.default
      continue
    }
    values[key] = defaultValue(property.type)
  }
  return values
}

function defaultValue(type: InputSchemaProperty['type']) {
  if (type === 'boolean') {
    return false
  }
  if (type === 'number' || type === 'integer') {
    return 0
  }
  return ''
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
