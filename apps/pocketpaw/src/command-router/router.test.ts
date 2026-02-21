import { describe, expect, it } from "vitest";

import { executeUnifiedCommand } from "./router";

describe("unified command router", () => {
  it("normalizes and executes telegram commands", async () => {
    const result = await executeUnifiedCommand(
      {
        source: "telegram",
        transportId: "chat-1",
        text: "/ig-post profile-1 /tmp/post.jpg | launch now",
        initiatedBy: "user-1",
      },
      {
        correlationIdFactory: () => "cid-1",
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected successful command result.");
    }

    expect(result.correlationId).toBe("telegram-cid-1");
    expect(result.command).toEqual({
      type: "run-skill",
      skillId: "instagram-poster",
      payload: {
        profileId: "profile-1",
        mediaPath: "/tmp/post.jpg",
        caption: "launch now",
        initiatedBy: "user-1",
      },
    });
    expect(result.replyText).toContain("instagram-poster");
  });

  it("returns UNKNOWN_COMMAND for unsupported commands", async () => {
    const result = await executeUnifiedCommand(
      {
        source: "telegram",
        transportId: "chat-2",
        text: "/unknown",
      },
      {
        correlationIdFactory: () => "cid-2",
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected failed command result.");
    }

    expect(result.correlationId).toBe("telegram-cid-2");
    expect(result.error.code).toBe("UNKNOWN_COMMAND");
    expect(result.error.retryable).toBe(false);
    expect(result.replyText).toContain("Use /ig-post");
  });

  it("returns INVALID_COMMAND_PAYLOAD when command args are malformed", async () => {
    const result = await executeUnifiedCommand(
      {
        source: "drawer",
        transportId: "session-1",
        text: "ig-post profile=profile-1",
      },
      {
        correlationIdFactory: () => "cid-3",
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected failed command result.");
    }

    expect(result.correlationId).toBe("drawer-cid-3");
    expect(result.error.code).toBe("INVALID_COMMAND_PAYLOAD");
    expect(result.error.retryable).toBe(false);
  });

  it("returns SKILL_EXECUTION_FAILED with retry guidance when skill execution throws", async () => {
    const result = await executeUnifiedCommand(
      {
        source: "drawer",
        transportId: "session-2",
        text: "ig-post profile-1 /tmp/post.jpg | from drawer",
      },
      {
        correlationIdFactory: () => "cid-4",
        executeSkillRequest: async () => {
          throw new Error("daemon unavailable");
        },
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected failed command result.");
    }

    expect(result.correlationId).toBe("drawer-cid-4");
    expect(result.error.code).toBe("SKILL_EXECUTION_FAILED");
    expect(result.error.retryable).toBe(true);
    expect(result.error.message).toBe("daemon unavailable");
  });
});
