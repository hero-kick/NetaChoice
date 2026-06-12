# -*- coding: utf-8 -*-
"""
quote-video-factory MVP

ネタふるい Lite の「残す」だけJSONエクスポート（neta-schema 1.x）を読み込み、
status="keep" のカードを縦型 1080x1920 の画像にする。
ffmpeg が PATH にあれば、各画像から8秒の静止画mp4も生成する。

使い方:
  python make_cards.py in/neta-furui-keep-20260613.json
  python make_cards.py in/sorted.json --out out
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
MARGIN = 100
FONT_PATH = "C:/Windows/Fonts/meiryo.ttc"
FONT_BOLD_PATH = "C:/Windows/Fonts/meiryob.ttc"

# 引用テンプレート（落ち着いた濃色）
Q_BG = "#1E2735"
Q_TEXT = "#F2F4F8"
Q_SUB = "#A8B3C5"
Q_CREDIT = "#6B7686"
Q_ACCENT = "#5BA4CF"

# 汎用テンプレート（白基調）
G_BG = "#FFFFFF"
G_TITLE = "#2D3436"
G_TEXT = "#4A5358"
G_LABEL = "#8A949B"
G_ACCENT = "#2C5F8A"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD_PATH if bold else FONT_PATH, size)


def wrap(draw, text, fnt, max_width):
    """日本語混在テキストを描画幅で折り返す（明示改行も尊重）"""
    lines = []
    for para in text.split("\n"):
        line = ""
        for ch in para:
            if draw.textlength(line + ch, font=fnt) > max_width and line:
                lines.append(line)
                line = ch
            else:
                line += ch
        lines.append(line)
    return lines


def fit_text(draw, text, max_width, max_height, start_size, bold=False, spacing=1.6):
    """枠に収まるまでフォントサイズを下げ、(font, lines, 行高) を返す"""
    size = start_size
    while size >= 28:
        fnt = font(size, bold)
        lines = wrap(draw, text, fnt, max_width)
        line_h = int(size * spacing)
        if len(lines) * line_h <= max_height:
            return fnt, lines, line_h
        size -= 4
    fnt = font(28, bold)
    return fnt, wrap(draw, text, fnt, max_width), int(28 * spacing)


def draw_lines(draw, lines, fnt, line_h, top, fill, center=True):
    y = top
    for line in lines:
        if center:
            w = draw.textlength(line, font=fnt)
            draw.text(((W - w) / 2, y), line, font=fnt, fill=fill)
        else:
            draw.text((MARGIN, y), line, font=fnt, fill=fill)
        y += line_h
    return y


def credit_text(card):
    p = card.get("provenance") or {}
    parts = []
    if p.get("sourceTitle"):
        parts.append(f"出典: {p['sourceTitle']}")
    if p.get("license") == "public-domain":
        parts.append("パブリックドメイン")
    return "  /  ".join(parts)


def render_quote(card, fields):
    """quote フィールドを持つカード用テンプレート"""
    img = Image.new("RGB", (W, H), Q_BG)
    d = ImageDraw.Draw(img)
    cf = card.get("customFields", {})

    quote = cf.get("quote") or card.get("summary") or card["title"]
    author = cf.get("author", "")
    work = cf.get("work", "")

    max_w = W - MARGIN * 2
    fnt, lines, line_h = fit_text(d, quote, max_w, int(H * 0.45), 76)
    block_h = len(lines) * line_h

    # アクセントライン → 引用本文 → 著者
    center_top = (H - block_h) / 2 - 80
    d.rectangle([(W - 120) / 2, center_top - 70, (W + 120) / 2, center_top - 64], fill=Q_ACCENT)
    y = draw_lines(d, lines, fnt, line_h, center_top, Q_TEXT)

    attribution = ""
    if author:
        attribution = f"— {author}"
        if work:
            attribution += f"『{work}』"
    if attribution:
        sub_f = font(40)
        w = d.textlength(attribution, font=sub_f)
        d.text(((W - w) / 2, y + 60), attribution, font=sub_f, fill=Q_SUB)

    credit = credit_text(card)
    if credit:
        cr_f = font(26)
        w = d.textlength(credit, font=cr_f)
        d.text(((W - w) / 2, H - 140), credit, font=cr_f, fill=Q_CREDIT)
    return img


def render_generic(card, fields):
    """引用以外のカード用テンプレート（タイトル＋要約＋主要項目）"""
    img = Image.new("RGB", (W, H), G_BG)
    d = ImageDraw.Draw(img)
    cf = card.get("customFields", {})

    d.rectangle([0, 0, W, 14], fill=G_ACCENT)
    y = 220

    t_f, t_lines, t_lh = fit_text(d, card["title"], W - MARGIN * 2, 400, 68, bold=True, spacing=1.4)
    y = draw_lines(d, t_lines, t_f, t_lh, y, G_TITLE, center=False) + 50
    d.rectangle([MARGIN, y, MARGIN + 120, y + 6], fill=G_ACCENT)
    y += 70

    if card.get("summary"):
        s_f, s_lines, s_lh = fit_text(d, card["summary"], W - MARGIN * 2, 600, 44, spacing=1.7)
        y = draw_lines(d, s_lines, s_f, s_lh, y, G_TEXT, center=False) + 80

    show = [f for f in fields if f.get("showOnCard", True)]
    lf, vf = font(32), font(36, bold=True)
    for f in show:
        v = cf.get(f["key"])
        if v in (None, ""):
            continue
        if isinstance(v, list):
            v = " / ".join(map(str, v))
        d.text((MARGIN, y), f["label"], font=lf, fill=G_LABEL)
        y += 46
        for line in wrap(d, str(v), vf, W - MARGIN * 2):
            d.text((MARGIN, y), line, font=vf, fill=G_TITLE)
            y += 54
        y += 30
        if y > H - 300:
            break

    credit = credit_text(card)
    if credit:
        d.text((MARGIN, H - 140), credit, font=font(26), fill=G_LABEL)
    return img


def render_mp4(png_path, mp4_path, seconds=8):
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-i", str(png_path),
        "-t", str(seconds), "-r", "30",
        "-pix_fmt", "yuv420p", "-c:v", "libx264",
        str(mp4_path),
    ]
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser(description="keep-JSON から縦型画像（+mp4）を生成")
    ap.add_argument("input", help="ネタふるい Lite の「残す」だけJSON")
    ap.add_argument("--out", default="out", help="出力ディレクトリ (既定: out)")
    ap.add_argument("--seconds", type=int, default=8, help="mp4の秒数 (既定: 8)")
    args = ap.parse_args()

    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    major = str(data.get("schemaVersion", "")).split(".")[0]
    if major != "1":
        sys.exit(f"未対応のschemaVersionです: {data.get('schemaVersion')}")

    datasets = {ds["id"]: ds for ds in data.get("datasets", [])}
    keeps = [c for c in data.get("cards", []) if c.get("status") == "keep"]
    if not keeps:
        sys.exit("status='keep' のカードがありません。ネタふるい Lite の「残す」だけJSONを使ってください。")

    has_ffmpeg = shutil.which("ffmpeg") is not None
    out_root = Path(args.out)
    made = 0

    for card in keeps:
        ds = datasets.get(card["datasetId"], {})
        fields = ds.get("fields", [])
        is_quote = any(f["key"] == "quote" for f in fields) and card.get("customFields", {}).get("quote")

        lic = (card.get("provenance") or {}).get("license", "")
        if lic == "copyrighted-fair-use":
            print(f"警告: {card['title']} は copyrighted-fair-use。公開先によっては使えません。")

        img = render_quote(card, fields) if is_quote else render_generic(card, fields)

        ds_dir = out_root / ds.get("name", "unknown").replace("/", "_")
        ds_dir.mkdir(parents=True, exist_ok=True)
        png = ds_dir / f"{card['id']}.png"
        img.save(png)
        made += 1
        print(png)

        if has_ffmpeg:
            render_mp4(png, png.with_suffix(".mp4"), args.seconds)
            print(png.with_suffix(".mp4"))

    if not has_ffmpeg:
        print("\nffmpeg が見つからないため画像のみ生成しました。"
              "mp4 も作る場合は ffmpeg をインストールしてください（winget install Gyan.FFmpeg）。")
    print(f"完了: {made} 枚")


if __name__ == "__main__":
    main()
