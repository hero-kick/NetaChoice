import type { CardStatus } from "../types";
import { STATUS_LABELS } from "../types";

interface StatusBadgeProps {
  status: CardStatus;
  size?: "sm" | "md";
}

const colorMap: Record<CardStatus, string> = {
  keep: "bg-keep-light text-keep",
  discard: "bg-discard-light text-discard",
  hold: "bg-hold-light text-hold",
  unclassified: "bg-unclassified-light text-unclassified",
};

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const sizeClass = size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-block rounded-full font-medium ${sizeClass} ${colorMap[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
