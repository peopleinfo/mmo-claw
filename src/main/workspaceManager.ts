import fs from 'fs-extra'
import path from 'path'
import { v4 as uuid } from 'uuid'
import type { Workspace as WorkspaceRecord } from '../shared/workspace.types'
import { Workspace } from './workspace'

export class WorkspaceManager {
  private readonly workspaces = new Map<string, Workspace>()
  private readonly manifestPath: string

  constructor(private readonly homeDir: string) {
    this.manifestPath = path.join(this.homeDir, 'workspaces.json')
  }

  async init() {
    await fs.ensureDir(this.homeDir)
    const raw = await fs.readJson(this.manifestPath).catch(() => [])
    const manifests = Array.isArray(raw) ? (raw as WorkspaceRecord[]) : []
    for (const item of manifests) {
      if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.root !== 'string') {
        continue
      }

      try {
        const ws = new Workspace(item)
        this.workspaces.set(ws.id, ws)
      } catch {
        // Skip corrupted workspace records so one bad entry doesn't block startup.
      }
    }

    await this.persistManifest()
  }

  list(): WorkspaceRecord[] {
    return [...this.workspaces.values()].map((ws) => ws.toJSON())
  }

  listLoaded(): Workspace[] {
    return [...this.workspaces.values()]
  }

  get(id: string): WorkspaceRecord | null {
    return this.workspaces.get(id)?.toJSON() ?? null
  }

  getLoaded(id: string): Workspace | null {
    return this.workspaces.get(id) ?? null
  }

  async create(name: string): Promise<WorkspaceRecord> {
    const id = uuid()
    const safeName = this.normalizeWorkspaceName(name, id)
    const root = path.join(this.homeDir, id)
    const ws = new Workspace({ id, name: safeName, root, createdAt: Date.now() })
    this.workspaces.set(id, ws)
    await this.persistManifest()
    return ws.toJSON()
  }

  async delete(id: string): Promise<void> {
    const ws = this.workspaces.get(id)
    if (!ws) {
      return
    }

    ws.dispose()
    this.workspaces.delete(id)
    await fs.remove(ws.root)
    await this.persistManifest()
  }

  async destroy() {
    for (const ws of this.workspaces.values()) {
      ws.dispose()
    }
    this.workspaces.clear()
  }

  private async persistManifest() {
    await fs.writeJson(this.manifestPath, this.list(), { spaces: 2 })
  }

  private normalizeWorkspaceName(name: string, id: string): string {
    const fallback = `workspace-${id.slice(0, 8)}`
    const trimmed = name.trim()
    if (!trimmed) {
      return fallback
    }

    const singleSpaced = trimmed.replace(/\s+/g, ' ')
    return singleSpaced.length > 80 ? `${singleSpaced.slice(0, 80)}...` : singleSpaced
  }
}
