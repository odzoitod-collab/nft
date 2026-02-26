import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { NFT } from '../types';
import NFTCard from './NFTCard';
import Header from './Header';

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

  const filteredNFTs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return nfts.filter((nft) => {
      const matchesSearch =
        !q ||
        (nft.title && nft.title.toLowerCase().includes(q)) ||
        (nft.subtitle && nft.subtitle.toLowerCase().includes(q)) ||
        (nft.code && nft.code.toLowerCase().includes(q)) ||
        (nft.id && nft.id.toLowerCase().includes(q));
      if (!matchesSearch) return false;
      const min = priceMin.trim() ? parseFloat(priceMin.replace(',', '.')) : null;
      const max = priceMax.trim() ? parseFloat(priceMax.replace(',', '.')) : null;
      if (min != null && !Number.isNaN(min) && nft.price < min) return false;
      if (max != null && !Number.isNaN(max) && nft.price > max) return false;
      return true;
    });
  }, [nfts, searchQuery, priceMin, priceMax]);

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
          <div className="grid grid-cols-2 gap-3">
            {displayList.map(({ nft, key }) => (
              <NFTCard key={key} nft={nft} onClick={onNftClick} />
            ))}
          </div>
        ) : (
          <EmptyState onReset={clearAll} />
        )}
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ onReset: () => void }> = ({ onReset }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-12 h-12 rounded-full bg-tg-card border border-white/5 flex items-center justify-center mb-3">
      <Search className="w-5 h-5 text-tg-hint opacity-50" />
    </div>
    <p className="text-sm font-medium text-white/90">Ничего не найдено</p>
    <p className="text-xs text-tg-hint mt-1">Измените поиск или фильтр по цене</p>
    <button
      onClick={onReset}
      className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-tg-button hover:bg-tg-button/10 transition-colors"
    >
      Сбросить
    </button>
  </div>
);

export default StoreView;
