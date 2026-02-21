import path from "node:path";

import { z } from "zod";

export const runtimeToolIdSchema = z.enum(["camoufox", "pocketpaw-fork"]);
export type RuntimeToolId = z.infer<typeof runtimeToolIdSchema>;

export interface RuntimeToolDefinition {
  id: RuntimeToolId;
  displayName: string;
  packageName: string;
}

export interface RuntimeCommandPlan {
  command: string;
  args: string[];
  toolId: RuntimeToolId;
}

export interface RuntimeCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

export type RuntimeCommandExecutor = (
  plan: RuntimeCommandPlan,
) => Promise<RuntimeCommandResult>;

const runtimeTools: RuntimeToolDefinition[] = [
  {
    id: "camoufox",
    displayName: "Camoufox",
    packageName: "camoufox",
  },
  {
    id: "pocketpaw-fork",
    displayName: "PocketPaw Fork",
    packageName: "pocketpaw",
  },
];

export const listRuntimeTools = (): RuntimeToolDefinition[] => {
  return [...runtimeTools];
};

export const resolveBundledUvBinaryPath = (
  baseDirectory: string,
  platform: NodeJS.Platform = process.platform,
): string => {
  if (platform === "win32") {
    return path.join(baseDirectory, "resources", "bin", "uv.exe");
  }

  return path.join(baseDirectory, "resources", "bin", "uv");
};

const findTool = (toolId: RuntimeToolId): RuntimeToolDefinition => {
  const tool = runtimeTools.find((candidate) => candidate.id === toolId);
  if (!tool) {
    throw new Error(`Unknown runtime tool: ${toolId}`);
  }
  return tool;
};

export const createInstallPlan = (
  uvBinaryPath: string,
  toolId: RuntimeToolId,
): RuntimeCommandPlan => {
  const tool = findTool(toolId);
  return {
    command: uvBinaryPath,
    args: ["tool", "install", tool.packageName],
    toolId,
  };
};

export const createUninstallPlan = (
  uvBinaryPath: string,
  toolId: RuntimeToolId,
): RuntimeCommandPlan => {
  const tool = findTool(toolId);
  return {
    command: uvBinaryPath,
    args: ["tool", "uninstall", tool.packageName],
    toolId,
  };
};

export interface RuntimeManager {
  installTool: (toolId: RuntimeToolId) => Promise<RuntimeCommandResult>;
  uninstallTool: (toolId: RuntimeToolId) => Promise<RuntimeCommandResult>;
  installCamoufox: () => Promise<RuntimeCommandResult>;
  installPocketpawFork: () => Promise<RuntimeCommandResult>;
}

export const createRuntimeManager = (
  uvBinaryPath: string,
  executor: RuntimeCommandExecutor,
): RuntimeManager => {
  return {
    installTool(toolId) {
      return executor(createInstallPlan(uvBinaryPath, toolId));
    },
    uninstallTool(toolId) {
      return executor(createUninstallPlan(uvBinaryPath, toolId));
    },
    installCamoufox() {
      return executor(createInstallPlan(uvBinaryPath, "camoufox"));
    },
    installPocketpawFork() {
      return executor(createInstallPlan(uvBinaryPath, "pocketpaw-fork"));
    },
  };
};
