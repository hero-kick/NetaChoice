# NetaChoice

「ネタを集める → ふるいにかける → 形にする」を3つのツールで回すプロジェクト。

| ツール | 状態 | 役割 |
|---|---|---|
| [neta-dataset-builder](neta-dataset-builder/) | CLI稼働中 | Claude APIでネタ候補を収集し、共通スキーマのJSONを出力 |
| [neta-furui-lite](neta-furui-lite/) | 稼働中 | スマホでカードを1枚ずつ「残す / 捨てる / 保留」に仕分けるPWA |
| [quote-video-factory](quote-video-factory/) | MVP稼働中 | 「残す」カードから縦型画像（ffmpegがあればmp4）を生成 |

## いますぐ使う

### 1. ネタを集める（3つの方法）

- **すぐ試す**: `shared/datasets/` の出来合いデータセット（名言・衛生講話ネタ、出典確認済み）をインポート
- **プロンプト運用**: `shared/prompts/collect-neta.md` をClaude（Web検索あり）に貼り付けてJSON生成。出典の確実性が要る題材向き
- **CLI**: `cd neta-dataset-builder && node src/index.mjs collect --theme "..."`（要 ANTHROPIC_API_KEY）

### 2. ふるいにかける

- 公開URL: https://hero-kick.github.io/NetaChoice/ （スマホで開いて「ホーム画面に追加」推奨）
- ローカル: `cd neta-furui-lite && npm install && npm run dev`

JSONを「インポート / エクスポート」画面から取り込み、仕分ける。

### 3. 形にする

「『残す』だけをJSONで出力」したファイルを `quote-video-factory/in/` に置いて:

```powershell
cd quote-video-factory
python make_cards.py in\neta-furui-keep-XXXXXXXX.json
```

縦型1080×1920の画像（引用テンプレート / 汎用テンプレート自動切替）が `out/` に生成される。
Markdownエクスポートはメモ・AI再投入用。

## ドキュメント

- [docs/architecture.md](docs/architecture.md) — 3ツールの責務分担
- [docs/data-flow.md](docs/data-flow.md) — データの流れと受け渡しルール
- [docs/neta-furui-lite-guide.html](docs/neta-furui-lite-guide.html) — ネタふるい Lite の使い方ガイド
- [shared/neta-schema.json](shared/neta-schema.json) — ツール間共通のJSONスキーマ

## 開発メモ

- ネタふるい Lite の検証: `npx tsx scripts/smoke-import.ts`（ロジック）/ `node scripts/verify-ui.mjs`（UI、要 `npm run preview -- --port 4731`）
- デプロイ: `cd neta-furui-lite && powershell -File scripts/deploy.ps1`（ビルドして gh-pages ブランチへ push）
