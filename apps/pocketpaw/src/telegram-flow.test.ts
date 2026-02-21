import { describe, expect, it } from "vitest";

import { executeTelegramFlow, parseTelegramInstagramCommand } from "./telegram-flow";

describe("telegram flow", () => {
  it("parses key-value telegram command payloads", () => {
    const parsed = parseTelegramInstagramCommand(
      "/ig-post profile=profile-1 media=/tmp/post.jpg caption=\"launch now\"",
    );

    expect(parsed).toEqual({
      profileId: "profile-1",
      mediaPath: "/tmp/post.jpg",
      caption: "launch now",
    });
  });

  it("routes valid command payload to the instagram skill", async () => {
    const result = await executeTelegramFlow({
      chatId: "chat-1",
      senderId: "user-1",
      text: "/ig-post profile-1 /tmp/post.jpg | from telegram",
    });

    expect(result.ok).toBe(true);
    expect(result.replyText).toContain("instagram-poster");
  });

  it("returns usage details for invalid commands", async () => {
    const result = await executeTelegramFlow({
      chatId: "chat-2",
      text: "/unknown-command",
    });

    expect(result.ok).toBe(false);
    expect(result.replyText).toContain("Use /ig-post");
  });
});
