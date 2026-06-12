// neta-schema.json 準拠の軽量バリデーション。
// 依存を増やさないため ajv は使わず、運用上致命的になる点だけを検査する。

const FIELD_TYPES = ["text", "textarea", "number", "rating", "select", "multiSelect"];
const STATUSES = ["unclassified", "keep", "discard", "hold"];

export function validateNetaJson(data) {
  const errors = [];
  const warnings = [];

  if (typeof data !== "object" || data === null) {
    return { errors: ["JSONのルートがオブジェクトではありません"], warnings };
  }

  if (data.schemaVersion !== "1.0.0") {
    errors.push(`schemaVersion が "1.0.0" ではありません: ${data.schemaVersion}`);
  }
  if (!Array.isArray(data.datasets) || data.datasets.length === 0) {
    errors.push("datasets が空か、配列ではありません");
    return { errors, warnings };
  }
  if (!Array.isArray(data.cards) || data.cards.length === 0) {
    errors.push("cards が空か、配列ではありません");
    return { errors, warnings };
  }

  const datasetIds = new Set();
  const fieldKeysByDataset = new Map();

  for (const [i, ds] of data.datasets.entries()) {
    const where = `datasets[${i}]`;
    if (!ds.id) errors.push(`${where}: id がありません`);
    if (!ds.name?.trim()) errors.push(`${where}: name がありません`);
    if (datasetIds.has(ds.id)) errors.push(`${where}: id が重複しています (${ds.id})`);
    datasetIds.add(ds.id);

    if (!Array.isArray(ds.fields)) {
      errors.push(`${where}: fields が配列ではありません`);
      continue;
    }
    const keys = new Set();
    for (const [j, f] of ds.fields.entries()) {
      const fw = `${where}.fields[${j}]`;
      if (!f.key) errors.push(`${fw}: key がありません`);
      if (keys.has(f.key)) errors.push(`${fw}: key が重複しています (${f.key})`);
      keys.add(f.key);
      if (!FIELD_TYPES.includes(f.type)) {
        errors.push(`${fw}: type が不正です (${f.type})`);
      }
      if ((f.type === "select" || f.type === "multiSelect") && !Array.isArray(f.options)) {
        warnings.push(`${fw}: ${f.type} 型ですが options がありません`);
      }
    }
    fieldKeysByDataset.set(ds.id, keys);
  }

  const cardIds = new Set();
  for (const [i, c] of data.cards.entries()) {
    const where = `cards[${i}]`;
    if (!c.id) errors.push(`${where}: id がありません`);
    if (cardIds.has(c.id)) errors.push(`${where}: id が重複しています (${c.id})`);
    cardIds.add(c.id);

    if (!c.title?.trim()) errors.push(`${where}: title がありません`);
    if (!datasetIds.has(c.datasetId)) {
      errors.push(`${where}: datasetId が datasets に存在しません (${c.datasetId})`);
      continue;
    }
    if (c.status !== undefined && !STATUSES.includes(c.status)) {
      errors.push(`${where}: status が不正です (${c.status})`);
    }

    const knownKeys = fieldKeysByDataset.get(c.datasetId);
    for (const key of Object.keys(c.customFields ?? {})) {
      if (knownKeys && !knownKeys.has(key)) {
        warnings.push(`${where}: customFields のキー "${key}" がフィールド定義にありません`);
      }
    }

    if (c.provenance && !c.provenance.sourceTitle && !c.provenance.sourceUrl) {
      warnings.push(`${where}: provenance に sourceTitle / sourceUrl のどちらもありません`);
    }
  }

  return { errors, warnings };
}
