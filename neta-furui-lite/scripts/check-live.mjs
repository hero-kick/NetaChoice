import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 420, height: 800 } })).newPage();
page.on("console", (m) => console.log("CONSOLE:", m.type(), m.text()));
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("requestfailed", (r) => console.log("REQFAIL:", r.url(), r.failure()?.errorText));
const resp = await page.goto("https://hero-kick.github.io/NetaChoice/", { waitUntil: "networkidle" });
console.log("HTTP:", resp.status());
await page.waitForTimeout(2000);
console.log("BODY TEXT:", (await page.locator("body").innerText()).slice(0, 200) || "(empty)");
await page.screenshot({ path: ".verify-shots/live-check.png" });
await browser.close();
