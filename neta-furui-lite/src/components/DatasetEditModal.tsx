import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Dataset, CustomFieldDefinition, FieldType } from "../types";

interface DatasetEditModalProps {
  dataset: Dataset | null; // null = new
  open: boolean;
  onClose: () => void;
  onSave: (dataset: Dataset) => void;
  onDelete?: (datasetId: string) => void;
}

const ICONS = ["📁", "🔍", "🎬", "🔑", "📖", "🎮", "💡", "🎯", "🧩", "📝", "🎨", "🔬", "🎵", "📷", "🗺️", "⚙️"];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "テキスト（1行）" },
  { value: "textarea", label: "テキスト（複数行）" },
  { value: "number", label: "数値" },
  { value: "select", label: "選択肢" },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function DatasetEditModal({
  dataset,
  open,
  onClose,
  onSave,
  onDelete,
}: DatasetEditModalProps) {
  const isNew = !dataset;
  const [name, setName] = useState(dataset?.name ?? "");
  const [description, setDescription] = useState(dataset?.description ?? "");
  const [icon, setIcon] = useState(dataset?.icon ?? "📁");
  const [fields, setFields] = useState<CustomFieldDefinition[]>(
    dataset?.fields ?? []
  );
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset when modal opens with different data
  // (controlled externally via key prop or open/close cycle)

  function addField() {
    setFields((prev) => [
      ...prev,
      {
        key: "field-" + generateId(),
        label: "",
        type: "text",
        showOnCard: true,
      },
    ]);
  }

  function updateField(index: number, patch: Partial<CustomFieldDefinition>) {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const updated = { ...f, ...patch };
        // sync key with label for new fields (that haven't been saved)
        if (patch.label !== undefined && f.key.startsWith("field-")) {
          updated.key = patch.label || f.key;
        }
        return updated;
      })
    );
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave() {
    if (!name.trim()) return;

    const now = new Date().toISOString();
    const cleaned = fields.filter((f) => f.label.trim() !== "");
    // ensure keys match labels
    const finalFields = cleaned.map((f) => ({
      ...f,
      key: f.label.trim(),
      label: f.label.trim(),
    }));

    const saved: Dataset = {
      id: dataset?.id ?? generateId(),
      name: name.trim(),
      description: description.trim(),
      icon,
      fields: finalFields,
      createdAt: dataset?.createdAt ?? now,
      updatedAt: now,
    };

    onSave(saved);
    onClose();
  }

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
                {isNew ? "データセットを作成" : "データセットを編集"}
              </h2>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* icon + name row */}
              <div className="flex gap-3 items-start">
                <div className="relative">
                  <button
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-2xl hover:bg-gray-100 transition-colors"
                  >
                    {icon}
                  </button>
                  {showIconPicker && (
                    <div className="absolute top-16 left-0 bg-white rounded-xl shadow-lg border border-gray-200 p-2 grid grid-cols-4 gap-1 z-20 w-48">
                      {ICONS.map((ic) => (
                        <button
                          key={ic}
                          onClick={() => { setIcon(ic); setShowIconPicker(false); }}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-gray-100 ${
                            ic === icon ? "bg-primary/10 ring-2 ring-primary" : ""
                          }`}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="データセット名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* description */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">説明</label>
                <input
                  type="text"
                  placeholder="このデータセットの説明（任意）"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* custom fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-gray-400">カスタム項目</label>
                  <span className="text-xs text-gray-400">{fields.length} 項目</span>
                </div>

                {fields.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-xl">
                    項目がありません。下のボタンで追加してください。
                  </p>
                )}

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div
                      key={field.key + "-" + index}
                      className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                    >
                      <div className="flex gap-2 items-center mb-2">
                        {/* reorder */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveField(index, -1)}
                            disabled={index === 0}
                            className="text-gray-400 disabled:text-gray-200 hover:text-gray-600 p-0.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveField(index, 1)}
                            disabled={index === fields.length - 1}
                            className="text-gray-400 disabled:text-gray-200 hover:text-gray-600 p-0.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* label */}
                        <input
                          type="text"
                          placeholder="項目名"
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />

                        {/* delete */}
                        <button
                          onClick={() => removeField(index)}
                          className="p-1 text-gray-400 hover:text-discard"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex gap-2 items-center ml-8">
                        {/* type */}
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
                          className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          {FIELD_TYPES.map((ft) => (
                            <option key={ft.value} value={ft.value}>{ft.label}</option>
                          ))}
                        </select>

                        {/* show on card toggle */}
                        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer ml-auto">
                          <input
                            type="checkbox"
                            checked={field.showOnCard}
                            onChange={(e) => updateField(index, { showOnCard: e.target.checked })}
                            className="rounded border-gray-300 text-primary focus:ring-primary/30"
                          />
                          カードに表示
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addField}
                  className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  項目を追加
                </button>
              </div>

              {/* save */}
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isNew ? "作成する" : "保存する"}
              </button>

              {/* delete (only for existing) */}
              {!isNew && onDelete && (
                <>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-2 text-sm text-discard border border-discard/20 rounded-xl hover:bg-discard-light transition-colors"
                    >
                      このデータセットを削除
                    </button>
                  ) : (
                    <div className="bg-discard-light rounded-xl p-4 space-y-3">
                      <p className="text-sm text-discard font-medium">
                        「{dataset?.name}」と、含まれるすべてのカードを削除しますか？
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onDelete(dataset!.id);
                            onClose();
                          }}
                          className="flex-1 py-2 bg-discard text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
                        >
                          削除する
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-2 bg-white text-gray-700 rounded-xl text-sm font-medium border border-gray-200"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
