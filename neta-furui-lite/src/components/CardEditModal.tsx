import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card, Dataset, CardStatus } from "../types";

interface CardEditModalProps {
  card: Card | null; // null = new
  dataset: Dataset;
  open: boolean;
  onClose: () => void;
  onSave: (card: Card) => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function CardEditModal({
  card,
  dataset,
  open,
  onClose,
  onSave,
}: CardEditModalProps) {
  const isNew = !card;
  const [title, setTitle] = useState(card?.title ?? "");
  const [summary, setSummary] = useState(card?.summary ?? "");
  const [memo, setMemo] = useState(card?.memo ?? "");
  const [status, setStatus] = useState<CardStatus>(card?.status ?? "unclassified");
  const [customFields, setCustomFields] = useState<Record<string, string | number | string[] | undefined>>(
    card?.customFields ?? {}
  );

  function updateCustomField(key: string, value: string) {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!title.trim()) return;

    const now = new Date().toISOString();
    const saved: Card = {
      id: card?.id ?? generateId(),
      datasetId: dataset.id,
      title: title.trim(),
      summary: summary.trim(),
      status,
      memo: memo.trim() || undefined,
      customFields,
      reviewCount: card?.reviewCount ?? 0,
      createdAt: card?.createdAt ?? now,
      updatedAt: now,
      lastReviewedAt: card?.lastReviewedAt,
    };

    onSave(saved);
    onClose();
  }

  const statusOptions: { value: CardStatus; label: string; color: string }[] = [
    { value: "unclassified", label: "未分類", color: "bg-unclassified-light text-unclassified" },
    { value: "keep", label: "残す", color: "bg-keep-light text-keep" },
    { value: "hold", label: "保留", color: "bg-hold-light text-hold" },
    { value: "discard", label: "捨てる", color: "bg-discard-light text-discard" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
          >
            {/* header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {isNew ? "カードを追加" : "カードを編集"}
              </h2>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* dataset indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                {dataset.icon && <span>{dataset.icon}</span>}
                <span>{dataset.name}</span>
              </div>

              {/* title */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">タイトル *</label>
                <input
                  type="text"
                  placeholder="カードのタイトル"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* summary */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">概要</label>
                <textarea
                  placeholder="概要・説明"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* custom fields */}
              {dataset.fields.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-2 block">
                    カスタム項目
                  </label>
                  <div className="space-y-3">
                    {dataset.fields.map((field) => {
                      const value = customFields[field.key];
                      const strValue = value !== undefined ? String(value) : "";

                      if (field.type === "textarea") {
                        return (
                          <div key={field.key}>
                            <label className="text-xs text-gray-500 mb-1 block">{field.label}</label>
                            <textarea
                              placeholder={field.label}
                              value={strValue}
                              onChange={(e) => updateCustomField(field.key, e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                        );
                      }

                      if (field.type === "number") {
                        return (
                          <div key={field.key}>
                            <label className="text-xs text-gray-500 mb-1 block">{field.label}</label>
                            <input
                              type="number"
                              placeholder={field.label}
                              value={strValue}
                              onChange={(e) => updateCustomField(field.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                        );
                      }

                      if (field.type === "select" && field.options) {
                        return (
                          <div key={field.key}>
                            <label className="text-xs text-gray-500 mb-1 block">{field.label}</label>
                            <select
                              value={strValue}
                              onChange={(e) => updateCustomField(field.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              <option value="">選択してください</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      // default: text
                      return (
                        <div key={field.key}>
                          <label className="text-xs text-gray-500 mb-1 block">{field.label}</label>
                          <input
                            type="text"
                            placeholder={field.label}
                            value={strValue}
                            onChange={(e) => updateCustomField(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* memo */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">メモ</label>
                <textarea
                  placeholder="個人的なメモ（任意）"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* status (for editing) */}
              {!isNew && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-2 block">状態</label>
                  <div className="flex gap-2 flex-wrap">
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          status === opt.value
                            ? opt.color + " ring-2 ring-offset-1 ring-current"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* save */}
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isNew ? "追加する" : "保存する"}
              </button>
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
