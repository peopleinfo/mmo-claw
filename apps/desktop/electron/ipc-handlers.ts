import fs from "node:fs";
import path from "node:path";

import { app, ipcMain, shell } from "electron";

import { checkDatabaseHealth } from "@mmo-claw/db";
import {
  desktopChannels,
  healthSnapshotResponseSchema,
  openPocketpawRequestSchema,
  openPocketpawResponseSchema,
  runtimeToolOperationRequestSchema,
  runtimeToolOperationResponseSchema,
  runtimeToolListResponseSchema,
  type RuntimeToolId,
} from "@mmo-claw/ipc";
import {
  createInstallPlan,
  createUninstallPlan,
  listRuntimeTools,
  resolveBundledUvBinaryPath,
} from "@mmo-claw/uvx-manager";

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

export const registerDesktopIpcHandlers = (): void => {
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
};
