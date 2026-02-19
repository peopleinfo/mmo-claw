export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled'

export interface Workspace {
  id: string
  name: string
  root: string
  createdAt: number
}

export interface Task {
  id: string
  actor: string
  status: TaskStatus
  input?: string
  output?: string
  error?: string
  attempts: number
  maxAttempts: number
  priority: number
  runAt: number
  startedAt?: number
  finishedAt?: number
  createdAt: number
}

export interface Account {
  id: string
  platform: string
  username?: string
  credentialsEnc?: string
  proxy?: string
  status: 'active' | 'banned' | 'suspended'
  lastUsed?: number
  createdAt: number
}

export interface Asset {
  id: string
  filename: string
  filepath: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  platform?: string
  caption?: string
  hashtags?: string
  scheduledAt?: number
  postedAt?: number
  taskId?: string
  createdAt: number
}

