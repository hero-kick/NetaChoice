import type { Dataset, Card } from "../types";

function buildExportPayload(datasets: Dataset[], cards: Card[]) {
  return {
    schemaVersion: "1.0.0",
    exportedAt: new Date().toISOString(),
    source: { tool: "neta-furui-lite" },
    datasets,
    cards,
  };
}

export function exportAllAsJson(datasets: Dataset[], cards: Card[]): string {
  return JSON.stringify(buildExportPayload(datasets, cards), null, 2);
}

// 「残す」カードと、それが属するデータセットだけを出力する。
// quote-video-factory など下流ツールへの受け渡し用。
export function exportKeepAsJson(datasets: Dataset[], cards: Card[]): string {
  const keepCards = cards.filter((c) => c.status === "keep");
  const usedDatasetIds = new Set(keepCards.map((c) => c.datasetId));
  const usedDatasets = datasets.filter((d) => usedDatasetIds.has(d.id));
  return JSON.stringify(buildExportPayload(usedDatasets, keepCards), null, 2);
}

export function datedFilename(base: string, ext: string): string {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("");
  return `${base}-${stamp}.${ext}`;
}

export function exportKeepAsMarkdown(datasets: Dataset[], cards: Card[]): string {
  const keepCards = cards.filter((c) => c.status === "keep");

  if (keepCards.length === 0) {
    return "# 残したネタ一覧\n\nまだ「残す」に分類したカードがありません。\n";
  }

  const lines: string[] = ["# 残したネタ一覧", ""];

  const grouped = new Map<string, Card[]>();
  for (const card of keepCards) {
    const group = grouped.get(card.datasetId) ?? [];
    group.push(card);
    grouped.set(card.datasetId, group);
  }

  for (const [datasetId, groupCards] of grouped) {
    const dataset = datasets.find((d) => d.id === datasetId);
    const datasetName = dataset?.name ?? "不明なデータセット";

    lines.push(`## ${datasetName}`, "");

    for (const card of groupCards) {
      lines.push(`### ${card.title}`, "");

      if (card.summary) {
        lines.push(`概要：`, card.summary, "");
      }

      if (card.memo) {
        lines.push(`メモ：`, card.memo, "");
      }

      // フィールド定義の順に、labelで出力する。定義に無いキーは末尾にそのまま
      const entries: [string, string][] = [];
      const remaining = new Map(
        Object.entries(card.customFields).filter(
          ([, v]) => v !== undefined && v !== ""
        )
      );
      for (const field of dataset?.fields ?? []) {
        const value = remaining.get(field.key);
        if (value === undefined) continue;
        entries.push([
          field.label,
          Array.isArray(value) ? value.join(", ") : String(value),
        ]);
        remaining.delete(field.key);
      }
      for (const [key, value] of remaining) {
        entries.push([key, Array.isArray(value) ? value.join(", ") : String(value)]);
      }

      if (entries.length > 0) {
        lines.push("追加項目：");
        for (const [label, display] of entries) {
          lines.push(`- ${label}：${display}`);
        }
        lines.push("");
      }

      lines.push("---", "");
    }
  }

  return lines.join("\n");
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
