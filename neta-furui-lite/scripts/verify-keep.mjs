// KeepPage と完了画面の見返し導線の検証
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync(".verify-shots", { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 420, height: 800 } })).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.goto("http://localhost:4732/");
await page.waitForSelector("text=ネタふるい Lite");

// ミステリートリックを仕分け（8枚: 残す3, 捨てる3, 保留2）
await page.click('button:has-text("ミステリートリック")');
await page.waitForSelector("text=未分類を仕分け中");
const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowLeft"];
for (const k of keys) {
  await page.keyboard.press(k);
  await page.waitForTimeout(450);
}
await page.waitForSelector("text=仕分け完了");
console.log("完了画面: 今回残したネタ表示 =", await page.locator("text=今回残したネタ").isVisible());
const keptList = await page.locator("ul li").allTextContents();
console.log("完了画面の残したリスト:", keptList.map((t) => t.trim()).join(" / "));
await page.screenshot({ path: ".verify-shots/k1-complete.png" });

// 完了画面 → 残したネタを見返す
await page.click('button:has-text("残したネタを見返す")');
await page.waitForSelector('h1:has-text("残したネタ")');
const bodyText = await page.locator("body").innerText();
console.log("KeepPage: 件数バッジ含む =", /3 件/.test(bodyText));
console.log("KeepPage: 概要全文表示 =", bodyText.includes("星座の配置に見立てた"));
console.log("KeepPage: フィールドlabel表示 =", bodyText.includes("トリック種別："));
await page.screenshot({ path: ".verify-shots/k2-keeppage.png", fullPage: true });

// カードタップ → 詳細モーダルで状態変更できるか
await page.click('h3:has-text("占星術殺人事件")');
await page.waitForTimeout(400);
console.log("詳細モーダル: 状態変更ボタン =", await page.locator('button:has-text("未分類に戻す")').isVisible());
await page.keyboard.press("Escape");
await page.locator(".bg-black\\/40").click({ position: { x: 10, y: 10 } }).catch(() => {});
await page.waitForTimeout(300);

// ホームに戻って導線ボタン確認
await page.click('nav button:has-text("ホーム")');
await page.waitForSelector("text=ネタふるい Lite");
const homeBtn = page.locator('button:has-text("残したネタを見返す")');
console.log("ホーム導線:", (await homeBtn.textContent()).trim());
await page.screenshot({ path: ".verify-shots/k3-home.png" });
await homeBtn.click();
await page.waitForSelector('h1:has-text("残したネタ")');
console.log("ホーム → KeepPage 遷移 OK");

await browser.close();
console.log("done");
