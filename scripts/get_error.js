const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", (exception) => {
    console.log(`Uncaught exception: "${exception}"`);
  });

  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  const content = await page.content();
  console.log("HTML:", content);

  await browser.close();
})();
