import { describe, expect, it } from "vitest";

import { createPocketpawDaemonManager } from "./pocketpaw-daemon";

class FakeManagedProcess {
  public readonly pid: number;
  public killed = false;
  private closeListener: ((...args: unknown[]) => void) | null = null;

  public constructor(pid: number) {
    this.pid = pid;
  }

  public kill(): void {
    this.killed = true;
    this.emitClose();
  }

  public once(event: "close", listener: (...args: unknown[]) => void): void {
    if (event === "close") {
      this.closeListener = listener;
    }
  }

  public emitClose(): void {
    this.closeListener?.(0, null);
  }
}

const waitFor = async (
  predicate: () => boolean,
  timeoutMs = 350,
): Promise<void> => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5);
    });
  }
};

describe("pocketpaw daemon manager", () => {
  it("uses existing daemon on normal boot without spawning", async () => {
    let spawnCalls = 0;
    const manager = createPocketpawDaemonManager({
      baseDirectory: "C:\\repo",
      uvBinaryPath: "C:\\repo\\resources\\bin\\uv.exe",
      uvBinaryExists: () => true,
      healthcheck: async () => true,
      startupRetryDelayMs: 1,
      monitorIntervalMs: 100_000,
      spawnProcess: () => {
        spawnCalls += 1;
        return new FakeManagedProcess(spawnCalls);
      },
    });

    await manager.start();

    expect(spawnCalls).toBe(0);
    expect(manager.getStatus().state).toBe("running");
    expect(manager.getStatus().managedProcess).toBe(false);

    await manager.stop();
  });

  it("spawns daemon and reaches healthy state on first-launch retries", async () => {
    const processes: FakeManagedProcess[] = [];
    const healthchecks = [false, false, true];
    const manager = createPocketpawDaemonManager({
      baseDirectory: "C:\\repo",
      uvBinaryPath: "C:\\repo\\resources\\bin\\uv.exe",
      uvBinaryExists: () => true,
      healthcheck: async () => healthchecks.shift() ?? true,
      startupRetryDelayMs: 2,
      startupMaxAttempts: 4,
      monitorIntervalMs: 100_000,
      spawnProcess: () => {
        const next = new FakeManagedProcess(processes.length + 1);
        processes.push(next);
        return next;
      },
    });

    await manager.start();

    expect(processes.length).toBe(1);
    expect(manager.getStatus().state).toBe("running");
    expect(manager.getStatus().managedProcess).toBe(true);

    await manager.stop();
    expect(processes[0]?.killed).toBe(true);
  });

  it("restarts the daemon when managed process exits", async () => {
    const processes: FakeManagedProcess[] = [];
    const healthchecks = [false, true, false, true];
    const manager = createPocketpawDaemonManager({
      baseDirectory: "C:\\repo",
      uvBinaryPath: "C:\\repo\\resources\\bin\\uv.exe",
      uvBinaryExists: () => true,
      healthcheck: async () => healthchecks.shift() ?? true,
      startupRetryDelayMs: 2,
      startupMaxAttempts: 3,
      monitorIntervalMs: 100_000,
      restartDelayMs: 1,
      spawnProcess: () => {
        const next = new FakeManagedProcess(processes.length + 1);
        processes.push(next);
        return next;
      },
    });

    await manager.start();
    expect(processes.length).toBe(1);
    expect(manager.getStatus().state).toBe("running");

    processes[0]?.emitClose();

    await waitFor(() => {
      return processes.length >= 2 && manager.getStatus().state === "running";
    });

    expect(processes.length).toBeGreaterThanOrEqual(2);
    expect(manager.getStatus().pid).toBe(processes[1]?.pid ?? null);

    await manager.stop();
  });
});
