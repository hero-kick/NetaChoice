# NetaChoice データの流れ

`shared/neta-schema.json` を共通言語として、3つのツールが JSON ファイルを受け渡しする。
DB やサーバーは介在させない。やり取りはローカルファイルで完結する。

## 全体図

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  [1] テーマ入力                                                                │
│       │                                                                        │
│       ▼                                                                        │
│  ┌──────────────────────────┐                                                  │
│  │ neta-dataset-builder     │  ← Claude API / Web 検索                         │
│  │  - 候補収集              │                                                  │
│  │  - フィールド推論        │                                                  │
│  │  - provenance を記録     │                                                  │
│  └──────────┬───────────────┘                                                  │
│             │                                                                  │
│             ▼  shared/neta-schema.json 準拠 JSON                               │
│       [2] dataset.json (status なし)                                           │
│             │                                                                  │
│             │  ファイルをユーザーが手で渡す or 共通ディレクトリ経由            │
│             ▼                                                                  │
│  ┌──────────────────────────┐                                                  │
│  │ neta-furui-lite (PWA)    │                                                  │
│  │  - インポート画面で取込  │                                                  │
│  │  - Tinder UI で仕分け    │                                                  │
│  │  - localStorage に保持   │                                                  │
│  └──────────┬───────────────┘                                                  │
│             │                                                                  │
│             ▼  status="keep" 付き JSON                                         │
│       [3] sorted.json                                                          │
│             │                                                                  │
│             ▼                                                                  │
│  ┌──────────────────────────┐                                                  │
│  │ quote-video-factory      │                                                  │
│  │  - keep カードのみ消費   │                                                  │
│  │  - 字幕/TTS/合成          │                                                 │
│  │  - provenance を画面表示 │                                                  │
│  └──────────┬───────────────┘                                                  │
│             ▼                                                                  │
│       [4] mp4 + 字幕 + メタ                                                    │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 工程ごとの責任範囲

### [1] → [2]  収集フェーズ（dataset-builder）

- 入力: テーマ、収集件数、フィールド定義のヒント。
- 出力: `datasets[]` と `cards[]` を含む JSON。`schemaVersion` は必須。
- カードに **status は付けない**。仕分けはユーザーの仕事。
- 各カードに可能な範囲で `provenance` を付与する。最低でも `sourceTitle` か `sourceUrl` のどちらか一つ。
- `customFields` のキーは Dataset.fields[].key と一致させる。フィールド定義に無いキーは捨てる。

### [2] → [3]  仕分けフェーズ（furui-lite）

- 入力: dataset-builder の出力 JSON（インポート画面に貼り付け、または将来的にはファイル選択）。
- 振る舞い:
  - Dataset がローカルに存在しなければ作成。存在すれば cards を追記。
  - インポート時、各 card の status は `unclassified` として保存。
  - ユーザーがスワイプで `keep` / `discard` / `hold` を付ける。
- 出力:
  - 全データのバックアップ JSON（再インポートで仕分け状態ごと復元できる）
  - 「残す」だけの JSON（video-factory への受け渡し用。該当 dataset 定義も同梱）
  - 「残す」だけの Markdown
- **AI 呼び出しはしない**。

### [3] → [4]  動画化フェーズ（video-factory）

- 入力: furui-lite のエクスポート JSON のうち `status === "keep"` のカード。
- 振る舞い:
  - dataset の種類で動画テンプレートを切り替える（例: 引用集 → 縦長 Reels テンプレ）。
  - `customFields` をテンプレート変数に流し込む。
  - `provenance.sourceTitle` / `provenance.author` を画面下部に出典としてオーバーレイ。
  - `provenance.license` が `copyrighted-fair-use` のカードは警告を出す（公開先によっては使えない）。
- 出力: mp4 ファイル群と、生成元の card.id を含むメタファイル。

## ファイルのやり取りの想定

```
NetaChoice/
├── shared/
│   ├── neta-schema.json       # スキーマ本体
│   └── sample-dataset.json    # 動作確認用
├── neta-furui-lite/           # PWA
├── neta-dataset-builder/      # （予定）
│   └── out/                   # 生成 JSON 置き場
└── quote-video-factory/       # （予定）
    └── in/                    # furui-lite からの sorted.json 置き場
```

`out/*.json` を手で `furui-lite` にインポート、`furui-lite` からエクスポートした JSON を `in/` に置く、という素朴な運用で始める。
将来的に共通ディレクトリ（例: `shared/inbox/`、`shared/sorted/`）を経由する自動連携を入れてもよいが、まずはファイルを目視で確認できる現運用で十分。

## バージョニング方針

- `schemaVersion` は SemVer。
  - パッチ: フィールド追加だけ、後方互換。
  - マイナー: 任意フィールドの意味追加、後方互換。
  - メジャー: 既存フィールド削除・型変更。読み込み側は弾く。
- 各ツールは読み込んだ JSON の `schemaVersion` をチェックし、サポート外なら明示的にエラーを出す（無言で誤読しない）。
