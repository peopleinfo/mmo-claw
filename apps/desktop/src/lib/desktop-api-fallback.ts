import type {
  ChatCancelStreamRequest,
  ChatStreamEvent,
  DesktopIpcApi,
  RunStatusEvent,
  RuntimeTool,
  SecretSetting,
  SecretSettingKey,
} from "@mmo-claw/ipc";

interface StoredSecretValue {
  value: string;
  updatedAt: string;
}

const runtimeTools: RuntimeTool[] = [
  {
    id: "camoufox",
    displayName: "Camoufox",
    packageName: "camoufox",
  },
  {
    id: "pocketpaw-fork",
    displayName: "PocketPaw Fork",
    packageName: "mmo-claw-pocketpaw-fork",
  },
];

const secretSettingLabels: Record<SecretSettingKey, string> = {
  telegramBotToken: "Telegram Bot Token",
  llmApiKey: "LLM API Key",
};

const secretValues = new Map<SecretSettingKey, StoredSecretValue>();
const chatStreamListeners = new Set<(event: ChatStreamEvent) => void>();
const runStatusListeners = new Set<(event: RunStatusEvent) => void>();

const nowIso = (): string => {
  return new Date().toISOString();
};

const createId = (prefix: string): string => {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const maskSecretValue = (value: string): string => {
  if (value.length <= 4) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 2)}${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-2)}`;
};

const createSecretSettingEntry = (key: SecretSettingKey): SecretSetting => {
  const entry = secretValues.get(key);
  return {
    key,
    label: secretSettingLabels[key],
    hasValue: Boolean(entry),
    maskedValue: entry ? maskSecretValue(entry.value) : null,
    updatedAt: entry?.updatedAt ?? null,
  };
};

const emitChatStreamEvent = (event: ChatStreamEvent): void => {
  for (const listener of chatStreamListeners) {
    listener(event);
  }
};

const emitRunStatusEvent = (event: RunStatusEvent): void => {
  for (const listener of runStatusListeners) {
    listener(event);
  }
};

const scheduleMockRunLifecycle = (
  correlationId: string,
  source: RunStatusEvent["source"],
  message: string,
): void => {
  const runId = createId("run");
  const queuedEvent: RunStatusEvent = {
    status: "queued",
    runId,
    correlationId,
    occurredAt: nowIso(),
    source,
  };
  emitRunStatusEvent(queuedEvent);

  setTimeout(() => {
    emitRunStatusEvent({
      status: "running",
      runId,
      correlationId,
      occurredAt: nowIso(),
      source,
    });
  }, 60);

  setTimeout(() => {
    emitRunStatusEvent({
      status: "success",
      runId,
      correlationId,
      occurredAt: nowIso(),
      source,
      message,
    });
  }, 160);
};

const scheduleMockChatStream = (
  sessionId: string,
  requestId: string,
  correlationId: string,
  command: string,
): void => {
  setTimeout(() => {
    emitChatStreamEvent({
      type: "token",
      sessionId,
      requestId,
      correlationId,
      occurredAt: nowIso(),
      chunk: "Simulated response: ",
    });
  }, 70);

  setTimeout(() => {
    emitChatStreamEvent({
      type: "completed",
      sessionId,
      requestId,
      correlationId,
      occurredAt: nowIso(),
      message: `Command executed: ${command}`,
    });
  }, 180);
};

const createBrowserDesktopApi = (): DesktopIpcApi => {
  return {
    getHealthSnapshot: async () => {
      return {
        ok: true,
        data: {
          checkedAt: nowIso(),
          pocketpawReachable: true,
          daemonState: "running",
          databaseReady: true,
          runtimeManagerReady: true,
        },
      };
    },
    openPocketpaw: async () => {
      return {
        ok: true,
      };
    },
    listRuntimeTools: async () => {
      return {
        ok: true,
        data: runtimeTools,
      };
    },
    installRuntimeTool: async (request) => {
      return {
        ok: true,
        data: {
          toolId: request.toolId,
          status: "installed",
          message: "Mock install command prepared.",
          command: ["uvx", request.toolId, "install"],
        },
      };
    },
    uninstallRuntimeTool: async (request) => {
      return {
        ok: true,
        data: {
          toolId: request.toolId,
          status: "uninstalled",
          message: "Mock uninstall command prepared.",
          command: ["uvx", request.toolId, "uninstall"],
        },
      };
    },
    listSecretSettings: async () => {
      return {
        ok: true,
        data: [
          createSecretSettingEntry("telegramBotToken"),
          createSecretSettingEntry("llmApiKey"),
        ],
      };
    },
    setSecretSetting: async (request) => {
      const trimmedValue = request.value.trim();
      if (!trimmedValue) {
        return {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Value cannot be empty.",
          },
        };
      }

      secretValues.set(request.key, {
        value: trimmedValue,
        updatedAt: nowIso(),
      });

      return {
        ok: true,
        data: createSecretSettingEntry(request.key),
      };
    },
    clearSecretSetting: async (request) => {
      secretValues.delete(request.key);
      return {
        ok: true,
        data: createSecretSettingEntry(request.key),
      };
    },
    sendChatMessage: async (request) => {
      const requestId = createId("req");
      const correlationId = request.correlationId ?? createId("corr");
      const source = request.source ?? "drawer";

      scheduleMockRunLifecycle(correlationId, source, `Completed ${request.message}`);
      scheduleMockChatStream(request.sessionId, requestId, correlationId, request.message);

      return {
        ok: true,
        data: {
          sessionId: request.sessionId,
          requestId,
          correlationId,
          acceptedAt: nowIso(),
        },
      };
    },
    cancelChatStream: async (request: ChatCancelStreamRequest) => {
      emitChatStreamEvent({
        type: "cancelled",
        sessionId: request.sessionId,
        requestId: request.requestId,
        correlationId: createId("corr"),
        occurredAt: nowIso(),
      });

      return {
        ok: true,
        data: {
          sessionId: request.sessionId,
          requestId: request.requestId,
          cancelledAt: nowIso(),
        },
      };
    },
    onChatStreamEvent: (listener) => {
      chatStreamListeners.add(listener);
      return () => {
        chatStreamListeners.delete(listener);
      };
    },
    onRunStatusEvent: (listener) => {
      runStatusListeners.add(listener);
      return () => {
        runStatusListeners.delete(listener);
      };
    },
  };
};

export const ensureDesktopApi = (): void => {
  const browserWindow = window as Window & { desktopApi?: DesktopIpcApi };
  if (browserWindow.desktopApi) {
    return;
  }

  browserWindow.desktopApi = createBrowserDesktopApi();
};
