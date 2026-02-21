import { describe, expect, it } from "vitest";

import { desktopPages } from "./pages";

describe("desktop pages", () => {
  it("contains all required shell routes", () => {
    const paths = desktopPages.map((page) => page.path);

    expect(paths).toContain("/marketplace");
    expect(paths).toContain("/settings");
    expect(paths).toContain("/chat");
    expect(desktopPages).toHaveLength(10);
  });
});
