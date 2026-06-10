import { useState } from "react";
import type { Card, Dataset, CardStatus, Page } from "../types";
import CardDetailModal from "../components/CardDetailModal";
import CardEditModal from "../components/CardEditModal";

interface KeepPageProps {
  datasets: Dataset[];
  cards: Card[];
  onStatusChange: (cardId: string, status: CardStatus) => void;
  onDeleteCard: (cardId: string) => void;
  onSaveCard: (card: Card) => void;
  onNavigate: (page: Page) => void;
}

// 「残す」カードをゆっくり読み返すためのページ。
// 一覧と違い、要約・項目・メモを省略せずに表示する
export default function KeepPage({
  datasets,
  cards,
  onStatusChange,
  onDeleteCard,
  onSaveCard,
  onNavigate,
}: KeepPageProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [datasetFilter, setDatasetFilter] = useState<string | "all">("all");

  const keepCards = cards.filter((c) => c.status === "keep");

  // 残すカードのあるデータセットだけ、定義順に
  const allGroups = datasets
    .map((ds) => ({
      dataset: ds,
      cards: keepCards.filter((c) => c.datasetId === ds.id),
    }))
    .filter((g) => g.cards.length > 0);

  // 選択中のデータセットから「残す」が無くなったら「すべて」に戻す
  const effectiveFilter =
    datasetFilter !== "all" &&
    !allGroups.some((g) => g.dataset.id === datasetFilter)
      ? "all"
      : datasetFilter;

  const groups =
    effectiveFilter === "all"
      ? allGroups
      : allGroups.filter((g) => g.dataset.id === effectiveFilter);

  const selectedDataset = selectedCard
    ? datasets.find((d) => d.id === selectedCard.datasetId)
    : undefined;
  const editDataset = editingCard
    ? datasets.find((d) => d.id === editingCard.datasetId)
    : null;

  function fieldEntries(card: Card, dataset: Dataset): [string, string][] {
    const remaining = new Map(
      Object.entries(card.customFields).filter(
        ([, v]) => v !== undefined && v !== ""
      )
    );
    const entries: [string, string][] = [];
    for (const field of dataset.fields) {
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
    return entries;
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl font-bold text-gray-800">残したネタ</h1>
        <span className="text-sm font-medium text-keep bg-keep-light px-2.5 py-0.5 rounded-full">
          {keepCards.length} 件
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        ふるいを通り抜けたネタを読み返す
      </p>

      {/* dataset selection chips */}
      {allGroups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setDatasetFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              effectiveFilter === "all"
                ? "bg-keep text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            すべて {keepCards.length}
          </button>
          {allGroups.map(({ dataset, cards: groupCards }) => (
            <button
              key={dataset.id}
              onClick={() => setDatasetFilter(dataset.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                effectiveFilter === dataset.id
                  ? "bg-keep text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {dataset.icon ? dataset.icon + " " : ""}
              {dataset.name} {groupCards.length}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-2">まだ「残す」がありません</p>
          <p className="text-gray-400 text-sm mb-6">
            仕分けで「残す」にしたカードがここに並びます
          </p>
          <button
            onClick={() => onNavigate("sort")}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium active:scale-95 transition-transform"
          >
            仕分けをはじめる
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ dataset, cards: groupCards }) => (
            <section key={dataset.id}>
              <div className="flex items-center gap-2 mb-3">
                {dataset.icon && <span className="text-xl">{dataset.icon}</span>}
                <h2 className="font-bold text-gray-700">{dataset.name}</h2>
                <span className="text-xs text-gray-400">{groupCards.length} 件</span>
              </div>
              <div className="space-y-3">
                {groupCards.map((card) => {
                  const entries = fieldEntries(card, dataset);
                  return (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      className="w-full text-left bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform"
                    >
                      <h3 className="text-base font-bold text-gray-800 mb-2">
                        {card.title}
                      </h3>
                      {card.summary && (
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                          {card.summary}
                        </p>
                      )}
                      {entries.length > 0 && (
                        <div className="space-y-1 mb-1">
                          {entries.map(([label, display]) => (
                            <div key={label} className="flex gap-2 text-sm">
                              <span className="text-gray-400 shrink-0">{label}：</span>
                              <span className="text-gray-600 whitespace-pre-wrap">{display}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {card.memo && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-500 whitespace-pre-wrap">
                            <span className="text-gray-400">メモ：</span>
                            {card.memo}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* detail modal（状態変更・編集・削除） */}
      <CardDetailModal
        card={selectedCard}
        dataset={selectedDataset}
        onClose={() => setSelectedCard(null)}
        onStatusChange={(cardId, status) => {
          onStatusChange(cardId, status);
          setSelectedCard((prev) =>
            prev && prev.id === cardId ? { ...prev, status } : prev
          );
        }}
        onDelete={(cardId) => {
          onDeleteCard(cardId);
          setSelectedCard(null);
        }}
        onEdit={(card) => {
          setSelectedCard(null);
          setEditingCard(card);
        }}
      />

      {/* edit modal */}
      {editingCard && editDataset && (
        <CardEditModal
          key={"edit-" + editingCard.id}
          card={editingCard}
          dataset={editDataset}
          open={true}
          onClose={() => setEditingCard(null)}
          onSave={onSaveCard}
        />
      )}
    </div>
  );
}
