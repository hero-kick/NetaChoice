import Anthropic from "@anthropic-ai/sdk";
import { validateNetaJson } from "./validate.mjs";

// 構造化出力用スキーマ。
// customFields はキーが動的なため、構造化出力の制約（additionalProperties: false 必須）
// に合わせて {key, value} ペアの配列で受け取り、後段でオブジェクトに変換する。
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["datasetName", "datasetDescription", "fields", "cards"],
  properties: {
    datasetName: { type: "string" },
    datasetDescription: { type: "string" },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "label", "type", "showOnCard"],
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          type: {
            type: "string",
            enum: ["text", "textarea", "number", "rating", "select", "multiSelect"],
          },
          showOnCard: { type: "boolean" },
          options: { type: "array", items: { type: "string" } },
        },
      },
    },
    cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "summary", "customFields"],
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          customFields: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["key", "value"],
              properties: {
                key: { type: "string" },
                value: { type: "string" },
              },
            },
          },
          provenance: {
            type: "object",
            additionalProperties: false,
            properties: {
              sourceTitle: { type: "string" },
              sourceUrl: { type: "string" },
            },
          },
        },
      },
    },
  },
};

function buildSystemPrompt() {
  return `あなたはアイデア収集の専門家です。指定されたテーマでネタ候補を集め、構造化データとして返します。

ルール:
- fields は3〜5個。このテーマのネタを比較・判断するのに役立つ項目を設計する
- 各カードの customFields のキーは、fields で定義した key と完全に一致させる
- multiSelect 型の値は "|" 区切りの文字列で返す（例: "睡眠|運動"）
- number / rating 型の値は数字だけの文字列で返す（例: "3"）
- title は一覧で内容が想像できる具体性を持たせる。summary は2〜3行で、何が面白い/役立つのかまで書く
- 出典が実在すると確信できる場合のみ provenance を付ける。不確かな出典をでっち上げない。不明なら provenance を省略する
- 似たネタばかりにせず、切り口を分散させる
- 煽り表現や誇張は使わない。事実を淡々と、しかし具体的に書く`;
}

function slugify(theme) {
  // 日本語テーマはそのままスラッグにできないため、英数字以外は落として短縮
  const ascii = theme
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return ascii || "dataset";
}

function convertFieldValue(field, raw) {
  if (raw === "" || raw === undefined) return undefined;
  if (!field) return raw;
  if (field.type === "number" || field.type === "rating") {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  if (field.type === "multiSelect") {
    return raw.split("|").map((s) => s.trim()).filter(Boolean);
  }
  return raw;
}

export async function collect({ theme, count, name, hints, model }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "環境変数 ANTHROPIC_API_KEY が設定されていません。\n" +
        "  PowerShell: $env:ANTHROPIC_API_KEY = \"sk-ant-...\"\n" +
        "APIキーは https://platform.claude.com/ で発行できます。"
    );
  }

  const client = new Anthropic();

  const userPrompt = [
    `テーマ: ${theme}`,
    `件数: ${count} 件`,
    name ? `データセット名は「${name}」とすること。` : "",
    hints ? `追加の観点・条件:\n${hints}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  console.error(`収集中... (model: ${model}, theme: ${theme}, count: ${count})`);

  const stream = client.messages.stream({
    model,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: userPrompt }],
    output_config: {
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
  });

  stream.on("text", () => process.stderr.write("."));
  const message = await stream.finalMessage();
  process.stderr.write("\n");

  if (message.stop_reason === "refusal") {
    throw new Error("モデルがこのテーマでの生成を拒否しました。テーマを見直してください。");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("出力がトークン上限に達しました。--count を減らして再実行してください。");
  }

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("モデルからテキスト応答がありませんでした。");
  const raw = JSON.parse(textBlock.text);

  // neta-schema 形式へ変換
  const now = new Date().toISOString();
  const slug = slugify(theme);
  const datasetId = `ds-${slug}-${now.slice(0, 10)}`;
  const fieldByKey = new Map(raw.fields.map((f) => [f.key, f]));

  const cards = raw.cards.map((c, i) => {
    const customFields = {};
    for (const { key, value } of c.customFields) {
      const converted = convertFieldValue(fieldByKey.get(key), value);
      if (converted !== undefined) customFields[key] = converted;
    }
    const card = {
      id: `card-${slug}-${String(i + 1).padStart(3, "0")}`,
      datasetId,
      title: c.title,
      summary: c.summary,
      customFields,
      createdAt: now,
      updatedAt: now,
    };
    if (c.provenance && (c.provenance.sourceTitle || c.provenance.sourceUrl)) {
      card.provenance = {
        ...c.provenance,
        collectedAt: now,
        collectedBy: "neta-dataset-builder",
      };
    }
    return card;
  });

  const result = {
    schemaVersion: "1.0.0",
    exportedAt: now,
    source: { tool: "neta-dataset-builder", version: "0.1.0", notes: `theme: ${theme}` },
    datasets: [
      {
        id: datasetId,
        name: name || raw.datasetName,
        description: raw.datasetDescription,
        fields: raw.fields,
        createdAt: now,
        updatedAt: now,
      },
    ],
    cards,
  };

  const { errors, warnings } = validateNetaJson(result);
  for (const w of warnings) console.error(`警告: ${w}`);
  if (errors.length > 0) {
    throw new Error("生成結果がスキーマ検証に失敗しました:\n" + errors.join("\n"));
  }

  const usage = message.usage;
  console.error(
    `完了: ${cards.length} 件 (tokens: in=${usage.input_tokens} out=${usage.output_tokens})`
  );

  return result;
}
