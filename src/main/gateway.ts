import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import fs from 'fs-extra'
import http, { type IncomingMessage, type ServerResponse } from 'http'
import path from 'path'

interface GatewayConfig {
  enabled: boolean
  token: string
  allowedUserId: string
}

interface GatewayDeps {
  appHome: string
  bridgeScriptPath?: string
  getStatus: () => unknown
  onChatMessage: (message: string, wsId?: string) => Promise<unknown>
}

export class GatewayServer {
  private server: http.Server | null = null
  private sidecar: ChildProcessWithoutNullStreams | null = null
  private config: GatewayConfig = {
    enabled: false,
    token: '',
    allowedUserId: '',
  }

  constructor(private readonly deps: GatewayDeps) {}

  async start(port = 3717): Promise<void> {
    if (!this.server) {
      this.server = http.createServer((req, res) => {
        void this.handle(req, res)
      })
    }

    if (!this.server.listening) {
      await new Promise<void>((resolve, reject) => {
        this.server?.once('error', reject)
        this.server?.listen(port, '127.0.0.1', () => resolve())
      })
    }
  }

  async stop(): Promise<void> {
    this.stopSidecar()
    if (!this.server?.listening) {
      return
    }
    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  }

  updateConfig(config: GatewayConfig) {
    this.config = config
    if (config.enabled && config.token && config.allowedUserId) {
      this.startSidecar()
      return
    }
    this.stopSidecar()
  }

  private startSidecar() {
    if (this.sidecar) {
      return
    }

    const scriptPath = this.deps.bridgeScriptPath ?? path.join(this.deps.appHome, 'bridge', 'gateway_bridge.py')
    if (!fs.pathExistsSync(scriptPath)) {
      return
    }

    this.sidecar = spawn(getUvBin(), ['run', scriptPath], {
      cwd: path.dirname(scriptPath),
      env: {
        ...process.env,
        MMO_CLAW_GATEWAY_URL: 'http://127.0.0.1:3717',
        MMO_CLAW_TELEGRAM_TOKEN: this.config.token,
        MMO_CLAW_TELEGRAM_ALLOWED_USER: this.config.allowedUserId,
      },
      shell: false,
      windowsHide: true,
    })
    this.sidecar.on('close', () => {
      this.sidecar = null
    })
  }

  private stopSidecar() {
    if (!this.sidecar) {
      return
    }
    this.sidecar.kill()
    this.sidecar = null
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    if (req.method === 'GET' && url.pathname === '/health') {
      writeJson(res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      writeJson(res, 200, {
        ok: true,
        gatewayEnabled: this.config.enabled,
        pocketpawConfigured: Boolean(this.config.token && this.config.allowedUserId),
        summary: this.deps.getStatus(),
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/chat') {
      const payload = await readJsonBody(req)
      const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
      if (!message) {
        writeJson(res, 400, { ok: false, error: 'message is required' })
        return
      }

      const wsId = typeof payload?.wsId === 'string' ? payload.wsId : undefined
      const reply = await this.deps.onChatMessage(message, wsId)
      writeJson(res, 200, { ok: true, reply })
      return
    }

    writeJson(res, 404, { ok: false, error: 'Not found' })
  }
}

function getUvBin(): string {
  return process.platform === 'win32' ? 'uv.exe' : 'uv'
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk))
  }

  const body = Buffer.concat(chunks).toString('utf8').trim()
  if (!body) {
    return {}
  }

  try {
    return JSON.parse(body) as Record<string, unknown>
  } catch {
    return null
  }
}

function writeJson(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(body))
  res.end(body)
}
