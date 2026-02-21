import { describe, expect, it } from "vitest";

import { executeInstagramPosterSkill } from "./instagram-poster-skill";

describe("instagram poster skill wrapper", () => {
  it("maps actor output to a pocketpaw skill response", async () => {
    const result = await executeInstagramPosterSkill({
      profileId: "profile-1",
      caption: "Skill message",
      mediaPath: "/tmp/post.jpg",
    });

    expect(result.ok).toBe(true);
    expect(result.skillId).toBe("instagram-poster");
    expect(result.message).toContain("instagram-poster");
  });
});
