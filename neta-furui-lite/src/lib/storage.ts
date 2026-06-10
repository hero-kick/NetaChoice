import type { Dataset, Card } from "../types";

const DATASETS_KEY = "neta-furui-datasets";
const CARDS_KEY = "neta-furui-cards";
const INITIALIZED_KEY = "neta-furui-initialized-v2";

export function loadDatasets(): Dataset[] {
  try {
    const raw = localStorage.getItem(DATASETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// 容量超過などで保存に失敗したとき、毎回ではなく1度だけ警告する
let saveErrorNotified = false;

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    saveErrorNotified = false;
  } catch (e) {
    console.error("localStorage への保存に失敗:", e);
    if (!saveErrorNotified) {
      saveErrorNotified = true;
      alert(
        "データの保存に失敗しました。ブラウザの保存容量が不足している可能性があります。\n" +
          "「全データをJSONで保存」でバックアップを取ってから、不要なカードを削除してください。"
      );
    }
  }
}

export function saveDatasets(datasets: Dataset[]): void {
  safeSetItem(DATASETS_KEY, JSON.stringify(datasets));
}

export function loadCards(): Card[] {
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCards(cards: Card[]): void {
  safeSetItem(CARDS_KEY, JSON.stringify(cards));
}

export function isInitialized(): boolean {
  return localStorage.getItem(INITIALIZED_KEY) === "true";
}

export function markInitialized(): void {
  localStorage.setItem(INITIALIZED_KEY, "true");
}

export function clearAll(): void {
  localStorage.removeItem(DATASETS_KEY);
  localStorage.removeItem(CARDS_KEY);
  localStorage.removeItem(INITIALIZED_KEY);
}
