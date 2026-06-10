import { useState } from "react";
import type { Dataset, Card, Page } from "../types";
import DatasetCard from "../components/DatasetCard";
import DatasetEditModal from "../components/DatasetEditModal";

interface HomePageProps {
  datasets: Dataset[];
  cards: Card[];
  onSelectDataset: (datasetId: string) => void;
  onNavigate: (page: Page) => void;
  onSaveDataset: (dataset: Dataset) => void;
  onDeleteDataset: (datasetId: string) => void;
}

export default function HomePage({
  datasets,
  cards,
  onSelectDataset,
  onNavigate,
  onSaveDataset,
  onDeleteDataset,
}: HomePageProps) {
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [showNewDataset, setShowNewDataset] = useState(false);

  // Today's stats
  const today = new Date().toISOString().slice(0, 10);
  const reviewedToday = cards.filter(
    (c) => c.lastReviewedAt && c.lastReviewedAt.slice(0, 10) === today
  );
  const keptToday = reviewedToday.filter((c) => c.status === "keep").length;
  const discardedToday = reviewedToday.filter((c) => c.status === "discard").length;

  return (
    <div className="px-4 pt-6 pb-24">
      {/* header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ネタふるい Lite</h1>
        <p className="text-sm text-gray-500 mt-1">ネタをあとで仕分ける</p>
      </div>

      {/* dataset list */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            データセット
          </h2>
          <button
            onClick={() => setShowNewDataset(true)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新規作成
          </button>
        </div>
        <div className="space-y-3">
          {datasets.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm mb-3">
                データセットがありません
              </p>
              <button
                onClick={() => setShowNewDataset(true)}
                className="text-sm text-primary font-medium"
              >
                最初のデータセットを作成する
              </button>
            </div>
          ) : (
            datasets.map((ds) => (
              <DatasetCard
                key={ds.id}
                dataset={ds}
                cards={cards}
                onClick={() => onSelectDataset(ds.id)}
                onEdit={() => setEditingDataset(ds)}
              />
            ))
          )}
        </div>
      </div>

      {/* keep review link */}
      {cards.some((c) => c.status === "keep") && (
        <button
          onClick={() => onNavigate("keep")}
          className="w-full mb-3 py-3 bg-keep-light rounded-2xl shadow-sm border border-keep/20 text-sm text-keep font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          残したネタを見返す（{cards.filter((c) => c.status === "keep").length} 件）
        </button>
      )}

      {/* import/export link */}
      <button
        onClick={() => onNavigate("import-export")}
        className="w-full mb-6 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-sm text-gray-600 font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        インポート / エクスポート
      </button>

      {/* today's progress */}
      {reviewedToday.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            今日の進捗
          </h2>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">見た </span>
              <span className="font-bold text-gray-700">{reviewedToday.length}</span>
            </div>
            <div>
              <span className="text-keep">残す </span>
              <span className="font-bold text-keep">{keptToday}</span>
            </div>
            <div>
              <span className="text-discard">捨てる </span>
              <span className="font-bold text-discard">{discardedToday}</span>
            </div>
          </div>
        </div>
      )}

      {/* new dataset modal */}
      <DatasetEditModal
        key={showNewDataset ? "new" : "closed-new"}
        dataset={null}
        open={showNewDataset}
        onClose={() => setShowNewDataset(false)}
        onSave={onSaveDataset}
      />

      {/* edit dataset modal */}
      <DatasetEditModal
        key={editingDataset?.id ?? "closed-edit"}
        dataset={editingDataset}
        open={!!editingDataset}
        onClose={() => setEditingDataset(null)}
        onSave={onSaveDataset}
        onDelete={onDeleteDataset}
      />
    </div>
  );
}
