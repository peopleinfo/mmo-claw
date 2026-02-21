import { describe, expect, it } from "vitest";

import { executeDrawerFlow } from "./drawer-flow";

describe("drawer flow", () => {
  it("routes valid drawer command through unified router", async () => {
    const result = await executeDrawerFlow(
      {
        sessionId: "session-1",
        senderId: "user-1",
        text: "ig-post profile-1 /tmp/post.jpg | from drawer",
      },
      {
        correlationIdFactory: () => "drawer-cid-1",
      },
    );

    expect(result.ok).toBe(true);
    expect(result.correlationId).toBe("drawer-drawer-cid-1");
    expect(result.replyText).toContain("instagram-poster");
  });

  it("returns stable error code for invalid payload", async () => {
    const result = await executeDrawerFlow(
      {
        sessionId: "session-2",
        text: "ig-post profile=profile-1",
      },
      {
        correlationIdFactory: () => "drawer-cid-2",
      },
    );

    expect(result.ok).toBe(false);
    expect(result.correlationId).toBe("drawer-drawer-cid-2");
    expect(result.errorCode).toBe("INVALID_COMMAND_PAYLOAD");
    expect(result.replyText).toContain("Use /ig-post");
  });
});
