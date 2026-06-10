import type {
  Dataset,
  Card,
  CardStatus,
  CustomFieldDefinition,
  FieldType,
  Provenance,
} from "../types";

const SUPPORTED_SCHEMA_MAJOR = 1;

type CustomFieldValue = string | number | string[] | undefined;

interface ImportCard {
  id?: string;
  datasetId?: string;
  title?: string;
  summary?: string;
  memo?: string;
  customFields?: Record<string, CustomFieldValue | null>;
  status?: string;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  lastReviewedAt?: string;
  provenance?: Provenance;
}

interface ImportFieldDefinition {
  key?: string;
  label?: string;
  type?: string;
  showOnCard?: boolean;
  options?: string[];
}

interface ImportDataset {
  id?: string;
  name?: string;
  description?: string;
  icon?: string;
  fields?: ImportFieldDefinition[];
}

interface SharedSchemaJson {
  schemaVersion?: string;
  datasets?: ImportDataset[];
  cards?: ImportCard[];
}

interface LegacyImportJson {
  datasetName?: string;
  description?: string;
  cards?: ImportCard[];
}

export interface ImportResult {
  datasets: Dataset[];
  cards: Card[];
  addedCount: number;
  skippedCount: number;
  datasetName: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const VALID_FIELD_TYPES: FieldType[] = [
  "text",
  "textarea",
  "number",
  "rating",
  "select",
  "multiSelect",
];

const VALID_STATUSES: CardStatus[] = ["unclassified", "keep", "discard", "hold"];

function normalizeFieldType(value: string | undefined): FieldType {
  if (value && (VALID_FIELD_TYPES as string[]).includes(value)) {
    return value as FieldType;
  }
  return "text";
}

function normalizeStatus(value: string | undefined): CardStatus {
  if (value && (VALID_STATUSES as string[]).includes(value)) {
    return value as CardStatus;
  }
  return "unclassified";
}

function normalizeCustomFields(
  raw: Record<string, CustomFieldValue | null> | undefined
): Record<string, CustomFieldValue> {
  if (!raw) return {};
  const out: Record<string, CustomFieldValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null) continue;
    out[key] = value;
  }
  return out;
}

function normalizeFieldDefinitions(
  raw: ImportFieldDefinition[] | undefined
): CustomFieldDefinition[] {
  return (raw ?? [])
    .filter((f): f is ImportFieldDefinition & { key: string } =>
      Boolean(f.key?.trim())
    )
    .map((f) => ({
      key: f.key.trim(),
      label: f.label?.trim() || f.key.trim(),
      type: normalizeFieldType(f.type),
      showOnCard: f.showOnCard ?? true,
      options: f.options,
    }));
}

// 既存データセットに、未知のフィールド定義を追記する（既存定義は触らない）
function mergeFieldsIntoDataset(
  dataset: Dataset,
  incomingFields: CustomFieldDefinition[],
  cardsForDataset: ImportCard[],
  now: string
): void {
  const known = new Set(dataset.fields.map((f) => f.key));
  let changed = false;

  for (const field of incomingFields) {
    if (!known.has(field.key)) {
      dataset.fields.push(field);
      known.add(field.key);
      changed = true;
    }
  }

  // フィールド定義に無い customFields キーは text として補完
  for (const c of cardsForDataset) {
    if (!c.customFields) continue;
    for (const key of Object.keys(c.customFields)) {
      if (!known.has(key)) {
        dataset.fields.push({ key, label: key, type: "text", showOnCard: true });
        known.add(key);
        changed = true;
      }
    }
  }

  if (changed) dataset.updatedAt = now;
}

function buildCard(
  source: ImportCard,
  datasetId: string,
  existingIds: Set<string>,
  now: string
): Card | null {
  if (!source.title?.trim()) return null;

  // 元のidは衝突しない限り保持（バックアップ復元の冪等性のため）
  let cardId = source.id?.trim() || "";
  if (!cardId || existingIds.has(cardId)) {
    cardId = generateId();
  }
  existingIds.add(cardId);

  return {
    id: cardId,
    datasetId,
    title: source.title.trim(),
    summary: source.summary?.trim() || "",
    status: normalizeStatus(source.status),
    memo: source.memo?.trim() || undefined,
    customFields: normalizeCustomFields(source.customFields),
    reviewCount:
      typeof source.reviewCount === "number" && source.reviewCount >= 0
        ? Math.floor(source.reviewCount)
        : 0,
    createdAt: source.createdAt || now,
    updatedAt: source.updatedAt || now,
    lastReviewedAt: source.lastReviewedAt,
    provenance: source.provenance,
  };
}

function importSharedSchema(
  parsed: SharedSchemaJson,
  existingDatasets: Dataset[],
  existingCards: Card[]
): ImportResult {
  if (parsed.schemaVersion) {
    const major = Number(parsed.schemaVersion.split(".")[0]);
    if (Number.isNaN(major) || major !== SUPPORTED_SCHEMA_MAJOR) {
      throw new Error(
        `未対応のschemaVersionです: ${parsed.schemaVersion}（このアプリは ${SUPPORTED_SCHEMA_MAJOR}.x.x のみ対応）`
      );
    }
  }

  const datasets = existingDatasets.map((d) => ({ ...d, fields: [...d.fields] }));
  const cards = [...existingCards];
  const existingCardIds = new Set(cards.map((c) => c.id));
  const now = new Date().toISOString();

  const incomingDatasets = parsed.datasets ?? [];
  if (incomingDatasets.length === 0) {
    throw new Error("datasetsが空です。");
  }

  const allIncomingCards = parsed.cards ?? [];

  // 元ID → 取り込み先 dataset.id
  const idMap = new Map<string, string>();
  const touchedNames: string[] = [];

  for (const inc of incomingDatasets) {
    const name = inc.name?.trim();
    if (!name) continue;

    const incomingFields = normalizeFieldDefinitions(inc.fields);
    const cardsForThis = allIncomingCards.filter(
      (c) => c.datasetId && c.datasetId === inc.id
    );

    let target = datasets.find((d) => d.name === name);
    if (!target) {
      target = {
        id: generateId(),
        name,
        description: inc.description ?? "",
        icon: inc.icon,
        fields: incomingFields,
        createdAt: now,
        updatedAt: now,
      };
      mergeFieldsIntoDataset(target, [], cardsForThis, now);
      datasets.push(target);
    } else {
      mergeFieldsIntoDataset(target, incomingFields, cardsForThis, now);
    }
    touchedNames.push(name);

    if (inc.id) idMap.set(inc.id, target.id);
  }

  let addedCount = 0;
  let skippedCount = 0;
  for (const c of allIncomingCards) {
    const targetDatasetId = c.datasetId ? idMap.get(c.datasetId) : undefined;
    if (!targetDatasetId) {
      skippedCount++;
      continue;
    }
    // 同じidのカードが既に存在する場合は重複取り込みしない（再インポート対策）
    if (c.id && existingCardIds.has(c.id)) {
      skippedCount++;
      continue;
    }
    const card = buildCard(c, targetDatasetId, existingCardIds, now);
    if (!card) {
      skippedCount++;
      continue;
    }
    cards.push(card);
    addedCount++;
  }

  if (addedCount === 0) {
    if (skippedCount > 0) {
      throw new Error(
        `追加できるカードがありませんでした（${skippedCount} 件は取り込み済みか不正なためスキップ）。`
      );
    }
    throw new Error("有効なカードが見つかりませんでした。");
  }

  return {
    datasets,
    cards,
    addedCount,
    skippedCount,
    datasetName: touchedNames.join(" / "),
  };
}

function importLegacy(
  parsed: LegacyImportJson,
  existingDatasets: Dataset[],
  existingCards: Card[]
): ImportResult {
  if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error("cardsが空か、配列ではありません。");
  }

  const datasetName =
    parsed.datasetName?.trim() ||
    "インポート " + new Date().toLocaleDateString("ja-JP");

  const datasets = existingDatasets.map((d) => ({ ...d, fields: [...d.fields] }));
  const cards = [...existingCards];
  const existingCardIds = new Set(cards.map((c) => c.id));
  const now = new Date().toISOString();

  let dataset = datasets.find((d) => d.name === datasetName);
  if (!dataset) {
    dataset = {
      id: generateId(),
      name: datasetName,
      description: parsed.description ?? "",
      fields: [],
      createdAt: now,
      updatedAt: now,
    };
    datasets.push(dataset);
  }
  mergeFieldsIntoDataset(dataset, [], parsed.cards, now);

  let addedCount = 0;
  let skippedCount = 0;
  for (const c of parsed.cards) {
    const card = buildCard(c, dataset.id, existingCardIds, now);
    if (!card) {
      skippedCount++;
      continue;
    }
    cards.push(card);
    addedCount++;
  }

  if (addedCount === 0) {
    throw new Error("タイトルのあるカードが見つかりませんでした。");
  }

  return { datasets, cards, addedCount, skippedCount, datasetName };
}

export function parseAndImportJson(
  jsonStr: string,
  existingDatasets: Dataset[],
  existingCards: Card[]
): ImportResult {
  let parsed: SharedSchemaJson & LegacyImportJson;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("JSONの形式が正しくありません。構文を確認してください。");
  }

  const looksShared =
    typeof parsed.schemaVersion === "string" ||
    (Array.isArray(parsed.datasets) && parsed.datasets.length > 0);

  if (looksShared) {
    return importSharedSchema(parsed, existingDatasets, existingCards);
  }
  return importLegacy(parsed, existingDatasets, existingCards);
}
