import { useState, useCallback } from "react";
import type { Card, Dataset, CardStatus, Page } from "./types";
import {
  loadDatasets,
  loadCards,
  saveDatasets,
  saveCards,
  isInitialized,
  markInitialized,
} from "./lib/storage";
import { sampleDatasets, sampleCards } from "./data/sampleData";
import BottomNav from "./components/BottomNav";
import HomePage from "./pages/HomePage";
import SortPage from "./pages/SortPage";
import ListPage from "./pages/ListPage";
import KeepPage from "./pages/KeepPage";
import ImportExportPage from "./pages/ImportExportPage";

// ページ読み込み時に1回だけ実行する（初回起動ならサンプルデータを投入）
function loadInitialData(): { datasets: Dataset[]; cards: Card[] } {
  if (!isInitialized()) {
    saveDatasets(sampleDatasets);
    saveCards(sampleCards);
    markInitialized();
    return { datasets: sampleDatasets, cards: sampleCards };
  }
  return { datasets: loadDatasets(), cards: loadCards() };
}

const initialData = loadInitialData();

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>(initialData.datasets);
  const [cards, setCards] = useState<Card[]>(initialData.cards);
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);

  // persist datasets
  const updateDatasets = useCallback((next: Dataset[]) => {
    setDatasets(next);
    saveDatasets(next);
  }, []);

  // persist cards
  const updateCards = useCallback((next: Card[]) => {
    setCards(next);
    saveCards(next);
  }, []);

  const handleSelectDataset = useCallback(
    (datasetId: string) => {
      setSelectedDatasetId(datasetId);
      setCurrentPage("sort");
    },
    []
  );

  const handleClassifyCard = useCallback(
    (cardId: string, status: CardStatus) => {
      const now = new Date().toISOString();
      const next = cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              status,
              updatedAt: now,
              lastReviewedAt: now,
              reviewCount: c.reviewCount + 1,
            }
          : c
      );
      updateCards(next);
    },
    [cards, updateCards]
  );

  const handleStatusChange = useCallback(
    (cardId: string, status: CardStatus) => {
      const now = new Date().toISOString();
      const next = cards.map((c) =>
        c.id === cardId ? { ...c, status, updatedAt: now } : c
      );
      updateCards(next);
    },
    [cards, updateCards]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      const next = cards.filter((c) => c.id !== cardId);
      updateCards(next);
    },
    [cards, updateCards]
  );

  const handleSaveCard = useCallback(
    (card: Card) => {
      const exists = cards.some((c) => c.id === card.id);
      if (exists) {
        updateCards(cards.map((c) => (c.id === card.id ? card : c)));
      } else {
        updateCards([...cards, card]);
      }
    },
    [cards, updateCards]
  );

  const handleSaveDataset = useCallback(
    (dataset: Dataset) => {
      const exists = datasets.some((d) => d.id === dataset.id);
      if (exists) {
        updateDatasets(datasets.map((d) => (d.id === dataset.id ? dataset : d)));
      } else {
        updateDatasets([...datasets, dataset]);
      }
    },
    [datasets, updateDatasets]
  );

  const handleDeleteDataset = useCallback(
    (datasetId: string) => {
      updateDatasets(datasets.filter((d) => d.id !== datasetId));
      updateCards(cards.filter((c) => c.datasetId !== datasetId));
    },
    [datasets, cards, updateDatasets, updateCards]
  );

  const handleImport = useCallback(
    (newDatasets: Dataset[], newCards: Card[]) => {
      updateDatasets(newDatasets);
      updateCards(newCards);
    },
    [updateDatasets, updateCards]
  );

  const handleNavigate = useCallback((page: Page) => {
    setCurrentPage(page);
    if (page === "home") {
      setSelectedDatasetId(null);
    }
  }, []);

  return (
    <div className="min-h-full w-full max-w-lg mx-auto relative">
      <main className="flex-1">
        {currentPage === "home" && (
          <HomePage
            datasets={datasets}
            cards={cards}
            onSelectDataset={handleSelectDataset}
            onNavigate={handleNavigate}
            onSaveDataset={handleSaveDataset}
            onDeleteDataset={handleDeleteDataset}
          />
        )}
        {currentPage === "sort" && (
          <SortPage
            datasets={datasets}
            cards={cards}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={setSelectedDatasetId}
            onClassifyCard={handleClassifyCard}
            onRestoreCard={handleSaveCard}
            onNavigate={handleNavigate}
          />
        )}
        {currentPage === "list" && (
          <ListPage
            datasets={datasets}
            cards={cards}
            onStatusChange={handleStatusChange}
            onDeleteCard={handleDeleteCard}
            onSaveCard={handleSaveCard}
          />
        )}
        {currentPage === "keep" && (
          <KeepPage
            datasets={datasets}
            cards={cards}
            onStatusChange={handleStatusChange}
            onDeleteCard={handleDeleteCard}
            onSaveCard={handleSaveCard}
            onNavigate={handleNavigate}
          />
        )}
        {currentPage === "import-export" && (
          <ImportExportPage
            datasets={datasets}
            cards={cards}
            onImport={handleImport}
          />
        )}
      </main>
      <BottomNav current={currentPage} onNavigate={handleNavigate} />
    </div>
  );
}
