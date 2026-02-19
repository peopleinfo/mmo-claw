import Database from 'better-sqlite3'
import fs from 'fs-extra'
import path from 'path'
import type { Workspace as WorkspaceRecord } from '../shared/workspace.types'

interface WorkspaceInit {
  id: string
  name: string
  root: string
  createdAt?: number
}

export class Workspace {
  readonly id: string
  readonly name: string
  readonly root: string
  readonly createdAt: number
  readonly db: Database.Database

  constructor(init: WorkspaceInit) {
    this.id = init.id
    this.name = init.name
    this.root = path.resolve(init.root)
    this.createdAt = init.createdAt ?? Date.now()

    fs.ensureDirSync(this.root)
    fs.ensureDirSync(path.join(this.root, 'actors'))
    fs.ensureDirSync(path.join(this.root, 'assets'))
    fs.ensureDirSync(path.join(this.root, 'logs'))

    const dbPath = path.join(this.root, 'workspace.db')
    this.db = this.createDatabase(dbPath)
  }

  resolve(...segments: string[]): string {
    const candidate = path.resolve(this.root, ...segments)
    const rel = path.relative(this.root, candidate)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Path escapes workspace: ${candidate}`)
    }
    return candidate
  }

  toJSON(): WorkspaceRecord {
    return {
      id: this.id,
      name: this.name,
      root: this.root,
      createdAt: this.createdAt,
    }
  }

  dispose() {
    this.db.close()
  }

  private bootstrapSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        actor TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        input TEXT,
        output TEXT,
        error TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        priority INTEGER NOT NULL DEFAULT 0,
        run_at INTEGER NOT NULL,
        started_at INTEGER,
        finished_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        username TEXT,
        credentials_enc TEXT,
        proxy TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        last_used INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        platform TEXT,
        caption TEXT,
        hashtags TEXT,
        scheduled_at INTEGER,
        posted_at INTEGER,
        task_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );
    `)
  }

  private createDatabase(dbPath: string): Database.Database {
    try {
      const db = new Database(dbPath)
      db.pragma('journal_mode = WAL')
      this.bootstrapSchemaWith(db)
      return db
    } catch (error) {
      console.warn(
        'better-sqlite3 is unavailable in this runtime. Falling back to a no-op database instance.',
        error
      )
      return createNoopDatabase()
    }
  }

  private bootstrapSchemaWith(db: Database.Database) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        actor TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        input TEXT,
        output TEXT,
        error TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        priority INTEGER NOT NULL DEFAULT 0,
        run_at INTEGER NOT NULL,
        started_at INTEGER,
        finished_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        username TEXT,
        credentials_enc TEXT,
        proxy TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        last_used INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        platform TEXT,
        caption TEXT,
        hashtags TEXT,
        scheduled_at INTEGER,
        posted_at INTEGER,
        task_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );
    `)
  }
}

function createNoopDatabase(): Database.Database {
  const noOp = () => undefined
  const statement = {
    run: () => undefined,
    get: () => undefined,
    all: () => [],
  }

  return {
    pragma: noOp,
    exec: noOp,
    close: noOp,
    prepare: () => statement,
  } as unknown as Database.Database
}
