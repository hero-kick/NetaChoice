# NetaChoice

「ネタを集める → ふるいにかける → 形にする」を3つのツールで回すプロジェクト。

| ツール | 状態 | 役割 |
|---|---|---|
| neta-dataset-builder | プロンプト運用中 | AIでネタ候補を収集し、共通スキーマのJSONを出力 |
| [neta-furui-lite](neta-furui-lite/) | 稼働中 | スマホでカードを1枚ずつ「残す / 捨てる / 保留」に仕分けるPWA |
| quote-video-factory | 未着手 | 「残す」カードから短尺動画を生成 |

## いますぐ使う

### 1. ネタを集める

`shared/prompts/collect-neta.md` のプロンプトをClaudeに貼り付けて、ネタJSONを生成する。

### 2. ふるいにかける

- 公開URL: https://hero-kick.github.io/NetaChoice/ （スマホで開いて「ホーム画面に追加」推奨）
- ローカル: `cd neta-furui-lite && npm install && npm run dev`

生成したJSONを「インポート / エクスポート」画面から取り込み、仕分ける。

### 3. 取り出す

「残す」だけをJSON（動画化用）またはMarkdown（メモ・再利用）でエクスポートする。

## ドキュメント

- [docs/architecture.md](docs/architecture.md) — 3ツールの責務分担
- [docs/data-flow.md](docs/data-flow.md) — データの流れと受け渡しルール
- [docs/neta-furui-lite-guide.html](docs/neta-furui-lite-guide.html) — ネタふるい Lite の使い方ガイド
- [shared/neta-schema.json](shared/neta-schema.json) — ツール間共通のJSONスキーマ

## 開発メモ

- ネタふるい Lite の検証: `npx tsx scripts/smoke-import.ts`（ロジック）/ `node scripts/verify-ui.mjs`（UI、要 `npm run preview -- --port 4731`）
- デプロイ: `cd neta-furui-lite && powershell -File scripts/deploy.ps1`（ビルドして gh-pages ブランチへ push）
