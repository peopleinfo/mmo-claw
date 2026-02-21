import path from "node:path";

import { BrowserWindow, Menu, Tray, app } from "electron";

import { registerDesktopIpcHandlers } from "./ipc-handlers";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

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
  tray.setToolTip("MMO Claw");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open MMO Claw",
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
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

app.whenReady().then(() => {
  registerDesktopIpcHandlers();
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
});

app.on("window-all-closed", () => {
  // Keep daemon-style behavior; tray controls lifecycle on desktop platforms.
});
