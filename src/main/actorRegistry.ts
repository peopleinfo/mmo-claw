import { spawnSync } from 'child_process'
import fs from 'fs-extra'
import path from 'path'
import type { Actor, InputSchema } from '../shared/actor.types'

interface ActorManifest {
  name?: string
  version?: string
  title?: string
  description?: string
  author?: string
  runtime?: 'python' | 'node'
  entry?: string
  category?: 'social' | 'scraping' | 'mmo' | 'utility'
  tags?: string[]
}

export class ActorRegistry {
  private readonly builtinRoot: string
  private readonly installedRoot: string

  constructor(private readonly appHome: string) {
    this.builtinRoot = path.resolve(process.cwd(), 'actors')
    this.installedRoot = path.join(this.appHome, 'actors')
    fs.ensureDirSync(this.builtinRoot)
    fs.ensureDirSync(this.installedRoot)
  }

  list(): Actor[] {
    const actors = new Map<string, Actor>()

    for (const actor of this.scanActorRoot(this.builtinRoot, true)) {
      actors.set(actor.name, actor)
    }
    for (const actor of this.scanActorRoot(this.installedRoot, false)) {
      actors.set(actor.name, actor)
    }

    return [...actors.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  get(name: string): Actor | null {
    return this.list().find((actor) => actor.name === name) ?? null
  }

  install(repoUrl: string, alias?: string): Actor {
    const targetName = normalizeActorName(alias ?? repoUrl.split('/').filter(Boolean).at(-1) ?? '')
    if (!targetName) {
      throw new Error('Cannot infer actor name from repo URL. Provide a name.')
    }

    const targetDir = path.join(this.installedRoot, targetName)
    if (fs.pathExistsSync(targetDir)) {
      throw new Error(`Actor already exists: ${targetName}`)
    }

    const clone = spawnSync('git', ['clone', '--depth', '1', repoUrl, targetDir], {
      shell: false,
      encoding: 'utf8',
      windowsHide: true,
    })

    if (clone.status !== 0) {
      throw new Error(clone.stderr?.trim() || clone.stdout?.trim() || 'Failed to clone actor repository')
    }

    const actor = this.readActorFromDir(targetDir, false)
    if (!actor) {
      fs.removeSync(targetDir)
      throw new Error('Installed repository does not contain a valid actor entrypoint')
    }

    return actor
  }

  uninstall(name: string): void {
    const installedDirs = this.readDirectories(this.installedRoot)
    for (const dir of installedDirs) {
      const actor = this.readActorFromDir(dir, false)
      if (actor?.name === name) {
        fs.removeSync(dir)
        return
      }
    }

    throw new Error(`Installed actor not found: ${name}`)
  }

  private scanActorRoot(root: string, builtin: boolean): Actor[] {
    return this.readDirectories(root)
      .map((dir) => this.readActorFromDir(dir, builtin))
      .filter((actor): actor is Actor => actor !== null)
  }

  private readActorFromDir(dir: string, builtin: boolean): Actor | null {
    const manifest = readJsonFile<ActorManifest>(path.join(dir, 'actor.json'))
    const inputSchema = readJsonFile<InputSchema>(path.join(dir, 'INPUT_SCHEMA.json'))
    const entry = resolveEntryFile(dir, manifest?.entry)
    if (!entry) {
      return null
    }

    const runtime = inferRuntime(manifest?.runtime, entry)
    const name = normalizeActorName(manifest?.name ?? path.basename(dir))
    const entrypoint = path.join(dir, entry)

    return {
      name,
      version: manifest?.version ?? '0.1.0',
      title: manifest?.title ?? humanizeName(name),
      description: manifest?.description,
      author: manifest?.author,
      runtime,
      entry,
      category: manifest?.category ?? inferCategory(name),
      tags: manifest?.tags ?? [],
      dir,
      entrypoint,
      builtin,
      inputSchema: inputSchema ?? null,
    }
  }

  private readDirectories(root: string): string[] {
    if (!fs.pathExistsSync(root)) {
      return []
    }

    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => path.join(root, entry.name))
  }
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.pathExistsSync(filePath)) {
    return null
  }

  try {
    return fs.readJsonSync(filePath) as T
  } catch {
    return null
  }
}

function resolveEntryFile(dir: string, entryFromManifest?: string): string | null {
  const candidates = [entryFromManifest, 'main.py', 'index.js', 'main.js'].filter(
    (candidate): candidate is string => Boolean(candidate)
  )

  for (const candidate of candidates) {
    if (fs.pathExistsSync(path.join(dir, candidate))) {
      return candidate
    }
  }

  return null
}

function inferRuntime(runtime: ActorManifest['runtime'], entry: string): 'python' | 'node' {
  if (runtime) {
    return runtime
  }
  return entry.endsWith('.py') ? 'python' : 'node'
}

function inferCategory(name: string): Actor['category'] {
  if (name.includes('tiktok') || name.includes('instagram')) {
    return 'social'
  }
  if (name.includes('scrape') || name.includes('crawler')) {
    return 'scraping'
  }
  if (name.includes('mmo')) {
    return 'mmo'
  }
  return 'utility'
}

function normalizeActorName(value: string): string {
  return value
    .trim()
    .replace(/\.git$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function humanizeName(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
