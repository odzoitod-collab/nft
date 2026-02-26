import React, { useState } from 'react';
import { Gift, ShoppingBag, Box } from 'lucide-react';
import { NFT } from '../types';
import NFTCard from './NFTCard';
import Header from './Header';

interface GiftsViewProps {
  nfts: NFT[];
  onNftClick: (nft: NFT) => void;
  userBalance: number;
  onOpenWallet: () => void;
}

type GiftFilter = 'all' | 'gift' | 'purchase';

const GiftsView: React.FC<GiftsViewProps> = ({ nfts, onNftClick, userBalance, onOpenWallet }) => {
  const [filter, setFilter] = useState<GiftFilter>('all');

  const filteredNfts = nfts.filter((nft) => {
    if (filter === 'all') return true;
    return nft.origin === filter;
  });

  return (
    <div className="pb-24 animate-fade-in min-h-screen pt-14 bg-tg-bg">
      <Header balance={userBalance} onOpenWallet={onOpenWallet} title="Подарки" />

      <div className="px-4 pt-4 pb-4">
        <div className="flex gap-1 p-0.5 rounded-lg bg-tg-card border border-white/5 w-full">
          <TabButton active={filter === 'all'} onClick={() => setFilter('all')} label="Все" />
          <TabButton active={filter === 'gift'} onClick={() => setFilter('gift')} label="Подарки" />
          <TabButton active={filter === 'purchase'} onClick={() => setFilter('purchase')} label="Покупки" />
        </div>
      </div>

      {filteredNfts.length > 0 ? (
        <div className="px-4 grid grid-cols-2 gap-3">
          {filteredNfts.map((nft, i) => (
            <NFTCard key={nft.rowId ?? `${nft.id}-${i}`} nft={nft} onClick={onNftClick} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-xl bg-tg-card border border-white/5 flex items-center justify-center mb-4">
            {filter === 'purchase' ? (
              <ShoppingBag className="w-6 h-6 text-tg-hint" />
            ) : filter === 'gift' ? (
              <Gift className="w-6 h-6 text-tg-hint" />
            ) : (
              <Box className="w-6 h-6 text-tg-hint" />
            )}
          </div>
          <p className="text-sm font-medium text-white">Пусто</p>
          <p className="text-xs text-tg-hint mt-1 max-w-[220px]">
            Здесь появятся предметы после покупки или получения подарка.
          </p>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="mt-6 px-4 py-2 rounded-lg text-sm font-medium text-tg-button hover:bg-tg-button/10 transition-colors"
          >
            Сбросить фильтр
          </button>
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
      active ? 'bg-white/10 text-white' : 'text-tg-hint hover:text-white/80'
    }`}
  >
    {label}
  </button>
);

export default GiftsView;
