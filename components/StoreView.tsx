import React, { useState, useMemo } from 'react';
import { Search, Coins } from 'lucide-react';
import { NFT } from '../types';
import NFTCard from './NFTCard';
import Header from './Header';
import Input from './Input';
import { NFTSkeletonGrid } from './Skeleton';
import EmptyState from './EmptyState';

/** Иконка Telegram для TG NFT */
const TelegramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);
/** Иконка монет для Крипто NFT */
const CoinsIcon = Coins;

/** Анимированная иконка лупы для пустого состояния */
const SearchIconAnimated: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8" className="svg-stroke-dash" />
    <path d="M21 21l-4.35-4.35" className="svg-draw-line" />
  </svg>
);

interface StoreViewProps {
  nfts: NFT[];
  onNftClick: (nft: NFT) => void;
  userBalance?: number;
  onOpenWallet: () => void;
  marketListSeed: number;
  catalogLoading?: boolean;
}

/** Генератор псевдослучайных чисел по seed */
function seededRng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

const StoreView: React.FC<StoreViewProps> = ({
  nfts,
  onNftClick,
  userBalance,
  onOpenWallet,
  marketListSeed,
  catalogLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [marketCategory, setMarketCategory] = useState<'tg' | 'crypto'>('tg');

  const filteredNFTs = useMemo(() => {
    const byCategory = nfts.filter((nft) => {
      const type = nft.nftType ?? 'tg'; /* без поля в БД — TG NFT */
      return type === marketCategory;
    });
    const q = searchQuery.trim().toLowerCase();
    return byCategory.filter((nft) => {
      const matchesSearch =
        !q ||
        (nft.title && nft.title.toLowerCase().includes(q)) ||
        (nft.subtitle && nft.subtitle.toLowerCase().includes(q)) ||
        (nft.code && nft.code.toLowerCase().includes(q)) ||
        (nft.id && nft.id.toLowerCase().includes(q)) ||
        (nft.catalogId != null && String(nft.catalogId) === q);
      if (!matchesSearch) return false;
      const min = priceMin.trim() ? parseFloat(priceMin.replace(',', '.')) : null;
      const max = priceMax.trim() ? parseFloat(priceMax.replace(',', '.')) : null;
      if (min != null && !Number.isNaN(min) && nft.price < min) return false;
      if (max != null && !Number.isNaN(max) && nft.price > max) return false;
      return true;
    });
  }, [nfts, marketCategory, searchQuery, priceMin, priceMax]);

  const displayList = useMemo(() => {
    const rnd = seededRng(marketListSeed);
    const list = filteredNFTs.map((nft, i) => ({ nft, key: `${nft.id}-${i}` }));
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [filteredNFTs, marketListSeed]);

  const hasPriceFilter = priceMin.trim() !== '' || priceMax.trim() !== '';
  const clearPriceFilter = () => {
    setPriceMin('');
    setPriceMax('');
  };
  const clearAll = () => {
    setSearchQuery('');
    clearPriceFilter();
  };

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="screen-content">
        <Header balance={userBalance} onOpenWallet={onOpenWallet} />

        {/* Pill: TG NFT / Крипто NFT */}
        <div className="px-4 pt-2 pb-3">
          <div
            className="flex gap-0 p-1 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--bg-raised)' }}
          >
            <button
              type="button"
              onClick={() => setMarketCategory('tg')}
              className={`flex-1 py-2 px-4 rounded-[var(--radius-md)] text-[15px] font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                marketCategory === 'tg'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
                  : 'text-[var(--text-secondary)]'
              }`}
              style={{ transitionTimingFunction: 'var(--ease-spring)' }}
            >
              <TelegramIcon className="w-4 h-4" />
              TG NFT
            </button>
            <button
              type="button"
              onClick={() => setMarketCategory('crypto')}
              className={`flex-1 py-2 px-4 rounded-[var(--radius-md)] text-[15px] font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                marketCategory === 'crypto'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
                  : 'text-[var(--text-secondary)]'
              }`}
              style={{ transitionTimingFunction: 'var(--ease-spring)' }}
            >
              <CoinsIcon className="w-4 h-4" />
              Крипто NFT
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-2 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
            <Input
              type="text"
              placeholder="Поиск"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Price filter */}
        <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[var(--text-secondary)]">Цена, TON:</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="от"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="w-20 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[17px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(0,145,255,0.15)] transition-[border-color,box-shadow] duration-150"
          />
          <span className="text-[var(--text-secondary)]">—</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="до"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="w-20 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[17px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(0,145,255,0.15)] transition-[border-color,box-shadow] duration-150"
          />
          {hasPriceFilter && (
            <button
              onClick={clearPriceFilter}
              className="flex-shrink-0 min-touch px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors"
            >
              Сбросить цену
            </button>
          )}
        </div>

      {/* Grid */}
      <div className="p-4 min-h-[200px]">
        {catalogLoading ? (
          <NFTSkeletonGrid />
        ) : displayList.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {displayList.map(({ nft, key }) => (
              <NFTCard key={key} nft={nft} onClick={onNftClick} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<SearchIconAnimated className="w-12 h-12" />}
            title="Ничего не найдено"
            subtitle={`В категории «${marketCategory === 'tg' ? 'TG NFT' : 'Крипто NFT'}» пока нет или измените поиск и фильтр`}
            ctaLabel="Сбросить"
            onCtaClick={clearAll}
          />
        )}
        </div>
      </div>
    </div>
  );
};

export default StoreView;
