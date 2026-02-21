import { resolve } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import { resolveBundledUvBinaryPath } from "@mmo-claw/uvx-manager";

import { POCKETPAW_FORK_MANIFEST } from "./fork-manifest";

export interface PocketpawRuntimeHandle {
  process: ChildProcessWithoutNullStreams;
  pid: number;
}

export interface PocketpawSupervisor {
  start: () => Promise<PocketpawRuntimeHandle>;
  stop: () => Promise<void>;
  healthCheck: () => Promise<boolean>;
}

export const createPocketpawSupervisor = (
  baseDirectory: string,
): PocketpawSupervisor => {
  let currentHandle: PocketpawRuntimeHandle | null = null;

  /** Resolve the upstream submodule directory (Python project root) */
  const upstreamDir = resolve(
    baseDirectory,
    POCKETPAW_FORK_MANIFEST.upstreamSubmodulePath,
  );

  return {
    async start() {
      if (currentHandle) {
        return currentHandle;
      }

      const uvBinary = resolveBundledUvBinaryPath(baseDirectory);
      // Run from the upstream submodule source in dashboard mode so frontend
      // assets are served from `/` for embedded desktop views.
      const processHandle = spawn(
        uvBinary,
        ["run", "pocketpaw", "--host", "127.0.0.1", "--port", "8888"],
        {
          cwd: upstreamDir,
          env: {
            ...process.env,
            PYTHONUTF8: "1",
            PYTHONIOENCODING: "utf-8",
          },
        },
      );

      currentHandle = {
        process: processHandle,
        pid: processHandle.pid ?? -1,
      };

      processHandle.once("close", () => {
        currentHandle = null;
      });

      return currentHandle;
    },

    async stop() {
      if (!currentHandle) {
        return;
      }

      currentHandle.process.kill();
      currentHandle = null;
    },

    async healthCheck() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      try {
        const healthUrl = `${POCKETPAW_FORK_MANIFEST.localServiceUrl}/api/v1/health`;
        const response = await fetch(healthUrl, {
          method: "GET",
          signal: controller.signal,
        });
        return response.ok;
      } catch {
        return false;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
};
