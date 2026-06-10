import { useState } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import type { Card, Dataset, CardStatus } from "../types";

interface SortCardProps {
  card: Card;
  dataset: Dataset;
  onClassify: (status: CardStatus) => void;
}

const SWIPE_THRESHOLD = 80;

export default function SortCard({ card, dataset, onClassify }: SortCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(
    x,
    [-200, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, 200],
    [0.5, 0.8, 1, 0.8, 0.5]
  );

  // overlay opacities
  const keepOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const discardOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const holdOpacity = useTransform(y, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const [isDragging, setIsDragging] = useState(false);

  const showOnCardFields = dataset.fields.filter((f) => f.showOnCard);

  function handleDragEnd(_: unknown, info: PanInfo) {
    setIsDragging(false);
    const { offset } = info;

    // check vertical first (up = hold)
    if (offset.y < -SWIPE_THRESHOLD) {
      onClassify("hold");
      return;
    }
    // right = keep
    if (offset.x > SWIPE_THRESHOLD) {
      onClassify("keep");
      return;
    }
    // left = discard
    if (offset.x < -SWIPE_THRESHOLD) {
      onClassify("discard");
      return;
    }
  }

  return (
    <motion.div
      className="relative w-full touch-none"
      style={{ x, y, rotate, opacity }}
      drag
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
      dragElastic={0.7}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      key={card.id}
    >
      {/* swipe overlays */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-keep/10 border-2 border-keep flex items-center justify-center z-10 pointer-events-none"
        style={{ opacity: keepOpacity }}
      >
        <span className="text-keep text-2xl font-bold rotate-[-12deg]">残す</span>
      </motion.div>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-discard/10 border-2 border-discard flex items-center justify-center z-10 pointer-events-none"
        style={{ opacity: discardOpacity }}
      >
        <span className="text-discard text-2xl font-bold rotate-[12deg]">捨てる</span>
      </motion.div>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-hold/10 border-2 border-hold flex items-center justify-center z-10 pointer-events-none"
        style={{ opacity: holdOpacity }}
      >
        <span className="text-hold text-2xl font-bold">保留</span>
      </motion.div>

      {/* card content */}
      <div
        className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <h3 className="text-xl font-bold text-gray-800 mb-3">{card.title}</h3>

        {/* custom fields shown on card */}
        {showOnCardFields.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {showOnCardFields.map((field) => {
              const value = card.customFields[field.key];
              if (value === undefined || value === "") return null;
              const display = Array.isArray(value) ? value.join(", ") : String(value);
              return (
                <span
                  key={field.key}
                  className="inline-block bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full"
                >
                  {field.label}: {display}
                </span>
              );
            })}
          </div>
        )}

        {card.summary && (
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-400 mb-1">概要</h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {card.summary}
            </p>
          </div>
        )}

        {/* hidden custom fields */}
        {dataset.fields
          .filter((f) => !f.showOnCard)
          .map((field) => {
            const value = card.customFields[field.key];
            if (value === undefined || value === "") return null;
            const display = Array.isArray(value) ? value.join(", ") : String(value);
            return (
              <div key={field.key} className="mb-2 text-sm">
                <span className="text-gray-500">{field.label}：</span>
                <span className="text-gray-700">{display}</span>
              </div>
            );
          })}

        {card.memo && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-xs font-medium text-gray-400 mb-1">メモ</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{card.memo}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
