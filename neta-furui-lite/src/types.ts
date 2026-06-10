export type CardStatus = "unclassified" | "keep" | "discard" | "hold";

export type FieldType = "text" | "textarea" | "number" | "rating" | "select" | "multiSelect";

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  showOnCard: boolean;
  options?: string[];
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  icon?: string;
  fields: CustomFieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface Provenance {
  sourceUrl?: string;
  sourceTitle?: string;
  author?: string;
  publishedAt?: string;
  license?: string;
  collectedAt?: string;
  collectedBy?: string;
}

export interface Card {
  id: string;
  datasetId: string;
  title: string;
  summary: string;
  status: CardStatus;
  memo?: string;
  customFields: Record<string, string | number | string[] | undefined>;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  provenance?: Provenance;
}

export type Page = "home" | "sort" | "list" | "import-export";

export interface AppState {
  datasets: Dataset[];
  cards: Card[];
  selectedDatasetId: string | null;
  currentPage: Page;
}

export const STATUS_LABELS: Record<CardStatus, string> = {
  unclassified: "未分類",
  keep: "残す",
  discard: "捨てる",
  hold: "保留",
};
