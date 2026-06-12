# neta-dataset-builder

Claude API でネタ候補を収集し、`shared/neta-schema.json` 準拠の JSON を出力する CLI。
出力ファイルは **ネタふるい Lite の「インポート / エクスポート」画面でファイル選択するだけ**で取り込める。

## セットアップ

```powershell
cd neta-dataset-builder
npm install
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # https://platform.claude.com/ で発行
```

## 使い方

```powershell
# 収集（結果は out/ に保存され、パスが表示される）
node src/index.mjs collect --theme "夜勤明けの過ごし方の衛生講話ネタ" --count 20

# 観点を絞る・既存データセットに追記したい場合
node src/index.mjs collect `
  --theme "短尺動画向けの日本文学の名言" `
  --count 15 `
  --name "名言・引用集" `
  --hints "パブリックドメインのみ。1画面に収まる80字以内。"

# 手元のJSONがスキーマ準拠か確認（APIキー不要）
node src/index.mjs validate out\xxxx.json
```

- `--name` を既存データセット名に合わせると、インポート時にそのデータセットへ追記される
- status は付与しない（仕分けはネタふるい Lite でユーザーが行う）
- 出典（provenance）は「実在すると確信できる場合のみ」付くようプロンプトで指示している。
  ただし**API収集はWeb検索をしないため、出典の実在は保証されない**。確実な出典が必要な題材は
  `shared/prompts/collect-neta.md` を Claude（Web検索あり）に貼る運用の方が向いている

## 実装メモ

- モデル既定: `claude-opus-4-8`（`--model` で変更可）
- 構造化出力（`output_config.format` + JSON Schema）で形式を保証。
  customFields はキーが動的でスキーマ化できないため `{key, value}` ペア配列で受け取り、
  CLI 側でフィールド型に応じて number / 配列に変換している
- ストリーミング + `finalMessage()` で長出力のタイムアウトを回避
- プロンプトキャッシュは未使用（単発CLIで再利用機会がなく、システムプロンプトが
  最小キャッシュサイズ未満のため効果がない）
- 生成結果は `src/validate.mjs` でスキーマ検証してから書き出す
