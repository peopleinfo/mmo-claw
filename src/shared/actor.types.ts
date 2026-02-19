export type ActorInput = Record<string, unknown>

export type InputSchemaEditor =
  | 'textfield'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'filepicker'

export interface InputSchemaProperty {
  title: string
  type: 'string' | 'integer' | 'number' | 'boolean'
  description?: string
  editor?: InputSchemaEditor
  default?: unknown
  minimum?: number
  maximum?: number
  enum?: string[]
  source?: string
}

export interface InputSchema {
  title: string
  type: 'object'
  schemaVersion: number
  properties: Record<string, InputSchemaProperty>
  required?: string[]
}

export interface Actor {
  name: string
  version: string
  title: string
  description?: string
  author?: string
  runtime: 'python' | 'node'
  entry: string
  category: 'social' | 'scraping' | 'mmo' | 'utility'
  tags?: string[]
  schedule?: string | null
  timeout?: number
  maxRetries?: number
  needs?: {
    browser?: boolean
    proxy?: 'required' | 'optional' | false
    account?: string
  }
  dir: string
  entrypoint: string
  inputSchema?: InputSchema | null
  builtin: boolean
}

