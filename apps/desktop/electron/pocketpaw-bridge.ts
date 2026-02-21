import { randomUUID } from "node:crypto";

import {
  chatCancelStreamResponseSchema,
  chatSendMessageResponseSchema,
  chatStreamEventSchema,
  runStatusEventSchema,
  createIpcError,
  type ChatCancelStreamRequest,
  type ChatCancelStreamResponse,
  type ChatSendMessageRequest,
  type ChatSendMessageResponse,
  type ChatStreamEvent,
  type RunStatusEvent,
} from "@mmo-claw/ipc";

const SOCKET_CONNECTING = 0;
const SOCKET_OPEN = 1;
const SOCKET_CLOSED = 3;

type SocketEventName = "open" | "close" | "error" | "message";

export interface PocketpawSocket {
  readyState: number;
  send: (data: string) => void;
  close: () => void;
  addEventListener: (type: SocketEventName, listener: (event: unknown) => void) => void;
}

export interface PocketpawBridge {
  start: () => Promise<void>;
  stop: () => void;
  setChatEventListener: (listener: (event: ChatStreamEvent) => void) => void;
  setRunStatusEventListener: (listener: (event: RunStatusEvent) => void) => void;
  sendChatMessage: (request: ChatSendMessageRequest) => Promise<ChatSendMessageResponse>;
  cancelChatStream: (request: ChatCancelStreamRequest) => Promise<ChatCancelStreamResponse>;
}

export interface PocketpawBridgeOptions {
  wsUrl?: string;
  healthUrl?: string;
  reconnectDelayMs?: number;
  heartbeatIntervalMs?: number;
  heartbeatTimeoutMs?: number;
  createSocket?: (url: string) => PocketpawSocket;
  idFactory?: () => string;
  now?: () => Date;
  healthcheck?: () => Promise<boolean>;
}

type PendingRequest = {
  sessionId: string;
  correlationId: string;
};

const decodeMessageData = (payload: unknown): string | null => {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload instanceof ArrayBuffer) {
    return Buffer.from(payload).toString("utf8");
  }

  if (ArrayBuffer.isView(payload)) {
    return Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength).toString("utf8");
  }

  return null;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return null;
};

const toDateString = (value: unknown): string | null => {
  const dateValue = toStringValue(value);
  if (!dateValue) {
    return null;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const normalizeIncomingEvent = (
  payload: Record<string, unknown>,
  now: () => Date,
): ChatStreamEvent | null => {
  const typeValue = toStringValue(payload.type) ?? toStringValue(payload.event);
  if (!typeValue || !["queued", "token", "completed", "failed", "cancelled"].includes(typeValue)) {
    return null;
  }

  const sessionId = toStringValue(payload.sessionId) ?? toStringValue(payload.session_id);
  const requestId = toStringValue(payload.requestId) ?? toStringValue(payload.request_id);
  const correlationId = toStringValue(payload.correlationId) ?? toStringValue(payload.correlation_id);
  const occurredAt =
    toDateString(payload.occurredAt) ?? toDateString(payload.occurred_at) ?? now().toISOString();

  if (!sessionId || !requestId || !correlationId) {
    return null;
  }

  if (typeValue === "token") {
    const chunk = toStringValue(payload.chunk);
    if (!chunk) {
      return null;
    }

    return chatStreamEventSchema.parse({
      type: "token",
      sessionId,
      requestId,
      correlationId,
      occurredAt,
      chunk,
    });
  }

  if (typeValue === "completed") {
    const message = toStringValue(payload.message);
    if (!message) {
      return null;
    }

    return chatStreamEventSchema.parse({
      type: "completed",
      sessionId,
      requestId,
      correlationId,
      occurredAt,
      message,
    });
  }

  if (typeValue === "failed") {
    const message =
      toStringValue((payload.error as { message?: unknown } | undefined)?.message) ??
      toStringValue(payload.errorMessage) ??
      "PocketPaw chat stream failed.";

    return chatStreamEventSchema.parse({
      type: "failed",
      sessionId,
      requestId,
      correlationId,
      occurredAt,
      error: createIpcError("POCKETPAW_UNAVAILABLE", message),
    });
  }

  return chatStreamEventSchema.parse({
    type: typeValue,
    sessionId,
    requestId,
    correlationId,
    occurredAt,
  });
};

const normalizeRunStatus = (value: string): "queued" | "running" | "success" | "fail" | null => {
  if (["run.queued", "run_queued", "queued"].includes(value)) {
    return "queued";
  }

  if (["run.running", "run_running", "running"].includes(value)) {
    return "running";
  }

  if (["run.success", "run_success", "success", "completed"].includes(value)) {
    return "success";
  }

  if (["run.fail", "run_failed", "fail", "failed"].includes(value)) {
    return "fail";
  }

  return null;
};

const normalizeRunStatusEvent = (
  payload: Record<string, unknown>,
  now: () => Date,
): RunStatusEvent | null => {
  const typeValue =
    toStringValue(payload.type) ??
    toStringValue(payload.event) ??
    toStringValue(payload.status);
  if (!typeValue) {
    return null;
  }

  const status = normalizeRunStatus(typeValue);
  if (!status) {
    return null;
  }

  const runId = toStringValue(payload.runId) ?? toStringValue(payload.run_id);
  const correlationId =
    toStringValue(payload.correlationId) ??
    toStringValue(payload.correlation_id);
  const occurredAt =
    toDateString(payload.occurredAt) ??
    toDateString(payload.occurred_at) ??
    now().toISOString();

  if (!runId || !correlationId) {
    return null;
  }

  const sourceCandidate = toStringValue(payload.source);
  const source =
    sourceCandidate === "drawer" || sourceCandidate === "telegram" || sourceCandidate === "system"
      ? sourceCandidate
      : "system";
  const skillId = toStringValue(payload.skillId) ?? toStringValue(payload.skill_id) ?? undefined;

  if (status === "success") {
    const message = toStringValue(payload.message) ?? toStringValue(payload.summary) ?? undefined;
    return runStatusEventSchema.parse({
      status,
      runId,
      correlationId,
      occurredAt,
      source,
      skillId,
      message,
    });
  }

  if (status === "fail") {
    const message =
      toStringValue((payload.error as { message?: unknown } | undefined)?.message) ??
      toStringValue(payload.errorMessage) ??
      "Actor run failed.";

    return runStatusEventSchema.parse({
      status,
      runId,
      correlationId,
      occurredAt,
      source,
      skillId,
      error: createIpcError("INTERNAL_ERROR", message),
    });
  }

  return runStatusEventSchema.parse({
    status,
    runId,
    correlationId,
    occurredAt,
    source,
    skillId,
  });
};

const createPocketpawHealthcheck = (healthUrl: string): (() => Promise<boolean>) => {
  return async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

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

export const createPocketpawBridge = (
  options: PocketpawBridgeOptions = {},
): PocketpawBridge => {
  const wsUrl = options.wsUrl ?? "ws://127.0.0.1:8888/ws";
  const reconnectDelayMs = options.reconnectDelayMs ?? 2_000;
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 20_000;
  const heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 7_500;
  const createSocket =
    options.createSocket ??
    ((url: string): PocketpawSocket => {
      return new WebSocket(url) as unknown as PocketpawSocket;
    });
  const now = options.now ?? (() => new Date());
  const idFactory = options.idFactory ?? randomUUID;
  const healthcheck =
    options.healthcheck ?? createPocketpawHealthcheck(options.healthUrl ?? "http://127.0.0.1:8888");

  let socket: PocketpawSocket | null = null;
  let isRunning = false;
  let isConnecting = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let chatEventListener: ((event: ChatStreamEvent) => void) | null = null;
  let runStatusEventListener: ((event: RunStatusEvent) => void) | null = null;
  const pendingRequests = new Map<string, PendingRequest>();

  const clearReconnectTimer = (): void => {
    if (!reconnectTimer) {
      return;
    }

    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const clearHeartbeatTimeout = (): void => {
    if (!heartbeatTimeoutTimer) {
      return;
    }

    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = null;
  };

  const stopHeartbeat = (): void => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    clearHeartbeatTimeout();
  };

  const emitChatEvent = (event: ChatStreamEvent): void => {
    chatEventListener?.(event);
    if (event.type === "completed" || event.type === "failed" || event.type === "cancelled") {
      pendingRequests.delete(event.requestId);
    }
  };

  const emitRunStatusEvent = (event: RunStatusEvent): void => {
    runStatusEventListener?.(event);
  };

  const scheduleReconnect = (): void => {
    if (!isRunning || reconnectTimer) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, reconnectDelayMs);
  };

  const handleSocketMessage = (event: unknown): void => {
    const rawData =
      typeof event === "object" && event !== null && "data" in event
        ? (event as { data?: unknown }).data
        : event;

    const message = decodeMessageData(rawData);
    if (!message) {
      return;
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(message);
    } catch {
      return;
    }

    if (typeof parsedPayload !== "object" || parsedPayload === null) {
      return;
    }

    const payloadRecord = parsedPayload as Record<string, unknown>;
    if (payloadRecord.type === "pong") {
      clearHeartbeatTimeout();
      return;
    }

    const normalizedEvent = normalizeIncomingEvent(payloadRecord, now);
    if (normalizedEvent) {
      emitChatEvent(normalizedEvent);
      return;
    }

    const normalizedRunStatus = normalizeRunStatusEvent(payloadRecord, now);
    if (!normalizedRunStatus) {
      return;
    }

    emitRunStatusEvent(normalizedRunStatus);
  };

  const isSocketOpen = (): boolean => {
    return socket !== null && socket.readyState === SOCKET_OPEN;
  };

  const startHeartbeat = (): void => {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (!isSocketOpen()) {
        return;
      }

      try {
        socket?.send(
          JSON.stringify({
            type: "ping",
            occurredAt: now().toISOString(),
          }),
        );
      } catch {
        socket?.close();
        return;
      }

      clearHeartbeatTimeout();
      heartbeatTimeoutTimer = setTimeout(() => {
        if (!isSocketOpen()) {
          return;
        }

        socket?.close();
      }, heartbeatTimeoutMs);
    }, heartbeatIntervalMs);
  };

  const bindSocketEvents = (activeSocket: PocketpawSocket): void => {
    activeSocket.addEventListener("open", () => {
      clearReconnectTimer();
      startHeartbeat();
    });

    activeSocket.addEventListener("close", () => {
      stopHeartbeat();
      if (socket && socket.readyState === SOCKET_CLOSED) {
        socket = null;
      }

      if (isRunning) {
        scheduleReconnect();
      }
    });

    activeSocket.addEventListener("error", () => {
      if (isRunning) {
        scheduleReconnect();
      }
    });

    activeSocket.addEventListener("message", (event) => {
      handleSocketMessage(event);
    });
  };

  const connect = async (): Promise<void> => {
    if (!isRunning || isConnecting) {
      return;
    }

    if (socket && (socket.readyState === SOCKET_OPEN || socket.readyState === SOCKET_CONNECTING)) {
      return;
    }

    isConnecting = true;
    try {
      const reachable = await healthcheck();
      if (!reachable) {
        scheduleReconnect();
        return;
      }

      const nextSocket = createSocket(wsUrl);
      socket = nextSocket;
      bindSocketEvents(nextSocket);
    } catch {
      scheduleReconnect();
    } finally {
      isConnecting = false;
    }
  };

  const createUnavailableResponse = (
    message: string,
  ): ChatSendMessageResponse | ChatCancelStreamResponse => {
    return chatSendMessageResponseSchema.parse({
      ok: false,
      error: createIpcError("POCKETPAW_UNAVAILABLE", message),
    });
  };

  return {
    start: async (): Promise<void> => {
      if (isRunning) {
        return;
      }

      isRunning = true;
      await connect();
    },
    stop: (): void => {
      isRunning = false;
      clearReconnectTimer();
      stopHeartbeat();
      pendingRequests.clear();
      if (socket) {
        socket.close();
      }
      socket = null;
    },
    setChatEventListener: (listener: (event: ChatStreamEvent) => void): void => {
      chatEventListener = listener;
    },
    setRunStatusEventListener: (listener: (event: RunStatusEvent) => void): void => {
      runStatusEventListener = listener;
    },
    sendChatMessage: async (request: ChatSendMessageRequest): Promise<ChatSendMessageResponse> => {
      if (!isRunning) {
        await connect();
      }

      if (!isSocketOpen()) {
        const response = createUnavailableResponse(
          "PocketPaw WebSocket bridge is not connected.",
        ) as ChatSendMessageResponse;
        return response;
      }

      const requestId = `req-${idFactory()}`;
      const correlationId = request.correlationId ?? `corr-${idFactory()}`;
      if (pendingRequests.has(requestId)) {
        return chatSendMessageResponseSchema.parse({
          ok: false,
          error: createIpcError(
            "CHAT_STREAM_CONFLICT",
            `A stream with request id ${requestId} already exists.`,
          ),
        });
      }

      try {
        socket?.send(
          JSON.stringify({
            type: "chat.send",
            requestId,
            sessionId: request.sessionId,
            correlationId,
            source: request.source,
            message: request.message,
          }),
        );
      } catch (error) {
        return chatSendMessageResponseSchema.parse({
          ok: false,
          error: createIpcError(
            "INTERNAL_ERROR",
            error instanceof Error && error.message ? error.message : "Failed to send chat command.",
          ),
        });
      }

      pendingRequests.set(requestId, {
        sessionId: request.sessionId,
        correlationId,
      });

      emitChatEvent(
        chatStreamEventSchema.parse({
          type: "queued",
          sessionId: request.sessionId,
          requestId,
          correlationId,
          occurredAt: now().toISOString(),
        }),
      );

      return chatSendMessageResponseSchema.parse({
        ok: true,
        data: {
          sessionId: request.sessionId,
          requestId,
          correlationId,
          acceptedAt: now().toISOString(),
        },
      });
    },
    cancelChatStream: async (
      request: ChatCancelStreamRequest,
    ): Promise<ChatCancelStreamResponse> => {
      const pending = pendingRequests.get(request.requestId);
      if (!pending || pending.sessionId !== request.sessionId) {
        return chatCancelStreamResponseSchema.parse({
          ok: false,
          error: createIpcError(
            "CHAT_STREAM_NOT_FOUND",
            `No active chat stream for request ${request.requestId}.`,
          ),
        });
      }

      if (!isSocketOpen()) {
        const response = createUnavailableResponse(
          "PocketPaw WebSocket bridge is not connected.",
        ) as ChatCancelStreamResponse;
        return response;
      }

      try {
        socket?.send(
          JSON.stringify({
            type: "chat.cancel",
            sessionId: request.sessionId,
            requestId: request.requestId,
            correlationId: pending.correlationId,
          }),
        );
      } catch (error) {
        return chatCancelStreamResponseSchema.parse({
          ok: false,
          error: createIpcError(
            "INTERNAL_ERROR",
            error instanceof Error && error.message ? error.message : "Failed to cancel chat stream.",
          ),
        });
      }

      pendingRequests.delete(request.requestId);
      emitChatEvent(
        chatStreamEventSchema.parse({
          type: "cancelled",
          sessionId: request.sessionId,
          requestId: request.requestId,
          correlationId: pending.correlationId,
          occurredAt: now().toISOString(),
        }),
      );

      return chatCancelStreamResponseSchema.parse({
        ok: true,
        data: {
          sessionId: request.sessionId,
          requestId: request.requestId,
          cancelledAt: now().toISOString(),
        },
      });
    },
  };
};
