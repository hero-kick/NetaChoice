// 実機UI検証: プレビューサーバー上のアプリを Chromium で操作する
// 実行: node scripts/verify-ui.mjs
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:4731/";
const SHOTS = "C:/ClaudeCode/apps/NetaChoice/neta-furui-lite/.verify-shots";
mkdirSync(SHOTS, { recursive: true });

const sampleJson = readFileSync(
  "C:/ClaudeCode/apps/NetaChoice/shared/sample-dataset.json",
  "utf-8"
);

let step = 0;
function log(msg) {
  step++;
  console.log(`[${step}] ${msg}`);
}
async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false });
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 420, height: 800 },
  acceptDownloads: true,
});
const page = await context.newPage();
page.on("dialog", (d) => d.accept());

// --- 1. 初回起動（サンプルデータ投入） ---
await page.goto(BASE);
await page.waitForSelector("text=ネタふるい Lite");
log("起動: ホーム表示 = " + (await page.locator("h1").first().textContent()));
await shot(page, "01-home");

// --- 2. インポート画面で sample-dataset.json を貼り付けインポート ---
await page.click("text=インポート / エクスポート");
await page.waitForSelector("text=JSONインポート");
await page.fill("textarea", sampleJson);
await page.click('button:has-text("インポート"):not(:has-text("ファイル"))');
await page.waitForSelector("text=カードを追加しました");
const importMsg = await page
  .locator("div.rounded-xl", { hasText: "カードを追加しました" })
  .first()
  .textContent();
log("貼り付けインポート成功: " + importMsg.trim());
await shot(page, "02-import-success");

// --- 3. 同じJSONをもう一度 → 重複スキップでエラーになるはず（probe） ---
await page.fill("textarea", sampleJson);
await page.click('button:has-text("インポート"):not(:has-text("ファイル"))');
await page.waitForTimeout(400);
const dupMsg = await page
  .locator("div.rounded-xl.text-sm")
  .first()
  .textContent();
log("再インポート(probe): " + dupMsg.trim());
await shot(page, "03-import-duplicate");

// --- 4. 仕分け画面: 衛生講話ネタを選ぶ ---
await page.click('nav button:has-text("仕分け")');
await page.waitForSelector("text=データセットを選んでください");
await shot(page, "04-sort-picker");
await page.click('button:has-text("衛生講話ネタ")');
await page.waitForSelector("text=未分類を仕分け中");
const firstCard = await page.locator("h3").first().textContent();
log("仕分け開始: 1枚目 = " + firstCard);
await shot(page, "05-sort-card1");

// --- 5. キーボード操作: → 残す, ← 捨てる, ↑ 保留 ---
await page.keyboard.press("ArrowRight"); // keep
await page.waitForTimeout(500);
log("ArrowRight → 残す: 2枚目 = " + (await page.locator("h3").first().textContent()));
await page.keyboard.press("ArrowLeft"); // discard
await page.waitForTimeout(500);
log("ArrowLeft → 捨てる: 3枚目 = " + (await page.locator("h3").first().textContent()));
await page.keyboard.press("ArrowUp"); // hold
await page.waitForTimeout(600);
const doneVisible = await page.locator("text=仕分け完了").isVisible();
log("ArrowUp → 保留: 完了画面 = " + doneVisible);
await shot(page, "06-sort-complete");

// --- 6. probe: 完了画面で Z（undo）→ カードが戻るか ---
await page.keyboard.press("z");
await page.waitForTimeout(500);
const backCard = await page.locator("h3").first().textContent();
log("Z(undo) probe: 復帰したカード = " + backCard);
await shot(page, "07-undo");
await page.keyboard.press("ArrowUp"); // もう一度保留に
await page.waitForTimeout(600);

// --- 7. 保留の再仕分けモード ---
const resortBtn = page.locator('button:has-text("件を再仕分けする")');
const resortLabel = await resortBtn.textContent();
log("完了画面の再仕分けボタン: " + resortLabel.trim());
await resortBtn.click();
await page.waitForSelector("text=保留を見直し中");
await shot(page, "08-hold-mode");
const holdStayBtn = await page.locator('button:has-text("保留のまま")').isVisible();
log("保留モード: 「保留のまま」ボタン表示 = " + holdStayBtn);
await page.click('button:has-text("保留のまま")');
await page.waitForTimeout(600);
const holdDone = await page.locator("text=保留の見直し完了").isVisible();
const holdDoneMsg = await page.locator("p.text-gray-500.text-sm").first().textContent();
log(`保留のまま → 完了画面 = ${holdDone} / メッセージ = ${holdDoneMsg.trim()}`);
await shot(page, "09-hold-complete");

// --- 8. 「残す」だけJSONエクスポート ---
await page.click('nav button:has-text("ホーム")');
await page.click("text=インポート / エクスポート");
await page.waitForSelector("text=エクスポート");
const [keepDl] = await Promise.all([
  page.waitForEvent("download"),
  page.click('button:has-text("「残す」だけをJSONで出力")'),
]);
const keepPath = join(SHOTS, keepDl.suggestedFilename());
await keepDl.saveAs(keepPath);
const keepData = JSON.parse(readFileSync(keepPath, "utf-8"));
log(
  `keepエクスポート: ファイル名=${keepDl.suggestedFilename()} / cards=${keepData.cards.length} / 全てkeep=${keepData.cards.every((c) => c.status === "keep")} / schemaVersion=${keepData.schemaVersion}`
);

// --- 9. 全データバックアップをダウンロード ---
const [backupDl] = await Promise.all([
  page.waitForEvent("download"),
  page.click('button:has-text("全データをJSONで保存")'),
]);
const backupPath = join(SHOTS, backupDl.suggestedFilename());
await backupDl.saveAs(backupPath);
const backupData = JSON.parse(readFileSync(backupPath, "utf-8"));
log(
  `バックアップ: ファイル名=${backupDl.suggestedFilename()} / datasets=${backupData.datasets.length} / cards=${backupData.cards.length}`
);

// --- 10. localStorage を消して初期状態に戻し、バックアップをファイル選択で復元 ---
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector("text=ネタふるい Lite");
await page.click("text=インポート / エクスポート");
await page.waitForSelector("text=JSONインポート");
await page.setInputFiles('input[type="file"]', backupPath);
await page.waitForSelector("text=カードを追加しました");
const restoreMsg = await page
  .locator("div.rounded-xl", { hasText: "カードを追加しました" })
  .first()
  .textContent();
log("ファイル選択で復元: " + restoreMsg.trim());
await shot(page, "10-restore");

// --- 11. 復元後の状態確認: データ概要の内訳 ---
const stats = {};
for (const label of ["未分類", "残す", "捨てる", "保留"]) {
  const row = page.locator("section div.flex.justify-between", { hasText: label }).last();
  stats[label] = (await row.locator("span").nth(1).textContent()).trim();
}
log("復元後のデータ概要: " + JSON.stringify(stats));
await shot(page, "11-restored-stats");

// --- 12. 一覧で「残す」フィルタ ---
await page.click('nav button:has-text("一覧")');
await page.waitForSelector('h1:has-text("一覧")');
await page.click('button:has-text("残す")');
await page.waitForTimeout(300);
const keepCount = await page.locator("text=件").first().textContent();
const keepTitle = await page.locator(".space-y-2 h3").first().textContent().catch(() => "(なし)");
log(`一覧・残すフィルタ: ${keepCount.trim()} / 先頭 = ${keepTitle}`);
await shot(page, "12-list-keep");

await browser.close();
console.log("\n完了。スクリーンショット: " + SHOTS);
