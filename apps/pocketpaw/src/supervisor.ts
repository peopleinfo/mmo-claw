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

export const createPocketpawSupervisor = (baseDirectory: string): PocketpawSupervisor => {
  let currentHandle: PocketpawRuntimeHandle | null = null;

  return {
    async start() {
      if (currentHandle) {
        return currentHandle;
      }

      const uvBinary = resolveBundledUvBinaryPath(baseDirectory);
      const processHandle = spawn(uvBinary, ["tool", "run", "pocketpaw"], {
        cwd: baseDirectory,
      });

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
        const response = await fetch(POCKETPAW_FORK_MANIFEST.localServiceUrl, {
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
