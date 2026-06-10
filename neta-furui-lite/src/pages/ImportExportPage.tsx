import { useRef, useState } from "react";
import type { Dataset, Card } from "../types";
import { parseAndImportJson } from "../lib/import";
import {
  exportAllAsJson,
  exportKeepAsJson,
  exportKeepAsMarkdown,
  datedFilename,
  downloadFile,
} from "../lib/export";

interface ImportExportPageProps {
  datasets: Dataset[];
  cards: Card[];
  onImport: (datasets: Dataset[], cards: Card[]) => void;
}

export default function ImportExportPage({
  datasets,
  cards,
  onImport,
}: ImportExportPageProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [markdownPreview, setMarkdownPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function runImport(jsonStr: string) {
    setMessage(null);
    try {
      const result = parseAndImportJson(jsonStr, datasets, cards);
      onImport(result.datasets, result.cards);
      const skipped =
        result.skippedCount > 0 ? `（${result.skippedCount} 件はスキップ）` : "";
      setMessage({
        type: "success",
        text: `「${result.datasetName}」に ${result.addedCount} 件のカードを追加しました${skipped}。`,
      });
      setJsonInput("");
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "インポートに失敗しました。",
      });
    }
  }

  function handleImport() {
    if (!jsonInput.trim()) {
      setMessage({ type: "error", text: "JSONを入力してください。" });
      return;
    }
    runImport(jsonInput);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 同じファイルを選び直せるように毎回リセット
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        runImport(reader.result);
      }
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "ファイルの読み込みに失敗しました。" });
    };
    reader.readAsText(file);
  }

  function handleJsonExport() {
    const json = exportAllAsJson(datasets, cards);
    downloadFile(json, datedFilename("neta-furui-backup", "json"), "application/json");
  }

  function handleKeepJsonExport() {
    const keepCount = cards.filter((c) => c.status === "keep").length;
    if (keepCount === 0) {
      setMessage({ type: "error", text: "「残す」に分類したカードがまだありません。" });
      return;
    }
    const json = exportKeepAsJson(datasets, cards);
    downloadFile(json, datedFilename("neta-furui-keep", "json"), "application/json");
  }

  function handleMarkdownExport() {
    const md = exportKeepAsMarkdown(datasets, cards);
    setMarkdownPreview(md);
  }

  function handleMarkdownDownload() {
    if (!markdownPreview) return;
    downloadFile(markdownPreview, datedFilename("neta-furui-keep", "md"), "text/markdown");
  }

  function handleMarkdownCopy() {
    if (!markdownPreview) return;
    navigator.clipboard.writeText(markdownPreview);
    setMessage({ type: "success", text: "Markdownをコピーしました。" });
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-6">インポート / エクスポート</h1>

      {/* message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-keep-light text-keep"
              : "bg-discard-light text-discard"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* import section */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <h2 className="font-bold text-gray-800 mb-1">JSONインポート</h2>
        <p className="text-xs text-gray-500 mb-3">
          neta-schema.json 形式（schemaVersion 1.x）と、旧 datasetName 形式の両方に対応。
          バックアップJSONを読み込むと仕分け状態ごと復元されます。
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelected}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full mb-3 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          JSONファイルを選んでインポート
        </button>

        <p className="text-xs text-gray-400 mb-2">または貼り付け：</p>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={`{
  "schemaVersion": "1.0.0",
  "datasets": [
    {
      "id": "ds-example",
      "name": "データセット名",
      "fields": [
        { "key": "theme", "label": "テーマ", "type": "text" }
      ]
    }
  ],
  "cards": [
    {
      "id": "card-001",
      "datasetId": "ds-example",
      "title": "カードタイトル",
      "summary": "概要",
      "customFields": { "theme": "睡眠" }
    }
  ]
}`}
          className="w-full h-48 p-3 border border-gray-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <button
          onClick={handleImport}
          className="mt-3 w-full py-3 bg-primary text-white rounded-xl font-medium active:scale-95 transition-transform"
        >
          インポート
        </button>
      </section>

      {/* export section */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <h2 className="font-bold text-gray-800 mb-1">エクスポート</h2>
        <p className="text-xs text-gray-500 mb-4">
          データのバックアップや活用
        </p>

        <div className="space-y-3">
          <button
            onClick={handleJsonExport}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            全データをJSONで保存（バックアップ）
          </button>
          <button
            onClick={handleKeepJsonExport}
            className="w-full py-3 bg-keep-light text-keep rounded-xl font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            「残す」だけをJSONで出力
          </button>
          <button
            onClick={handleMarkdownExport}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            「残す」をMarkdownで出力
          </button>
        </div>
      </section>

      {/* markdown preview */}
      {markdownPreview && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">Markdownプレビュー</h2>
            <button
              onClick={() => setMarkdownPreview(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <pre className="bg-gray-50 p-4 rounded-xl text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
            {markdownPreview}
          </pre>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleMarkdownCopy}
              className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
            >
              コピー
            </button>
            <button
              onClick={handleMarkdownDownload}
              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium active:scale-95 transition-transform"
            >
              ダウンロード
            </button>
          </div>
        </section>
      )}

      {/* stats */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-3">データ概要</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">データセット数</span>
            <span className="font-medium text-gray-700">{datasets.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">カード総数</span>
            <span className="font-medium text-gray-700">{cards.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">未分類</span>
            <span className="font-medium text-gray-700">
              {cards.filter((c) => c.status === "unclassified").length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-keep">残す</span>
            <span className="font-medium text-keep">
              {cards.filter((c) => c.status === "keep").length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-discard">捨てる</span>
            <span className="font-medium text-discard">
              {cards.filter((c) => c.status === "discard").length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-hold">保留</span>
            <span className="font-medium text-hold">
              {cards.filter((c) => c.status === "hold").length}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
