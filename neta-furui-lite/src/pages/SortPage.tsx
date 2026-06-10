import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import type { Card, Dataset, CardStatus, Page } from "../types";
import SortCard from "../components/SortCard";

type SortTarget = "unclassified" | "hold";

interface SortPageProps {
  datasets: Dataset[];
  cards: Card[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string | null) => void;
  onClassifyCard: (cardId: string, status: CardStatus) => void;
  onRestoreCard: (card: Card) => void;
  onNavigate: (page: Page) => void;
}

export default function SortPage({
  datasets,
  cards,
  selectedDatasetId,
  onSelectDataset,
  onClassifyCard,
  onRestoreCard,
  onNavigate,
}: SortPageProps) {
  const [sortTarget, setSortTarget] = useState<SortTarget>("unclassified");
  // 分類前のカードのスナップショット。undoはこれをそのまま書き戻す
  const [history, setHistory] = useState<Card[]>([]);
  // 保留モードで「保留のまま」にしたカード（このセッション中は再表示しない）
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [sessionDone, setSessionDone] = useState(0);

  const dataset = datasets.find((d) => d.id === selectedDatasetId);
  const datasetCards = cards.filter((c) => c.datasetId === selectedDatasetId);
  const totalCards = datasetCards.length;
  const classifiedCount = datasetCards.filter(
    (c) => c.status !== "unclassified"
  ).length;
  const holdCount = datasetCards.filter((c) => c.status === "hold").length;

  const queue = datasetCards.filter(
    (c) => c.status === sortTarget && !passedIds.has(c.id)
  );
  const currentCard = queue[0];

  const resetSession = useCallback((target: SortTarget) => {
    setSortTarget(target);
    setHistory([]);
    setPassedIds(new Set());
    setSessionDone(0);
  }, []);

  const handleClassify = useCallback(
    (status: CardStatus) => {
      if (!currentCard) return;
      setHistory((prev) => [...prev, { ...currentCard }]);
      if (sortTarget === "hold" && status === "hold") {
        // 保留のまま → このセッションでは後ろに送らず非表示にする
        setPassedIds((prev) => new Set(prev).add(currentCard.id));
      }
      onClassifyCard(currentCard.id, status);
      setSessionDone((n) => n + 1);
    },
    [currentCard, sortTarget, onClassifyCard]
  );

  const handleUndo = useCallback(() => {
    const snapshot = history[history.length - 1];
    if (!snapshot) return;
    onRestoreCard(snapshot);
    setPassedIds((prev) => {
      if (!prev.has(snapshot.id)) return prev;
      const next = new Set(prev);
      next.delete(snapshot.id);
      return next;
    });
    setHistory((prev) => prev.slice(0, -1));
    setSessionDone((n) => Math.max(0, n - 1));
  }, [history, onRestoreCard]);

  // キーボード操作（PC用）：← 捨てる / → 残す / ↑ 保留 / Z 戻る
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (currentCard) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          handleClassify("keep");
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          handleClassify("discard");
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          handleClassify("hold");
          return;
        }
      }
      if (e.key === "z" || e.key === "Z") {
        handleUndo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentCard, handleClassify, handleUndo]);

  // Dataset selection screen
  if (!selectedDatasetId || !dataset) {
    const sortableDatasets = datasets.filter((ds) =>
      cards.some(
        (c) =>
          c.datasetId === ds.id &&
          (c.status === "unclassified" || c.status === "hold")
      )
    );

    return (
      <div className="px-4 pt-6 pb-24">
        <h1 className="text-xl font-bold text-gray-800 mb-1">仕分け</h1>
        <p className="text-sm text-gray-500 mb-6">データセットを選んでください</p>

        {sortableDatasets.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-2">仕分けるカードがありません</p>
            <p className="text-gray-400 text-sm">JSONをインポートして新しいカードを追加してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortableDatasets.map((ds) => {
              const dsCards = cards.filter((c) => c.datasetId === ds.id);
              const uc = dsCards.filter((c) => c.status === "unclassified").length;
              const hc = dsCards.filter((c) => c.status === "hold").length;
              return (
                <button
                  key={ds.id}
                  onClick={() => {
                    onSelectDataset(ds.id);
                    resetSession(uc > 0 ? "unclassified" : "hold");
                  }}
                  className="w-full text-left bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    {ds.icon && <span className="text-2xl">{ds.icon}</span>}
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{ds.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {uc > 0 && (
                          <>未分類 <span className="font-bold">{uc}</span> 件</>
                        )}
                        {uc > 0 && hc > 0 && <span className="mx-1.5 text-gray-300">|</span>}
                        {hc > 0 && (
                          <span className="text-hold">保留 <span className="font-bold">{hc}</span> 件</span>
                        )}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Sorting complete screen
  if (!currentCard) {
    const remainingHold = sortTarget === "hold" ? queue.length + passedIds.size : holdCount;
    return (
      <div className="px-4 pt-6 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {sortTarget === "hold" ? "保留の見直し完了" : "仕分け完了"}
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            {sortTarget === "hold"
              ? passedIds.size > 0
                ? `${passedIds.size} 件は保留のままにしました`
                : `「${dataset.name}」の保留カードをすべて見直しました`
              : `「${dataset.name}」の未分類カードをすべて仕分けました`}
          </p>
          <div className="flex flex-col items-center gap-3">
            {sortTarget === "unclassified" && remainingHold > 0 && (
              <button
                onClick={() => resetSession("hold")}
                className="px-6 py-3 bg-hold text-white rounded-xl font-medium active:scale-95 transition-transform"
              >
                保留 {remainingHold} 件を再仕分けする
              </button>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => onNavigate("list")}
                className="px-6 py-3 bg-primary text-white rounded-xl font-medium active:scale-95 transition-transform"
              >
                一覧を見る
              </button>
              <button
                onClick={() => {
                  onSelectDataset(null);
                  resetSession("unclassified");
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:scale-95 transition-transform"
              >
                ホームへ戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressRatio =
    sortTarget === "unclassified"
      ? totalCards > 0
        ? classifiedCount / totalCards
        : 0
      : sessionDone / (sessionDone + queue.length);

  return (
    <div className="px-4 pt-4 pb-24 flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => {
            onSelectDataset(null);
            resetSession("unclassified");
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-800">{dataset.name}</h2>
          <p className="text-xs text-gray-500">
            {sortTarget === "hold" ? "保留を見直し中" : "未分類を仕分け中"}
          </p>
        </div>
        <div className="text-sm font-medium text-gray-500">
          {sortTarget === "unclassified"
            ? `${classifiedCount + 1} / ${totalCards}`
            : `残り ${queue.length}`}
        </div>
      </div>

      {/* progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      {/* card area */}
      <div className="flex-1 flex items-center justify-center min-h-0 mb-4">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            <SortCard
              key={currentCard.id}
              card={currentCard}
              dataset={dataset}
              onClassify={handleClassify}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* swipe hint */}
      <p className="text-center text-xs text-gray-400 mb-3">
        右＝残す / 左＝捨てる / 上＝保留
      </p>

      {/* action buttons */}
      <div className="flex gap-3 mb-2">
        <button
          onClick={() => handleClassify("discard")}
          className="flex-1 py-3.5 bg-discard-light text-discard rounded-xl font-bold text-base active:scale-95 transition-transform"
        >
          捨てる
        </button>
        <button
          onClick={() => handleClassify("hold")}
          className="flex-1 py-3.5 bg-hold-light text-hold rounded-xl font-bold text-base active:scale-95 transition-transform"
        >
          {sortTarget === "hold" ? "保留のまま" : "保留"}
        </button>
        <button
          onClick={() => handleClassify("keep")}
          className="flex-1 py-3.5 bg-keep-light text-keep rounded-xl font-bold text-base active:scale-95 transition-transform"
        >
          残す
        </button>
      </div>

      {/* undo button */}
      <button
        onClick={handleUndo}
        disabled={history.length === 0}
        className={`w-full py-2 text-sm rounded-xl transition-colors ${
          history.length > 0
            ? "text-gray-500 hover:bg-gray-100"
            : "text-gray-300 cursor-not-allowed"
        }`}
      >
        ↩ 1つ戻る
      </button>
    </div>
  );
}
