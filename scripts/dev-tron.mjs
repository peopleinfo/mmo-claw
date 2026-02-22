import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const ROOT_DIR = fileURLToPath(new URL("..", import.meta.url));
const POCKETPAW_UPSTREAM_DIR = fileURLToPath(
  new URL("../apps/pocketpaw/upstream", import.meta.url),
);

const host = "127.0.0.1";
const requestedPort = Number(process.env.POCKETPAW_PORT ?? "8890");

const children = [];
let shuttingDown = false;

const createChildEnv = (extraEnv = {}) => {
  const env = { ...process.env, ...extraEnv };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
};

const spawnChild = (command, args, cwd, env) => {
  const child = spawn(command, args, {
    cwd,
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
    windowsHide: false,
  });
  children.push(child);
  return child;
};

const isHealthy = async (healthUrl) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_500);

  try {
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
};

const killChild = (child) => {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/PID", `${child.pid}`, "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
};

const shutdown = (code = 0) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const child of children) {
    killChild(child);
  }

  setTimeout(() => {
    process.exit(code);
  }, 250);
};

const waitForPocketpaw = async (healthUrl, timeoutMs = 60_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isHealthy(healthUrl)) {
      return true;
    }
    await delay(800);
  }

  return false;
};

const canBindPort = async (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => {
      resolve(false);
    });
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
};

const findAvailablePort = async (startPort, span = 20) => {
  for (let offset = 0; offset <= span; offset += 1) {
    const candidate = startPort + offset;
    if (await canBindPort(candidate)) {
      return candidate;
    }
  }

  throw new Error(`No open port found starting from ${startPort}.`);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const run = async () => {
  const port = await findAvailablePort(requestedPort);
  const baseUrl = `http://${host}:${port}`;
  const healthUrl = `${baseUrl}/api/v1/health`;
  if (port !== requestedPort) {
    console.warn(
      `[dev:tron] Port ${requestedPort} busy, using ${port} instead.`,
    );
  }

  console.log(`[dev:tron] Starting PocketPaw dashboard on ${baseUrl} ...`);
  const pocketpawChild = spawnChild(
    "uv",
    ["run", "pocketpaw", "--dev", "--host", host, "--port", `${port}`],
    POCKETPAW_UPSTREAM_DIR,
    createChildEnv(),
  );

  pocketpawChild.once("exit", (exitCode) => {
    if (shuttingDown) {
      return;
    }
    console.error(`[dev:tron] PocketPaw exited with code ${exitCode ?? 1}.`);
    shutdown(exitCode ?? 1);
  });

  const ready = await waitForPocketpaw(healthUrl);
  if (!ready) {
    console.error(
      `[dev:tron] PocketPaw was not healthy at ${healthUrl} within 60s.`,
    );
    shutdown(1);
    return;
  }

  console.log("[dev:tron] PocketPaw ready. Starting desktop dev shell ...");
  const desktopChild = spawnChild(
    "pnpm",
    ["--filter", "@mmo-claw/desktop", "run", "dev"],
    ROOT_DIR,
    createChildEnv({
      MMO_CLAW_DISABLE_POCKETPAW_DAEMON: "1",
      VITE_POCKETPAW_BASE_URL: baseUrl,
    }),
  );

  desktopChild.once("exit", (exitCode) => {
    if (shuttingDown) {
      return;
    }
    console.error(`[dev:tron] Desktop exited with code ${exitCode ?? 1}.`);
    shutdown(exitCode ?? 1);
  });
};

void run().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Unknown dev:tron failure.";
  console.error(`[dev:tron] ${message}`);
  shutdown(1);
});
