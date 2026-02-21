import { expect, test } from "@playwright/test";

test.describe("desktop renderer shell", () => {
  test("renders dashboard health snapshot", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("PocketPaw Daemon State:", { exact: false })).toBeVisible();
    await expect(page.getByText("Latest Run Status")).toBeVisible();
  });

  test("opens right drawer and sends a chat command", async ({ page }) => {
    await page.goto("/chat");

    await page.getByRole("button", { name: "Open Chat" }).click();
    await expect(page.getByRole("heading", { name: "Command Drawer" })).toBeVisible();

    await page.getByRole("button", { name: "Health Check" }).click();
    await expect(page.locator(".chat-session__input")).toHaveValue("/health check runtime");

    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Simulated response:", { exact: false })).toBeVisible();
  });

  test("updates and clears secret settings", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByText("Secret settings loaded.")).toBeVisible();
    const telegramSetting = page
      .locator(".settings-panel__item")
      .filter({ hasText: "Telegram Bot Token" });

    await telegramSetting.locator("input").fill("123456:ABCDEFGHIJKLMNOPQRSTUVWX");
    await telegramSetting.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Telegram Bot Token saved.")).toBeVisible();

    await telegramSetting.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByText("Telegram Bot Token cleared.")).toBeVisible();
  });

  test("shows run status feed after command execution", async ({ page }) => {
    await page.goto("/chat");

    await page.getByRole("button", { name: "Open Chat" }).click();
    await page.locator(".chat-session__input").fill("/runs list recent");
    await page.getByRole("button", { name: "Send" }).click();

    await page.getByRole("link", { name: "Runs" }).click();
    await expect(page.getByRole("heading", { name: "Runs" })).toBeVisible();

    await expect
      .poll(async () => page.locator(".run-feed__item").count(), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);
    await expect(page.locator(".run-feed__status--success")).toBeVisible();
  });
});
