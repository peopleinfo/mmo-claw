import { describe, expect, it } from "vitest";

import { runInstagramPosterActor } from "./actor";

describe("instagram poster actor", () => {
  it("creates a camoufox-backed execution report", async () => {
    const result = await runInstagramPosterActor({
      profileId: "profile-1",
      caption: "Hello world",
      mediaPath: "/tmp/post.jpg",
    });

    expect(result.ok).toBe(true);
    expect(result.launchPlan.provider).toBe("camoufox");
    expect(result.postId.startsWith("ig-")).toBe(true);
    expect(result.steps).toContain("submit-post");
  });

  it("supports dependency injection for posting", async () => {
    const result = await runInstagramPosterActor(
      {
        profileId: "profile-2",
        caption: "Custom path",
        mediaPath: "/tmp/post-2.jpg",
      },
      {
        performPost: async () => ({ postId: "ig-custom" }),
      },
    );

    expect(result.postId).toBe("ig-custom");
  });
});
