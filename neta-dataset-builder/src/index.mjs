#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateNetaJson } from "./validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "out");

const USAGE = `neta-dataset-builder — ネタ収集CLI

使い方:
  node src/index.mjs collect --theme "テーマ" [オプション]
  node src/index.mjs validate <ファイル.json>

collect のオプション:
  --theme  <文字列>   収集テーマ（必須）。例: "夜勤明けの過ごし方の衛生講話ネタ"
  --count  <数>       収集件数（既定: 20）
  --name   <文字列>   データセット名を固定したい場合に指定
  --hints  <文字列>   追加の観点・条件（除外条件など）
  --model  <ID>       使用モデル（既定: claude-opus-4-8）
  --out    <パス>     出力先（既定: out/<slug>-<日付>.json）

必要な環境変数:
  ANTHROPIC_API_KEY   Claude APIキー

出力したJSONは、ネタふるい Lite の「インポート / エクスポート」画面で
ファイル選択するだけで取り込めます。`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      args[a.slice(2)] = argv[++i];
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (command === "validate") {
    const file = args._[0];
    if (!file) {
      console.error("validate: ファイルパスを指定してください");
      process.exit(2);
    }
    const data = JSON.parse(readFileSync(file, "utf-8"));
    const { errors, warnings } = validateNetaJson(data);
    for (const w of warnings) console.log(`警告: ${w}`);
    for (const e of errors) console.log(`エラー: ${e}`);
    if (errors.length === 0) {
      console.log(`OK: ${file} はスキーマに準拠しています（警告 ${warnings.length} 件）`);
      process.exit(0);
    }
    process.exit(1);
  }

  if (command === "collect") {
    if (!args.theme) {
      console.error("collect: --theme は必須です\n");
      console.error(USAGE);
      process.exit(2);
    }
    const { collect } = await import("./collect.mjs");
    const result = await collect({
      theme: args.theme,
      count: Number(args.count) || 20,
      name: args.name,
      hints: args.hints,
      model: args.model || "claude-opus-4-8",
    });

    mkdirSync(OUT_DIR, { recursive: true });
    const outPath =
      args.out ||
      join(OUT_DIR, `${result.datasets[0].id.replace(/^ds-/, "")}.json`);
    writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(outPath);
    process.exit(0);
  }

  console.error(USAGE);
  process.exit(command ? 2 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
