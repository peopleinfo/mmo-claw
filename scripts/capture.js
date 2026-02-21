const { _electron: electron } = require("@playwright/test");

(async () => {
  console.log("Launching electron...");
  const electronApp = await electron.launch({
    args: ["apps/desktop/dist/electron/main.js"],
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: "http://localhost:5173",
      ELECTRON_ENABLE_LOGGING: "1",
    },
  });

  console.log("Waiting for first window...");
  const window = await electronApp.firstWindow();

  // Wait a bit for React to render
  await window.waitForTimeout(3000);

  console.log("Taking screenshot...");
  await window.screenshot({ path: "electron-screenshot.png" });

  // Get console logs
  const logs = await window.evaluate(() => {
    return document.body.innerText;
  });
  console.log("Window Text Content:", logs);

  await electronApp.close();
})();
