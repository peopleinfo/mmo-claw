import fs from "node:fs";
import path from "node:path";

import { WebContentsView, BrowserWindow, app, ipcMain, shell } from "electron";

import { checkDatabaseHealth } from "@mmo-claw/db";
import {
  chatCancelStreamRequestSchema,
  chatCancelStreamResponseSchema,
  chatSendMessageRequestSchema,
  chatSendMessageResponseSchema,
  desktopChannels,
  healthSnapshotResponseSchema,
  openPocketpawRequestSchema,
  openPocketpawResponseSchema,
  pocketpawViewBoundsSchema,
  pocketpawViewResponseSchema,
  showPocketpawViewRequestSchema,
  secretSettingClearRequestSchema,
  secretSettingListResponseSchema,
  secretSettingMutationResponseSchema,
  secretSettingUpsertRequestSchema,
  runtimeToolOperationRequestSchema,
  runtimeToolOperationResponseSchema,
  runtimeToolListResponseSchema,
  type RuntimeToolId,
  type SecretSettingKey,
} from "@mmo-claw/ipc";
import {
  createInstallPlan,
  createUninstallPlan,
  listRuntimeTools,
  resolveBundledUvBinaryPath,
} from "@mmo-claw/uvx-manager";

import {
  createPocketpawBridge,
  type PocketpawBridge,
} from "./pocketpaw-bridge";
import type { PocketpawDaemonManager } from "./pocketpaw-daemon";
import {
  createDesktopSecretStore,
  type DesktopSecretStore,
} from "./secret-store";

const DEFAULT_POCKETPAW_BASE_URL = "http://127.0.0.1:8888";

// Singleton WebContentsView for the embedded PocketPaw dashboard.
let pocketpawView: WebContentsView | null = null;
let pocketpawViewWindow: BrowserWindow | null = null;
let pocketpawViewUrl = DEFAULT_POCKETPAW_BASE_URL;

const normalizePocketpawBaseUrl = (value?: string): string => {
  if (!value) {
    return DEFAULT_POCKETPAW_BASE_URL;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return DEFAULT_POCKETPAW_BASE_URL;
    }

    parsed.pathname = "/";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_POCKETPAW_BASE_URL;
  }
};

const toPocketpawWsUrl = (baseUrl: string): string => {
  const wsUrl = new URL(baseUrl);
  wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
  wsUrl.pathname = "/ws";
  wsUrl.search = "";
  wsUrl.hash = "";
  return wsUrl.toString();
};

const getOrCreatePocketpawView = (url: string): WebContentsView => {
  // If the URL changed, destroy the old view and load fresh.
  if (pocketpawView && url !== pocketpawViewUrl) {
    teardownPocketpawView();
    pocketpawView.webContents.close();
    pocketpawView = null;
  }
  pocketpawViewUrl = url;

  if (!pocketpawView) {
    pocketpawView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    void pocketpawView.webContents.loadURL(url);
  }

  return pocketpawView;
};

function teardownPocketpawView(): void {
  if (pocketpawViewWindow && pocketpawView) {
    try {
      pocketpawViewWindow.contentView.removeChildView(pocketpawView);
    } catch {
      // Window may already be destroyed.
    }
  }
  pocketpawViewWindow = null;
}

const checkPocketpawReachable = async (baseUrl: string): Promise<boolean> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  const healthUrl = new URL("/api/v1/health", `${baseUrl}/`).toString();

  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const toRuntimeOperationResponse = (
  toolId: RuntimeToolId,
  status: "installed" | "uninstalled",
  commandPlan: { command: string; args: string[] },
) => {
  const uvExists = fs.existsSync(commandPlan.command);
  if (!uvExists) {
    return runtimeToolOperationResponseSchema.parse({
      ok: false,
      error: {
        code: "RUNTIME_UNAVAILABLE",
        message: `Bundled uv binary is missing at ${commandPlan.command}`,
      },
    });
  }

  return runtimeToolOperationResponseSchema.parse({
    ok: true,
    data: {
      toolId,
      status,
      message: "Command planned. Execute via runtime worker in the next slice.",
      command: [commandPlan.command, ...commandPlan.args],
    },
  });
};

export interface DesktopIpcHandlerDependencies {
  pocketpawBridge?: PocketpawBridge;
  pocketpawDaemonManager?: PocketpawDaemonManager;
  pocketpawBaseUrl?: string;
  secretStore?: DesktopSecretStore;
}

const validateSecretValue = (
  key: SecretSettingKey,
  value: string,
): string | null => {
  if (key === "telegramBotToken") {
    const telegramTokenPattern = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;
    if (!telegramTokenPattern.test(value)) {
      return "Telegram token must match bot token format (digits:secret).";
    }
    return null;
  }

  if (value.length < 10) {
    return "API keys must be at least 10 characters.";
  }

  return null;
};

export const registerDesktopIpcHandlers = (
  dependencies: DesktopIpcHandlerDependencies = {},
): PocketpawBridge => {
  const pocketpawBaseUrl = normalizePocketpawBaseUrl(
    dependencies.pocketpawBaseUrl ??
      process.env.VITE_POCKETPAW_BASE_URL ??
      process.env.MMO_CLAW_POCKETPAW_BASE_URL,
  );
  const pocketpawHealthUrl = new URL(
    "/api/v1/health",
    `${pocketpawBaseUrl}/`,
  ).toString();
  const pocketpawBridge =
    dependencies.pocketpawBridge ??
    createPocketpawBridge({
      wsUrl: toPocketpawWsUrl(pocketpawBaseUrl),
      healthUrl: pocketpawHealthUrl,
    });
  const secretStore =
    dependencies.secretStore ??
    createDesktopSecretStore({
      filePath: path.join(app.getPath("userData"), "secret-settings.json"),
    });
  pocketpawBridge.setChatEventListener((event) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(desktopChannels.chatStreamEvent, event);
    }
  });
  pocketpawBridge.setRunStatusEventListener((event) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(desktopChannels.runStatusEvent, event);
    }
  });
  void pocketpawBridge.start();

  ipcMain.handle(desktopChannels.getHealthSnapshot, async () => {
    const pocketpawReachable = await checkPocketpawReachable(pocketpawBaseUrl);
    const databasePath = path.join(app.getPath("userData"), "mmo-claw.sqlite");
    const databaseHealth = checkDatabaseHealth(databasePath);
    // In dev mode the daemon uses the system 'uv' from PATH; in packaged builds
    // it uses the bundled binary. Mirror that same resolution here so that
    // runtimeManagerReady correctly reflects uv availability in both modes.
    const uvPath = app.isPackaged
      ? resolveBundledUvBinaryPath(app.getAppPath())
      : "uv";
    const runtimeManagerReady = uvPath === "uv" || fs.existsSync(uvPath);

    return healthSnapshotResponseSchema.parse({
      ok: true,
      data: {
        checkedAt: new Date().toISOString(),
        pocketpawReachable,
        daemonState:
          dependencies.pocketpawDaemonManager?.getStatus().state ?? "idle",
        databaseReady: databaseHealth.databaseReady,
        runtimeManagerReady,
      },
    });
  });

  ipcMain.handle(desktopChannels.openPocketpaw, async (_event, payload) => {
    const requestResult = openPocketpawRequestSchema.safeParse(payload);
    if (!requestResult.success) {
      return openPocketpawResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: requestResult.error.issues
            .map((issue) => issue.message)
            .join("; "),
        },
      });
    }

    await shell.openExternal(requestResult.data.baseUrl);
    return openPocketpawResponseSchema.parse({ ok: true });
  });

  ipcMain.handle(desktopChannels.showPocketpawView, (_event, payload) => {
    const request = showPocketpawViewRequestSchema.safeParse(payload);
    if (!request.success) {
      return pocketpawViewResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: request.error.issues.map((i) => i.message).join("; "),
        },
      });
    }

    const win =
      BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (!win) {
      return pocketpawViewResponseSchema.parse({
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "No active window found." },
      });
    }

    const view = getOrCreatePocketpawView(request.data.url);

    // Reattach to a new window if necessary.
    if (pocketpawViewWindow !== win) {
      teardownPocketpawView();
      pocketpawViewWindow = win;
      win.contentView.addChildView(view);
    }

    const { x, y, width, height } = request.data.bounds;
    view.setBounds({ x, y, width, height });
    view.setVisible(true);

    return pocketpawViewResponseSchema.parse({ ok: true });
  });

  ipcMain.handle(desktopChannels.hidePocketpawView, () => {
    if (pocketpawView) {
      pocketpawView.setVisible(false);
    }
    return pocketpawViewResponseSchema.parse({ ok: true });
  });

  ipcMain.handle(desktopChannels.resizePocketpawView, (_event, payload) => {
    const bounds = pocketpawViewBoundsSchema.safeParse(payload);
    if (!bounds.success) {
      return pocketpawViewResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: bounds.error.issues.map((i) => i.message).join("; "),
        },
      });
    }

    if (pocketpawView) {
      const { x, y, width, height } = bounds.data;
      pocketpawView.setBounds({ x, y, width, height });
    }
    return pocketpawViewResponseSchema.parse({ ok: true });
  });

  ipcMain.handle(desktopChannels.listRuntimeTools, async () => {
    return runtimeToolListResponseSchema.parse({
      ok: true,
      data: listRuntimeTools(),
    });
  });

  ipcMain.handle(
    desktopChannels.installRuntimeTool,
    async (_event, payload) => {
      const request = runtimeToolOperationRequestSchema.safeParse(payload);
      if (!request.success) {
        return runtimeToolOperationResponseSchema.parse({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: request.error.issues
              .map((issue) => issue.message)
              .join("; "),
          },
        });
      }

      const uvPath = resolveBundledUvBinaryPath(app.getAppPath());
      const plan = createInstallPlan(uvPath, request.data.toolId);
      return toRuntimeOperationResponse(request.data.toolId, "installed", plan);
    },
  );

  ipcMain.handle(
    desktopChannels.uninstallRuntimeTool,
    async (_event, payload) => {
      const request = runtimeToolOperationRequestSchema.safeParse(payload);
      if (!request.success) {
        return runtimeToolOperationResponseSchema.parse({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: request.error.issues
              .map((issue) => issue.message)
              .join("; "),
          },
        });
      }

      const uvPath = resolveBundledUvBinaryPath(app.getAppPath());
      const plan = createUninstallPlan(uvPath, request.data.toolId);
      return toRuntimeOperationResponse(
        request.data.toolId,
        "uninstalled",
        plan,
      );
    },
  );

  ipcMain.handle(desktopChannels.listSecretSettings, async () => {
    try {
      const entries = await secretStore.listSecretSettings();
      return secretSettingListResponseSchema.parse({
        ok: true,
        data: entries,
      });
    } catch (error) {
      return secretSettingListResponseSchema.parse({
        ok: false,
        error: {
          code: "SECRET_STORAGE_UNAVAILABLE",
          message:
            error instanceof Error && error.message
              ? error.message
              : "Failed to load secret settings.",
        },
      });
    }
  });

  ipcMain.handle(desktopChannels.setSecretSetting, async (_event, payload) => {
    const request = secretSettingUpsertRequestSchema.safeParse(payload);
    if (!request.success) {
      return secretSettingMutationResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: request.error.issues
            .map((issue) => issue.message)
            .join("; "),
        },
      });
    }

    const trimmedValue = request.data.value.trim();
    const validationMessage = validateSecretValue(
      request.data.key,
      trimmedValue,
    );
    if (validationMessage) {
      return secretSettingMutationResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: validationMessage,
        },
      });
    }

    try {
      const result = await secretStore.setSecretSetting(
        request.data.key,
        trimmedValue,
      );
      return secretSettingMutationResponseSchema.parse({
        ok: true,
        data: result,
      });
    } catch (error) {
      return secretSettingMutationResponseSchema.parse({
        ok: false,
        error: {
          code: "SECRET_STORAGE_UNAVAILABLE",
          message:
            error instanceof Error && error.message
              ? error.message
              : "Failed to store secret value.",
        },
      });
    }
  });

  ipcMain.handle(
    desktopChannels.clearSecretSetting,
    async (_event, payload) => {
      const request = secretSettingClearRequestSchema.safeParse(payload);
      if (!request.success) {
        return secretSettingMutationResponseSchema.parse({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: request.error.issues
              .map((issue) => issue.message)
              .join("; "),
          },
        });
      }

      try {
        const result = await secretStore.clearSecretSetting(request.data.key);
        return secretSettingMutationResponseSchema.parse({
          ok: true,
          data: result,
        });
      } catch (error) {
        return secretSettingMutationResponseSchema.parse({
          ok: false,
          error: {
            code: "SECRET_STORAGE_UNAVAILABLE",
            message:
              error instanceof Error && error.message
                ? error.message
                : "Failed to clear secret value.",
          },
        });
      }
    },
  );

  ipcMain.handle(desktopChannels.sendChatMessage, async (_event, payload) => {
    const request = chatSendMessageRequestSchema.safeParse(payload);
    if (!request.success) {
      return chatSendMessageResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: request.error.issues
            .map((issue) => issue.message)
            .join("; "),
        },
      });
    }

    return pocketpawBridge.sendChatMessage(request.data);
  });

  ipcMain.handle(desktopChannels.cancelChatStream, async (_event, payload) => {
    const request = chatCancelStreamRequestSchema.safeParse(payload);
    if (!request.success) {
      return chatCancelStreamResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: request.error.issues
            .map((issue) => issue.message)
            .join("; "),
        },
      });
    }

    return pocketpawBridge.cancelChatStream(request.data);
  });

  return pocketpawBridge;
};
