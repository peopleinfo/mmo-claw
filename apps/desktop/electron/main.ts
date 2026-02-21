import path from "node:path";

import { BrowserWindow, Menu, Tray, app } from "electron";

import { registerDesktopIpcHandlers } from "./ipc-handlers";
import type { PocketpawBridge } from "./pocketpaw-bridge";
import {
  createPocketpawDaemonManager,
  type PocketpawDaemonManager,
  type PocketpawDaemonState,
} from "./pocketpaw-daemon";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pocketpawBridge: PocketpawBridge | null = null;
let pocketpawDaemonManager: PocketpawDaemonManager | null = null;
let isQuitting = false;

const formatDaemonState = (state: PocketpawDaemonState): string => {
  if (state === "running") {
    return "Running";
  }

  if (state === "starting") {
    return "Starting";
  }

  if (state === "retrying") {
    return "Retrying";
  }

  if (state === "error") {
    return "Error";
  }

  if (state === "stopped") {
    return "Stopped";
  }

  return "Idle";
};

const updateTrayPresentation = (): void => {
  if (!tray) {
    return;
  }

  const daemonStatus = pocketpawDaemonManager?.getStatus();
  const daemonLabel = daemonStatus ? formatDaemonState(daemonStatus.state) : "Idle";
  const daemonMessage = daemonStatus?.message ?? "Daemon status unavailable.";

  tray.setToolTip(`MMO Claw | PocketPaw: ${daemonLabel}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: `PocketPaw: ${daemonLabel}`,
        enabled: false,
      },
      {
        label: daemonMessage,
        enabled: false,
      },
      {
        type: "separator",
      },
      {
        label: "Open MMO Claw",
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      {
        label: "Restart PocketPaw Daemon",
        click: () => {
          void pocketpawDaemonManager?.restart();
        },
      },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
};

const createMainWindow = (): BrowserWindow => {
  const windowInstance = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const rendererIndexPath = path.join(__dirname, "..", "renderer", "index.html");
  if (process.env.VITE_DEV_SERVER_URL) {
    void windowInstance.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void windowInstance.loadFile(rendererIndexPath);
  }

  windowInstance.once("ready-to-show", () => {
    windowInstance.show();
  });

  windowInstance.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      windowInstance.hide();
    }
  });

  return windowInstance;
};

const createTray = (): void => {
  if (tray || !mainWindow) {
    return;
  }

  tray = new Tray(process.execPath);
  updateTrayPresentation();
};

app.whenReady().then(() => {
  pocketpawDaemonManager = createPocketpawDaemonManager({
    baseDirectory: app.getAppPath(),
  });
  pocketpawDaemonManager.setStatusListener(() => {
    updateTrayPresentation();
  });
  void pocketpawDaemonManager.start();

  pocketpawBridge = registerDesktopIpcHandlers({
    pocketpawDaemonManager,
  });
  mainWindow = createMainWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  pocketpawBridge?.stop();
  pocketpawBridge = null;
  void pocketpawDaemonManager?.stop();
  pocketpawDaemonManager = null;
});

app.on("window-all-closed", () => {
  // Keep daemon-style behavior; tray controls lifecycle on desktop platforms.
});
