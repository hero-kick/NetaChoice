import { useState, useMemo } from "react";
import type { Card, Dataset, CardStatus } from "../types";
import { STATUS_LABELS } from "../types";
import StatusBadge from "../components/StatusBadge";
import CardDetailModal from "../components/CardDetailModal";
import CardEditModal from "../components/CardEditModal";

interface ListPageProps {
  datasets: Dataset[];
  cards: Card[];
  onStatusChange: (cardId: string, status: CardStatus) => void;
  onDeleteCard: (cardId: string) => void;
  onSaveCard: (card: Card) => void;
}

const filters: { status: CardStatus | "all"; label: string }[] = [
  { status: "all", label: "すべて" },
  { status: "keep", label: STATUS_LABELS.keep },
  { status: "hold", label: STATUS_LABELS.hold },
  { status: "discard", label: STATUS_LABELS.discard },
  { status: "unclassified", label: STATUS_LABELS.unclassified },
];

export default function ListPage({
  datasets,
  cards,
  onStatusChange,
  onDeleteCard,
  onSaveCard,
}: ListPageProps) {
  const [activeFilter, setActiveFilter] = useState<CardStatus | "all">("all");
  const [datasetFilter, setDatasetFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  // card add/edit state
  const [showAddCard, setShowAddCard] = useState(false);
  const [addToDatasetId, setAddToDatasetId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const filteredCards = useMemo(() => {
    let result = cards;

    if (datasetFilter !== "all") {
      result = result.filter((c) => c.datasetId === datasetFilter);
    }

    if (activeFilter !== "all") {
      result = result.filter((c) => c.status === activeFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }

    return result;
  }, [cards, activeFilter, datasetFilter, search]);

  const selectedDataset = selectedCard
    ? datasets.find((d) => d.id === selectedCard.datasetId)
    : undefined;

  const addDataset = addToDatasetId
    ? datasets.find((d) => d.id === addToDatasetId)
    : null;

  const editDataset = editingCard
    ? datasets.find((d) => d.id === editingCard.datasetId)
    : null;

  function handleStartAdd() {
    if (datasets.length === 1) {
      setAddToDatasetId(datasets[0].id);
      setShowAddCard(true);
    } else if (datasets.length > 1) {
      // show dataset picker
      setShowAddCard(true);
      setAddToDatasetId(null);
    }
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">一覧</h1>
        {datasets.length > 0 && (
          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            カード追加
          </button>
        )}
      </div>

      {/* dataset filter */}
      {datasets.length > 1 && (
        <div className="mb-3">
          <select
            value={datasetFilter}
            onChange={(e) => setDatasetFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">すべてのデータセット</option>
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.icon ? ds.icon + " " : ""}{ds.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* status filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 scrollbar-hide">
        {filters.map((f) => {
          const active = activeFilter === f.status;
          return (
            <button
              key={f.status}
              onClick={() => setActiveFilter(f.status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* search */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          placeholder="タイトルで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* results count */}
      <p className="text-xs text-gray-400 mb-3">{filteredCards.length} 件</p>

      {/* card list */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">該当するカードがありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCards.map((card) => {
            const ds = datasets.find((d) => d.id === card.datasetId);
            return (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="w-full text-left bg-white rounded-xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm truncate">
                      {card.title}
                    </h3>
                    {ds && (
                      <p className="text-xs text-gray-400 mt-0.5">{ds.name}</p>
                    )}
                    {card.summary && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {card.summary}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={card.status} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* detail modal */}
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

      {/* add card: dataset picker or form */}
      {showAddCard && !addToDatasetId && datasets.length > 1 && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddCard(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5">
            <h3 className="font-bold text-gray-800 mb-3">どのデータセットに追加しますか？</h3>
            <div className="space-y-2">
              {datasets.map((ds) => (
                <button
                  key={ds.id}
                  onClick={() => setAddToDatasetId(ds.id)}
                  className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  {ds.icon && <span className="text-lg">{ds.icon}</span>}
                  <span className="font-medium text-gray-700">{ds.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddCard(false)}
              className="mt-3 w-full py-2 text-sm text-gray-500"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* add card form */}
      {addDataset && (
        <CardEditModal
          key={"new-" + addToDatasetId}
          card={null}
          dataset={addDataset}
          open={showAddCard}
          onClose={() => {
            setShowAddCard(false);
            setAddToDatasetId(null);
          }}
          onSave={onSaveCard}
        />
      )}

      {/* edit card form */}
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
