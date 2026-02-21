import { describe, expect, it } from "vitest";

import { createBrowserProviderRegistry, createCamoufoxLaunchPlan, createBrowserLaunchPlan, createStaticProvider, listSupportedProviders } from "./index";

describe("browser provider layer", () => {
  it("creates a camoufox launch plan with proxy and profile context", () => {
    const plan = createCamoufoxLaunchPlan({
      profileId: "profile-1",
      proxy: {
        id: "proxy-1",
        protocol: "http",
        host: "127.0.0.1",
        port: 8888,
      },
      fingerprintId: "fp-1",
      headless: true,
      startUrl: "https://www.instagram.com",
      userDataDir: "/tmp/mmo-claw/profile-1",
    });

    expect(plan.provider).toBe("camoufox");
    expect(plan.command).toBe("uvx");
    expect(plan.args).toContain("--proxy-server");
    expect(plan.proxyUrl).toBe("http://127.0.0.1:8888");
  });

  it("resolves providers from a registry", () => {
    const registry = createBrowserProviderRegistry([
      createStaticProvider("playwright-stealth", {
        command: "node",
        baseArgs: ["playwright-stealth-provider.js"],
      }),
    ]);

    const plan = createBrowserLaunchPlan(
      {
        profileId: "profile-1",
        provider: "playwright-stealth",
        proxy: null,
        headless: true,
      },
      registry,
    );

    expect(plan.provider).toBe("playwright-stealth");
    expect(plan.command).toBe("node");
  });

  it("lists the expected provider set", () => {
    expect(listSupportedProviders()).toEqual([
      "camoufox",
      "playwright-stealth",
      "puppeteer-stealth",
      "playwright-vanilla",
    ]);
  });
});
