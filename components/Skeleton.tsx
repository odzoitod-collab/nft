import React from 'react';

/** Один блок скелетона с shimmer */
export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton rounded-md ${className}`} />
);

/** Скелетон карточки NFT — те же размеры, что и NFTCard */
export const SkeletonCard: React.FC = () => (
  <div className="w-full bg-tg-card rounded-xl overflow-hidden border border-tg-border-subtle flex flex-col h-full">
    <SkeletonBlock className="aspect-square w-full rounded-none" />
    <div className="p-3 flex flex-col flex-1 gap-2">
      <SkeletonBlock className="h-4 w-3/4" />
      <SkeletonBlock className="h-3 w-1/2" />
      <div className="mt-auto pt-3 flex items-center gap-2">
        <SkeletonBlock className="h-4 w-12" />
        <SkeletonBlock className="h-3 w-8" />
      </div>
    </div>
  </div>
);

/** Сетка 2×3 = 6 скелетонов для маркета */
export const NFTSkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: 6 }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

/** Одна строка скелетона для истории (превью + текст + сумма) */
export const SkeletonHistoryRow: React.FC = () => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-tg-card border border-tg-border-subtle">
    <SkeletonBlock className="w-11 h-11 rounded-lg shrink-0" />
    <div className="flex-1 min-w-0 space-y-1">
      <SkeletonBlock className="h-4 w-2/3" />
      <SkeletonBlock className="h-3 w-1/3" />
    </div>
    <SkeletonBlock className="h-4 w-14 shrink-0" />
  </div>
);

/** 4 скелетона для списка истории */
export const HistorySkeletonList: React.FC = () => (
  <ul className="space-y-2">
    {Array.from({ length: 4 }, (_, i) => (
      <li key={i}>
        <SkeletonHistoryRow />
      </li>
    ))}
  </ul>
);

export default SkeletonBlock;
