import { describe, expect, it } from "vitest";

import {
  healthSnapshotResponseSchema,
  openPocketpawRequestSchema,
  runtimeToolOperationRequestSchema,
  runtimeToolOperationResponseSchema,
} from "./contracts";
import { createIpcError, validatePayload } from "./validators";

describe("ipc contracts", () => {
  it("accepts a valid health response payload", () => {
    const payload = {
      ok: true,
      data: {
        checkedAt: "2026-02-20T00:00:00.000Z",
        pocketpawReachable: true,
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
});
