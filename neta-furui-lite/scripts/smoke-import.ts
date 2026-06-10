// インポート/エクスポートの往復ロジックの簡易検証（node scripts用、UIなし）
// 実行: npx tsx scripts/smoke-import.ts
import { readFileSync } from "node:fs";
import { parseAndImportJson } from "../src/lib/import";
import { exportAllAsJson, exportKeepAsJson } from "../src/lib/export";

let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`ok   ${name}`);
  } else {
    failed++;
    console.error(`FAIL ${name}${detail ? " — " + detail : ""}`);
  }
}

// 1. sample-dataset.json をまっさらな状態に取り込む
const sampleJson = readFileSync(
  new URL("../../shared/sample-dataset.json", import.meta.url),
  "utf-8"
);
const r1 = parseAndImportJson(sampleJson, [], []);
check("サンプル取り込み: dataset 2件", r1.datasets.length === 2);
check("サンプル取り込み: カード5件追加", r1.addedCount === 5);
check(
  "サンプル取り込み: 全カード未分類",
  r1.cards.every((c) => c.status === "unclassified")
);
check(
  "サンプル取り込み: 元のカードidを保持",
  r1.cards.some((c) => c.id === "card-eisei-001")
);
check(
  "サンプル取り込み: provenance保持",
  r1.cards.find((c) => c.id === "card-quote-001")?.provenance?.license ===
    "public-domain"
);
check(
  "サンプル取り込み: select型フィールド定義を保持",
  r1.datasets
    .find((d) => d.name === "衛生講話ネタ")
    ?.fields.find((f) => f.key === "theme")?.type === "select"
);

// 2. 同じファイルを再取り込み → 全件スキップでエラーになる（重複しない）
let dupBlocked = false;
try {
  parseAndImportJson(sampleJson, r1.datasets, r1.cards);
} catch {
  dupBlocked = true;
}
check("再取り込み: 重複は追加されない", dupBlocked);

// 3. 仕分け後のバックアップ往復で status が保持される
const sorted = r1.cards.map((c, i) => ({
  ...c,
  status: (["keep", "discard", "hold", "keep", "unclassified"] as const)[i],
  reviewCount: i,
}));
const backup = exportAllAsJson(r1.datasets, sorted);
const r2 = parseAndImportJson(backup, [], []);
check("バックアップ復元: カード5件", r2.addedCount === 5);
check(
  "バックアップ復元: statusが保持される",
  r2.cards.filter((c) => c.status === "keep").length === 2 &&
    r2.cards.filter((c) => c.status === "discard").length === 1 &&
    r2.cards.filter((c) => c.status === "hold").length === 1
);
check(
  "バックアップ復元: reviewCountが保持される",
  r2.cards.some((c) => c.reviewCount === 3)
);

// 4. 「残す」のみエクスポート
const keepJson = JSON.parse(exportKeepAsJson(r1.datasets, sorted));
check("keepエクスポート: keepのみ", keepJson.cards.length === 2);
check(
  "keepエクスポート: 使用データセットを同梱",
  Array.isArray(keepJson.datasets) && keepJson.datasets.length === 2
);
check("keepエクスポート: schemaVersion付き", keepJson.schemaVersion === "1.0.0");

// 5. 旧形式（datasetName）も取り込める
const legacy = JSON.stringify({
  datasetName: "テスト",
  cards: [
    { title: "A", summary: "s", customFields: { "難易度": "3" } },
    { title: "B" },
  ],
});
const r3 = parseAndImportJson(legacy, r1.datasets, r1.cards);
check("旧形式: 2件追加", r3.addedCount === 2);
check(
  "旧形式: customFieldsキーからフィールド定義を補完",
  r3.datasets.find((d) => d.name === "テスト")?.fields.some((f) => f.key === "難易度") === true
);

// 6. 既存データセットへの追記でフィールド定義がマージされる
const addition = JSON.stringify({
  schemaVersion: "1.0.0",
  datasets: [
    {
      id: "ds-x",
      name: "衛生講話ネタ",
      fields: [{ key: "newField", label: "新項目", type: "text" }],
    },
  ],
  cards: [
    {
      id: "card-new-1",
      datasetId: "ds-x",
      title: "追加カード",
      customFields: { newField: "値", undeclaredKey: "x" },
    },
  ],
});
const r4 = parseAndImportJson(addition, r1.datasets, r1.cards);
const eisei = r4.datasets.find((d) => d.name === "衛生講話ネタ");
check(
  "追記: 新フィールド定義がマージされる",
  eisei?.fields.some((f) => f.key === "newField" && f.label === "新項目") === true
);
check(
  "追記: 未宣言キーもtextとして補完",
  eisei?.fields.some((f) => f.key === "undeclaredKey") === true
);
check(
  "追記: 既存フィールドは変更されない",
  eisei?.fields.find((f) => f.key === "theme")?.type === "select"
);

// 7. 非対応 schemaVersion は明示エラー
let versionBlocked = false;
try {
  parseAndImportJson(
    JSON.stringify({ schemaVersion: "2.0.0", datasets: [{ name: "x", fields: [] }], cards: [] }),
    [],
    []
  );
} catch (e) {
  versionBlocked = e instanceof Error && e.message.includes("schemaVersion");
}
check("schemaVersion 2.x は拒否", versionBlocked);

console.log(failed === 0 ? "\nすべて成功" : `\n${failed} 件失敗`);
process.exit(failed === 0 ? 0 : 1);
