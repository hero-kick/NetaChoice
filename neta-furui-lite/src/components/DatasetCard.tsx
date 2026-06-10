import type { Dataset, Card } from "../types";

interface DatasetCardProps {
  dataset: Dataset;
  cards: Card[];
  onClick: () => void;
  onEdit?: () => void;
}

export default function DatasetCard({ dataset, cards, onClick, onEdit }: DatasetCardProps) {
  const datasetCards = cards.filter((c) => c.datasetId === dataset.id);
  const unclassified = datasetCards.filter((c) => c.status === "unclassified").length;
  const keep = datasetCards.filter((c) => c.status === "keep").length;
  const total = datasetCards.length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start gap-3">
        {dataset.icon && (
          <span className="text-2xl mt-0.5">{dataset.icon}</span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-800 truncate">
            {dataset.name}
          </h3>
          {dataset.description && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {dataset.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-gray-500">
              未分類 <span className="font-bold text-gray-700">{unclassified}</span>
            </span>
            <span className="text-keep">
              残す <span className="font-bold">{keep}</span>
            </span>
            <span className="text-gray-400 ml-auto text-xs">
              全{total}件
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          {onEdit && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.stopPropagation(); onEdit(); }
              }}
              className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
          )}
          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}
