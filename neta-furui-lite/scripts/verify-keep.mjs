// KeepPage（フッタータブ＋データセット選択チップ）の検証
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

mkdirSync(".verify-shots", { recursive: true });
const sampleJson = readFileSync(
  "C:/ClaudeCode/apps/NetaChoice/shared/sample-dataset.json",
  "utf-8"
);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 420, height: 800 } })).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.goto("http://localhost:4732/");
await page.waitForSelector("text=ネタふるい Lite");

// フッターに4タブあるか
const navLabels = await page.locator("nav button span").allTextContents();
console.log("フッタータブ:", navLabels.join(" / "));

// 2データセット分の残すを作る: ミステリー2件 + 衛生講話1件
await page.click('button:has-text("ミステリートリック")');
await page.waitForSelector("text=未分類を仕分け中");
for (const k of ["ArrowRight", "ArrowRight", "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft"]) {
  await page.keyboard.press(k);
  await page.waitForTimeout(400);
}
await page.waitForSelector("text=仕分け完了");

// 衛生講話ネタをインポートして1件残す
await page.click('nav button:has-text("ホーム")');
await page.click("text=インポート / エクスポート");
await page.fill("textarea", sampleJson);
await page.click('button:has-text("インポート"):not(:has-text("ファイル"))');
await page.waitForSelector("text=カードを追加しました");
await page.click('nav button:has-text("仕分け")');
await page.click('button:has-text("衛生講話ネタ")');
await page.waitForSelector("text=未分類を仕分け中");
for (const k of ["ArrowRight", "ArrowLeft", "ArrowLeft"]) {
  await page.keyboard.press(k);
  await page.waitForTimeout(400);
}
await page.waitForSelector("text=仕分け完了");

// フッターから残したネタへ
await page.click('nav button:has-text("残したネタ")');
await page.waitForSelector('h1:has-text("残したネタ")');
const chips = await page.locator("div.overflow-x-auto button").allTextContents();
console.log("選択チップ:", chips.map((t) => t.trim()).join(" / "));
await page.screenshot({ path: ".verify-shots/n1-keep-all.png" });

// 衛生講話ネタだけに絞る
await page.click('div.overflow-x-auto button:has-text("衛生講話ネタ")');
await page.waitForTimeout(300);
const body = await page.locator("body").innerText();
console.log("絞り込み: 衛生講話のカード表示 =", body.includes("夜勤明けの仮眠"));
console.log("絞り込み: ミステリーが非表示 =", !body.includes("占星術殺人事件"));
await page.screenshot({ path: ".verify-shots/n2-keep-filtered.png" });

// すべてに戻す
await page.click('div.overflow-x-auto button:has-text("すべて")');
await page.waitForTimeout(300);
const bodyAll = await page.locator("body").innerText();
console.log("すべて: 両データセット表示 =", bodyAll.includes("占星術殺人事件") && bodyAll.includes("夜勤明けの仮眠"));

await browser.close();
console.log("done");
