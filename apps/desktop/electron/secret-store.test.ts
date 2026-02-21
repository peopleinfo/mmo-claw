import { describe, expect, it } from "vitest";

import { createDesktopSecretStore } from "./secret-store";

class FakeKeytar {
  private readonly store = new Map<string, string>();

  public async getPassword(service: string, account: string): Promise<string | null> {
    return this.store.get(`${service}:${account}`) ?? null;
  }

  public async setPassword(service: string, account: string, password: string): Promise<void> {
    this.store.set(`${service}:${account}`, password);
  }

  public async deletePassword(service: string, account: string): Promise<boolean> {
    return this.store.delete(`${service}:${account}`);
  }
}

describe("desktop secret store", () => {
  it("stores and masks secret values", async () => {
    const keytar = new FakeKeytar();
    const store = createDesktopSecretStore({
      filePath: "C:\\repo\\secret-settings.json",
      keytar,
      now: () => new Date("2026-02-21T00:00:00.000Z"),
    });

    const savedEntry = await store.setSecretSetting(
      "telegramBotToken",
      "123456:very-secret-token-value",
    );

    expect(savedEntry.hasValue).toBe(true);
    expect(savedEntry.maskedValue).toBe("********alue");
    expect(savedEntry.updatedAt).toBe("2026-02-21T00:00:00.000Z");
  });

  it("lists and clears stored secret values", async () => {
    const keytar = new FakeKeytar();
    const store = createDesktopSecretStore({
      filePath: "C:\\repo\\secret-settings.json",
      keytar,
      now: () => new Date("2026-02-21T00:00:00.000Z"),
    });

    await store.setSecretSetting("llmApiKey", "sk-live-abc123456789");
    const beforeClear = await store.listSecretSettings();
    expect(beforeClear.find((entry) => entry.key === "llmApiKey")?.hasValue).toBe(true);

    const cleared = await store.clearSecretSetting("llmApiKey");
    expect(cleared.hasValue).toBe(false);
    expect(cleared.maskedValue).toBeNull();
  });
});
