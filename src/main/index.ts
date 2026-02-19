import { app, BrowserWindow } from 'electron'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { DEFAULT_CONFIG, type AppConfig } from '../shared/config.types'
import { registerIpcHandlers } from './ipc'
import { WorkspaceManager } from './workspaceManager'

let mainWindow: BrowserWindow | null = null
let workspaceManager: WorkspaceManager | null = null

const APP_HOME = path.resolve(process.env.MMO_CLAW_HOME ?? path.join(os.homedir(), '.MMO Claw'))
const CONFIG_PATH = path.join(APP_HOME, 'config.json')

async function ensureConfig(): Promise<AppConfig> {
  await fs.ensureDir(APP_HOME)
  const existing = await fs.readJson(CONFIG_PATH).catch(() => ({}))
  const config = {
    ...DEFAULT_CONFIG,
    ...(existing as Partial<AppConfig>),
  } as AppConfig

  if (!(await fs.pathExists(CONFIG_PATH))) {
    await fs.writeJson(CONFIG_PATH, config, { spaces: 2 })
  }

  return config
}

function resolveHomeDir(config: AppConfig): string {
  return path.resolve(config.homeDir.replace('~', os.homedir()))
}

function createMainWindow() {
  const preloadPath = path.join(__dirname, '../renderer/preload.js')
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const devUrl = process.env.ELECTRON_RENDERER_URL ?? 'http://localhost:5173'
  if (!app.isPackaged) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow = win
  win.on('closed', () => {
    mainWindow = null
  })
}

async function bootstrap() {
  const config = await ensureConfig()
  const workspaceHome = path.join(resolveHomeDir(config), 'workspaces')
  workspaceManager = new WorkspaceManager(workspaceHome)
  await workspaceManager.init()

  registerIpcHandlers({
    workspaceManager,
    configPath: CONFIG_PATH,
  })

  createMainWindow()
}

app.whenReady().then(() => {
  void bootstrap().catch((error: unknown) => {
    console.error('Failed to bootstrap app:', error)
    app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  void workspaceManager?.destroy()
})
