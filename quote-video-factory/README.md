# quote-video-factory

ネタふるい Lite の**「残す」だけJSONエクスポート**を入力に、縦型 1080×1920 の画像
（ffmpeg があれば静止画mp4も）を生成する。Shorts / Reels の素材づくり用。

## 使い方

```powershell
cd quote-video-factory

# 1. ネタふるい Lite で「『残す』だけをJSONで出力」したファイルを in/ に置く
# 2. 実行
python make_cards.py in\neta-furui-keep-20260613.json

# 出力は out\<データセット名>\<カードid>.png
```

動作確認用の入力サンプル: `in/test-keep.json`

## テンプレートの切り替え

- データセットに `quote` フィールドがあるカード → **引用テンプレート**
  （濃色背景・引用文センター・「— 著者『作品』」・出典クレジット）
- それ以外 → **汎用テンプレート**
  （白基調・タイトル・要約・showOnCard な項目）

## ルール

- `status="keep"` のカードだけを処理する（仕分けは上流の責務）
- `provenance.sourceTitle` / `license` を画像下部に出典として焼き込む
- `license: "copyrighted-fair-use"` のカードは警告を出す（公開先によっては使用不可）
- mp4 化は ffmpeg が PATH にある場合のみ（`winget install Gyan.FFmpeg` で導入可）

## 今後の拡張候補

- BGM・字幕アニメーション付きの本格的な動画化（ffmpeg導入後）
- テンプレートのバリエーション（背景画像、配色テーマ）
- 複数カードを1本にまとめたスライドショー動画
