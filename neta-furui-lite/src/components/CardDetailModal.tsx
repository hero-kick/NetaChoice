import { motion, AnimatePresence } from "framer-motion";
import type { Card, Dataset, CardStatus } from "../types";
import StatusBadge from "./StatusBadge";

interface CardDetailModalProps {
  card: Card | null;
  dataset: Dataset | undefined;
  onClose: () => void;
  onStatusChange: (cardId: string, status: CardStatus) => void;
  onDelete: (cardId: string) => void;
  onEdit?: (card: Card) => void;
}

const statusButtons: { status: CardStatus; label: string; color: string }[] = [
  { status: "keep", label: "残す", color: "bg-keep text-white" },
  { status: "hold", label: "保留", color: "bg-hold text-white" },
  { status: "discard", label: "捨てる", color: "bg-discard text-white" },
  { status: "unclassified", label: "未分類に戻す", color: "bg-gray-200 text-gray-700" },
];

export default function CardDetailModal({
  card,
  dataset,
  onClose,
  onStatusChange,
  onDelete,
  onEdit,
}: CardDetailModalProps) {
  return (
    <AnimatePresence>
      {card && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          {/* modal */}
          <motion.div
            className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-800 truncate pr-4">
                {card.title}
              </h2>
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button
                    onClick={() => onEdit(card)}
                    className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={card.status} size="md" />
                {dataset && (
                  <span className="text-sm text-gray-400">{dataset.name}</span>
                )}
              </div>

              {card.summary && (
                <div>
                  <h4 className="text-xs font-medium text-gray-400 mb-1">概要</h4>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {card.summary}
                  </p>
                </div>
              )}

              {card.memo && (
                <div>
                  <h4 className="text-xs font-medium text-gray-400 mb-1">メモ</h4>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {card.memo}
                  </p>
                </div>
              )}

              {(() => {
                // フィールド定義の順に label で表示。定義に無いキーは末尾にそのまま
                const remaining = new Map(
                  Object.entries(card.customFields).filter(
                    ([, v]) => v !== undefined && v !== ""
                  )
                );
                const entries: [string, string][] = [];
                for (const field of dataset?.fields ?? []) {
                  const value = remaining.get(field.key);
                  if (value === undefined) continue;
                  entries.push([
                    field.label,
                    Array.isArray(value) ? value.join(", ") : String(value),
                  ]);
                  remaining.delete(field.key);
                }
                for (const [key, value] of remaining) {
                  entries.push([
                    key,
                    Array.isArray(value) ? value.join(", ") : String(value),
                  ]);
                }
                if (entries.length === 0) return null;
                return (
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-2">追加項目</h4>
                    <div className="space-y-2">
                      {entries.map(([label, display]) => (
                        <div key={label} className="flex gap-2 text-sm">
                          <span className="text-gray-500 shrink-0">{label}：</span>
                          <span className="text-gray-700">{display}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* status change buttons */}
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">状態を変更</h4>
                <div className="grid grid-cols-2 gap-2">
                  {statusButtons
                    .filter((b) => b.status !== card.status)
                    .map((b) => (
                      <button
                        key={b.status}
                        onClick={() => onStatusChange(card.id, b.status)}
                        className={`py-2 px-3 rounded-xl text-sm font-medium ${b.color} active:scale-95 transition-transform`}
                      >
                        {b.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* delete */}
              <button
                onClick={() => {
                  if (confirm("このカードを削除しますか？")) {
                    onDelete(card.id);
                  }
                }}
                className="w-full py-2 text-sm text-discard border border-discard/20 rounded-xl hover:bg-discard-light transition-colors"
              >
                カードを削除
              </button>
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
