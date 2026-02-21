import { describe, expect, it } from "vitest";

import {
  chatCancelStreamResponseSchema,
  chatSendMessageRequestSchema,
  chatStreamEventSchema,
  healthSnapshotResponseSchema,
  openPocketpawRequestSchema,
  runtimeToolOperationRequestSchema,
  runtimeToolOperationResponseSchema,
  runStatusEventSchema,
  secretSettingMutationResponseSchema,
  secretSettingUpsertRequestSchema,
} from "./contracts";
import { createIpcError, validatePayload } from "./validators";

describe("ipc contracts", () => {
  it("accepts a valid health response payload", () => {
    const payload = {
      ok: true,
      data: {
        checkedAt: "2026-02-20T00:00:00.000Z",
        pocketpawReachable: true,
        daemonState: "running",
        databaseReady: true,
        runtimeManagerReady: false,
      },
    };

    const result = validatePayload(healthSnapshotResponseSchema, payload);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid openPocketpaw request payload", () => {
    const result = validatePayload(openPocketpawRequestSchema, {
      baseUrl: "not-a-url",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.message).toContain("baseUrl");
    }
  });

  it("creates a stable ipc error contract", () => {
    const error = createIpcError("INTERNAL_ERROR", "Unexpected failure");
    expect(error).toEqual({
      code: "INTERNAL_ERROR",
      message: "Unexpected failure",
    });
  });

  it("accepts a valid runtime tool operation response payload", () => {
    const payload = {
      ok: true,
      data: {
        toolId: "camoufox",
        status: "installed",
        message: "Install planned",
        command: ["uv", "tool", "install", "camoufox"],
      },
    };

    const result = validatePayload(runtimeToolOperationResponseSchema, payload);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid runtime tool request payload", () => {
    const result = validatePayload(runtimeToolOperationRequestSchema, {
      toolId: "unknown-tool",
    });

    expect(result.ok).toBe(false);
  });

  it("accepts valid chat send-message payload", () => {
    const result = validatePayload(chatSendMessageRequestSchema, {
      sessionId: "session-1",
      message: "run it",
      source: "drawer",
    });

    expect(result.ok).toBe(true);
  });

  it("accepts token chat stream events", () => {
    const result = validatePayload(chatStreamEventSchema, {
      type: "token",
      sessionId: "session-1",
      requestId: "request-1",
      correlationId: "corr-1",
      occurredAt: "2026-02-21T00:00:00.000Z",
      chunk: "hello",
    });

    expect(result.ok).toBe(true);
  });

  it("supports chat-specific error codes in cancel response", () => {
    const result = validatePayload(chatCancelStreamResponseSchema, {
      ok: false,
      error: {
        code: "CHAT_STREAM_NOT_FOUND",
        message: "No active stream for request-1",
      },
    });

    expect(result.ok).toBe(true);
  });

  it("accepts run status events for actor lifecycle feed", () => {
    const result = validatePayload(runStatusEventSchema, {
      status: "running",
      runId: "run-1",
      correlationId: "corr-1",
      occurredAt: "2026-02-21T00:00:00.000Z",
      source: "drawer",
      skillId: "instagram-poster",
    });

    expect(result.ok).toBe(true);
  });

  it("validates secret setting upsert request payloads", () => {
    const result = validatePayload(secretSettingUpsertRequestSchema, {
      key: "telegramBotToken",
      value: "123456:token-value-example",
    });

    expect(result.ok).toBe(true);
  });

  it("accepts secret setting mutation responses", () => {
    const result = validatePayload(secretSettingMutationResponseSchema, {
      ok: true,
      data: {
        key: "llmApiKey",
        label: "LLM API Key",
        hasValue: true,
        maskedValue: "********abcd",
        updatedAt: "2026-02-21T00:00:00.000Z",
      },
    });

    expect(result.ok).toBe(true);
  });
});
