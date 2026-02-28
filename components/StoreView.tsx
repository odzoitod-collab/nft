import React, { useState, useMemo } from 'react';
import { Search, Send, Coins } from 'lucide-react';
import { NFT } from '../types';
import NFTCard from './NFTCard';
import Header from './Header';

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
    <div className="pb-24 animate-fade-in pt-14 bg-tg-bg min-h-screen">
      <Header balance={userBalance} onOpenWallet={onOpenWallet} />

      {/* TG NFT / Crypto NFT */}
      <div className="px-4 pt-2 pb-3">
        <div className="flex gap-1 p-1 rounded-xl bg-tg-card border border-white/5">
          <button
            type="button"
            onClick={() => setMarketCategory('tg')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              marketCategory === 'tg'
                ? 'bg-tg-button text-white shadow-sm'
                : 'text-tg-hint hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <TelegramIcon className="w-4 h-4" />
            TG NFT
          </button>
          <button
            type="button"
            onClick={() => setMarketCategory('crypto')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              marketCategory === 'crypto'
                ? 'bg-tg-button text-white shadow-sm'
                : 'text-tg-hint hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <CoinsIcon className="w-4 h-4" />
            Крипто NFT
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-2 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-hint pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-tg-card border border-white/5 text-sm text-white placeholder-tg-hint outline-none focus:border-white/10 transition-colors"
          />
        </div>
      </div>

      {/* Price filter */}
      <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-tg-hint">Цена, TON:</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="от"
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value)}
          className="w-20 h-9 px-2 rounded-lg bg-tg-card border border-white/5 text-sm text-white placeholder-tg-hint outline-none focus:border-white/10"
        />
        <span className="text-tg-hint">—</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="до"
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          className="w-20 h-9 px-2 rounded-lg bg-tg-card border border-white/5 text-sm text-white placeholder-tg-hint outline-none focus:border-white/10"
        />
        {hasPriceFilter && (
          <button
            onClick={clearPriceFilter}
            className="flex-shrink-0 px-3 py-2 h-9 rounded-lg text-xs font-medium text-tg-hint hover:text-white border border-white/5 hover:border-white/10 transition-colors"
          >
            Сбросить цену
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="px-4 min-h-[200px]">
        {displayList.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 animate-in-stagger">
            {displayList.map(({ nft, key }) => (
              <NFTCard key={key} nft={nft} onClick={onNftClick} />
            ))}
          </div>
        ) : (
          <EmptyState onReset={clearAll} categoryLabel={marketCategory === 'tg' ? 'TG NFT' : 'Крипто NFT'} />
        )}
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ onReset: () => void; categoryLabel: string }> = ({ onReset, categoryLabel }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="svg-icon-pulse w-14 h-14 rounded-2xl bg-tg-card border border-white/5 flex items-center justify-center mb-4">
      <SearchIconAnimated className="w-7 h-7 text-tg-button" />
    </div>
    <p className="text-sm font-medium text-white/90">Ничего не найдено</p>
    <p className="text-xs text-tg-hint mt-1">В категории «{categoryLabel}» пока нет или измените поиск и фильтр</p>
    <button
      onClick={onReset}
      className="mt-5 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-tg-button/90 hover:bg-tg-button transition-colors svg-btn-press"
    >
      Сбросить
    </button>
  </div>
);

export default StoreView;
