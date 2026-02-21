import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { resolveBundledUvBinaryPath } from "@mmo-claw/uvx-manager";
import { POCKETPAW_FORK_MANIFEST } from "@mmo-claw/pocketpaw";

const DEFAULT_HEALTH_URL = `${POCKETPAW_FORK_MANIFEST.localServiceUrl}/api/v1/health`;

export type PocketpawDaemonState =
  | "idle"
  | "starting"
  | "running"
  | "retrying"
  | "error"
  | "stopped";

export interface PocketpawDaemonStatus {
  state: PocketpawDaemonState;
  message: string;
  reachable: boolean;
  managedProcess: boolean;
  pid: number | null;
  attempts: number;
  updatedAt: string;
}

interface ManagedPocketpawProcess {
  pid?: number;
  kill: () => void;
  once: (
    event: "close" | "error",
    listener: (...args: unknown[]) => void,
  ) => void;
}

export interface PocketpawDaemonManagerOptions {
  baseDirectory: string;
  healthUrl?: string;
  startupRetryDelayMs?: number;
  startupMaxAttempts?: number;
  monitorIntervalMs?: number;
  restartDelayMs?: number;
  uvBinaryPath?: string;
  uvBinaryExists?: (uvBinaryPath: string) => boolean;
  spawnProcess?: (
    command: string,
    args: string[],
    cwd: string,
  ) => ManagedPocketpawProcess;
  healthcheck?: () => Promise<boolean>;
  now?: () => Date;
}

export interface PocketpawDaemonManager {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  getStatus: () => PocketpawDaemonStatus;
  setStatusListener: (
    listener: (status: PocketpawDaemonStatus) => void,
  ) => void;
}

const wait = async (delayMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

const createPocketpawHealthcheck = (
  healthUrl: string,
): (() => Promise<boolean>) => {
  return async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);

    try {
      const response = await fetch(healthUrl, { signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  };
};

const resolvePocketpawCommandCwd = (baseDirectory: string): string => {
  const upstreamPath = POCKETPAW_FORK_MANIFEST.upstreamSubmodulePath;
  const candidates = [
    path.resolve(baseDirectory, upstreamPath),
    path.resolve(baseDirectory, "..", "pocketpaw", upstreamPath),
    path.resolve(baseDirectory, "..", "..", "pocketpaw", upstreamPath),
  ];

  const existingCandidate = candidates.find((candidatePath) =>
    fs.existsSync(candidatePath),
  );
  return existingCandidate ?? baseDirectory;
};

export const createPocketpawDaemonManager = (
  options: PocketpawDaemonManagerOptions,
): PocketpawDaemonManager => {
  const startupRetryDelayMs = options.startupRetryDelayMs ?? 1_500;
  const startupMaxAttempts = options.startupMaxAttempts ?? 5;
  const monitorIntervalMs = options.monitorIntervalMs ?? 15_000;
  const restartDelayMs = options.restartDelayMs ?? 5_000;
  const now = options.now ?? (() => new Date());
  const healthcheck =
    options.healthcheck ??
    createPocketpawHealthcheck(options.healthUrl ?? DEFAULT_HEALTH_URL);
  const spawnProcess =
    options.spawnProcess ??
    ((
      command: string,
      args: string[],
      cwd: string,
    ): ManagedPocketpawProcess => {
      const processHandle = spawn(command, args, {
        cwd,
        stdio: "ignore",
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8",
        },
      });
      processHandle.unref();
      return processHandle;
    });
  const uvBinaryExists =
    options.uvBinaryExists ?? ((path) => path === "uv" || fs.existsSync(path));
  const uvBinaryPath =
    options.uvBinaryPath ?? resolveBundledUvBinaryPath(options.baseDirectory);

  let managedProcess: ManagedPocketpawProcess | null = null;
  let statusListener: ((status: PocketpawDaemonStatus) => void) | null = null;
  let monitorTimer: ReturnType<typeof setInterval> | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let isRunning = false;
  let isRecovering = false;
  let status: PocketpawDaemonStatus = {
    state: "idle",
    message: "PocketPaw daemon manager is idle.",
    reachable: false,
    managedProcess: false,
    pid: null,
    attempts: 0,
    updatedAt: now().toISOString(),
  };

  const emitStatus = (
    patch: Partial<PocketpawDaemonStatus>,
  ): PocketpawDaemonStatus => {
    status = {
      ...status,
      ...patch,
      updatedAt: now().toISOString(),
    };
    statusListener?.(status);
    return status;
  };

  const clearMonitor = (): void => {
    if (!monitorTimer) {
      return;
    }

    clearInterval(monitorTimer);
    monitorTimer = null;
  };

  const clearRestartTimer = (): void => {
    if (!restartTimer) {
      return;
    }

    clearTimeout(restartTimer);
    restartTimer = null;
  };

  const scheduleRecovery = (delayMs = restartDelayMs): void => {
    if (!isRunning || restartTimer) {
      return;
    }

    restartTimer = setTimeout(() => {
      restartTimer = null;
      void recoverDaemon();
    }, delayMs);
  };

  const attachManagedProcessListeners = (
    processHandle: ManagedPocketpawProcess,
  ): void => {
    processHandle.once("close", () => {
      if (managedProcess !== processHandle) {
        return;
      }

      managedProcess = null;
      if (!isRunning) {
        return;
      }

      emitStatus({
        state: "retrying",
        message: "PocketPaw daemon exited. Restart policy is active.",
        reachable: false,
        managedProcess: false,
        pid: null,
      });
      clearMonitor();
      scheduleRecovery(0);
    });

    processHandle.once("error", (error) => {
      if (managedProcess !== processHandle) {
        return;
      }

      managedProcess = null;
      if (!isRunning) {
        return;
      }

      const reason =
        error instanceof Error && error.message
          ? error.message
          : "PocketPaw daemon process failed to start.";

      emitStatus({
        state: "error",
        message: `PocketPaw daemon process error: ${reason}`,
        reachable: false,
        managedProcess: false,
        pid: null,
      });
      clearMonitor();
      scheduleRecovery(0);
    });
  };

  const ensureManagedProcess = (): boolean => {
    if (managedProcess) {
      return true;
    }

    if (!uvBinaryExists(uvBinaryPath)) {
      emitStatus({
        state: "error",
        message: `Bundled uv binary is missing at ${uvBinaryPath}.`,
        reachable: false,
        managedProcess: false,
        pid: null,
      });
      return false;
    }

    try {
      const commandCwd = resolvePocketpawCommandCwd(options.baseDirectory);
      // Launch dashboard mode so the embedded WebContentsView can render
      // PocketPaw frontend assets from `/`.
      const processHandle = spawnProcess(
        uvBinaryPath,
        ["run", "pocketpaw", "--host", "127.0.0.1", "--port", "8888"],
        commandCwd,
      );
      managedProcess = processHandle;
      attachManagedProcessListeners(processHandle);
      return true;
    } catch (error) {
      emitStatus({
        state: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Failed to spawn PocketPaw daemon process.",
        reachable: false,
        managedProcess: false,
        pid: null,
      });
      return false;
    }
  };

  const monitorHealth = async (): Promise<void> => {
    if (!isRunning || isRecovering) {
      return;
    }

    const reachable = await healthcheck();
    if (reachable) {
      if (status.state !== "running" || !status.reachable) {
        emitStatus({
          state: "running",
          message: managedProcess
            ? "PocketPaw daemon is healthy."
            : "Connected to existing PocketPaw daemon.",
          reachable: true,
          managedProcess: Boolean(managedProcess),
          pid: managedProcess?.pid ?? null,
          attempts: 0,
        });
      }
      return;
    }

    emitStatus({
      state: "retrying",
      message: "PocketPaw health check failed. Attempting recovery.",
      reachable: false,
      managedProcess: Boolean(managedProcess),
      pid: managedProcess?.pid ?? null,
    });
    clearMonitor();
    scheduleRecovery(0);
  };

  const startHealthMonitor = (): void => {
    clearMonitor();
    monitorTimer = setInterval(() => {
      void monitorHealth();
    }, monitorIntervalMs);
  };

  const recoverDaemon = async (): Promise<void> => {
    if (!isRunning || isRecovering) {
      return;
    }

    isRecovering = true;
    clearRestartTimer();

    try {
      const alreadyReachable = await healthcheck();
      if (alreadyReachable) {
        emitStatus({
          state: "running",
          message: managedProcess
            ? "PocketPaw daemon is healthy."
            : "Connected to existing PocketPaw daemon.",
          reachable: true,
          managedProcess: Boolean(managedProcess),
          pid: managedProcess?.pid ?? null,
          attempts: 0,
        });
        startHealthMonitor();
        return;
      }

      for (let attempt = 1; attempt <= startupMaxAttempts; attempt += 1) {
        if (!isRunning) {
          return;
        }

        const state: PocketpawDaemonState =
          attempt === 1 ? "starting" : "retrying";
        emitStatus({
          state,
          message: `PocketPaw startup attempt ${attempt}/${startupMaxAttempts}.`,
          reachable: false,
          managedProcess: Boolean(managedProcess),
          pid: managedProcess?.pid ?? null,
          attempts: attempt,
        });

        const processReady = ensureManagedProcess();
        if (!processReady) {
          break;
        }

        emitStatus({
          state,
          message: `PocketPaw startup attempt ${attempt}/${startupMaxAttempts}.`,
          reachable: false,
          managedProcess: true,
          pid: managedProcess?.pid ?? null,
          attempts: attempt,
        });

        await wait(startupRetryDelayMs);
        if (!isRunning) {
          return;
        }

        const reachable = await healthcheck();
        if (reachable) {
          emitStatus({
            state: "running",
            message: "PocketPaw daemon is healthy.",
            reachable: true,
            managedProcess: Boolean(managedProcess),
            pid: managedProcess?.pid ?? null,
            attempts: attempt,
          });
          startHealthMonitor();
          return;
        }
      }

      emitStatus({
        state: "error",
        message:
          "PocketPaw daemon did not become healthy in time. Will retry automatically.",
        reachable: false,
        managedProcess: Boolean(managedProcess),
        pid: managedProcess?.pid ?? null,
      });
      scheduleRecovery();
    } finally {
      isRecovering = false;
    }
  };

  return {
    start: async (): Promise<void> => {
      if (isRunning) {
        return;
      }

      isRunning = true;
      emitStatus({
        state: "starting",
        message: "Initializing PocketPaw daemon startup.",
        reachable: false,
        managedProcess: Boolean(managedProcess),
        pid: managedProcess?.pid ?? null,
        attempts: 0,
      });
      await recoverDaemon();
    },
    stop: async (): Promise<void> => {
      isRunning = false;
      clearMonitor();
      clearRestartTimer();
      if (managedProcess) {
        managedProcess.kill();
        managedProcess = null;
      }

      emitStatus({
        state: "stopped",
        message: "PocketPaw daemon manager stopped.",
        reachable: false,
        managedProcess: false,
        pid: null,
        attempts: 0,
      });
    },
    restart: async (): Promise<void> => {
      await wait(0);
      await (async () => {
        isRunning = false;
        clearMonitor();
        clearRestartTimer();
        if (managedProcess) {
          managedProcess.kill();
          managedProcess = null;
        }
      })();

      isRunning = true;
      emitStatus({
        state: "starting",
        message: "Restarting PocketPaw daemon.",
        reachable: false,
        managedProcess: false,
        pid: null,
        attempts: 0,
      });
      await recoverDaemon();
    },
    getStatus: (): PocketpawDaemonStatus => status,
    setStatusListener: (
      listener: (status: PocketpawDaemonStatus) => void,
    ): void => {
      statusListener = listener;
      statusListener(status);
    },
  };
};
