import fs from "node:fs";
import path from "node:path";

import { BrowserWindow, app, ipcMain, shell } from "electron";

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
import { createDesktopSecretStore, type DesktopSecretStore } from "./secret-store";

const checkPocketpawReachable = async (baseUrl: string): Promise<boolean> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(baseUrl, { signal: controller.signal });
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
  const pocketpawBridge = dependencies.pocketpawBridge ?? createPocketpawBridge();
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
    const pocketpawReachable = await checkPocketpawReachable("http://127.0.0.1:8888");
    const databasePath = path.join(app.getPath("userData"), "mmo-claw.sqlite");
    const databaseHealth = checkDatabaseHealth(databasePath);
    const uvPath = resolveBundledUvBinaryPath(app.getAppPath());

    return healthSnapshotResponseSchema.parse({
      ok: true,
      data: {
        checkedAt: new Date().toISOString(),
        pocketpawReachable,
        daemonState: dependencies.pocketpawDaemonManager?.getStatus().state ?? "idle",
        databaseReady: databaseHealth.databaseReady,
        runtimeManagerReady: fs.existsSync(uvPath),
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
          message: requestResult.error.issues.map((issue) => issue.message).join("; "),
        },
      });
    }

    await shell.openExternal(requestResult.data.baseUrl);
    return openPocketpawResponseSchema.parse({ ok: true });
  });

  ipcMain.handle(desktopChannels.listRuntimeTools, async () => {
    return runtimeToolListResponseSchema.parse({
      ok: true,
      data: listRuntimeTools(),
    });
  });

  ipcMain.handle(desktopChannels.installRuntimeTool, async (_event, payload) => {
    const request = runtimeToolOperationRequestSchema.safeParse(payload);
    if (!request.success) {
      return runtimeToolOperationResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: request.error.issues.map((issue) => issue.message).join("; "),
        },
      });
    }

    const uvPath = resolveBundledUvBinaryPath(app.getAppPath());
    const plan = createInstallPlan(uvPath, request.data.toolId);
    return toRuntimeOperationResponse(request.data.toolId, "installed", plan);
  });

  ipcMain.handle(desktopChannels.uninstallRuntimeTool, async (_event, payload) => {
    const request = runtimeToolOperationRequestSchema.safeParse(payload);
    if (!request.success) {
      return runtimeToolOperationResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: request.error.issues.map((issue) => issue.message).join("; "),
        },
      });
    }

    const uvPath = resolveBundledUvBinaryPath(app.getAppPath());
    const plan = createUninstallPlan(uvPath, request.data.toolId);
    return toRuntimeOperationResponse(request.data.toolId, "uninstalled", plan);
  });

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
          message: request.error.issues.map((issue) => issue.message).join("; "),
        },
      });
    }

    const trimmedValue = request.data.value.trim();
    const validationMessage = validateSecretValue(request.data.key, trimmedValue);
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

  ipcMain.handle(desktopChannels.clearSecretSetting, async (_event, payload) => {
    const request = secretSettingClearRequestSchema.safeParse(payload);
    if (!request.success) {
      return secretSettingMutationResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: request.error.issues.map((issue) => issue.message).join("; "),
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
  });

  ipcMain.handle(desktopChannels.sendChatMessage, async (_event, payload) => {
    const request = chatSendMessageRequestSchema.safeParse(payload);
    if (!request.success) {
      return chatSendMessageResponseSchema.parse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: request.error.issues.map((issue) => issue.message).join("; "),
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
          message: request.error.issues.map((issue) => issue.message).join("; "),
        },
      });
    }

    return pocketpawBridge.cancelChatStream(request.data);
  });

  return pocketpawBridge;
};
