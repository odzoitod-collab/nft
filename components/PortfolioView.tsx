import React, { useMemo, useState } from 'react';
import { Briefcase, Receipt } from 'lucide-react';
import { NFT, Transaction } from '../types';
import NFTCard from './NFTCard';
import Header from './Header';
import EmptyState from './EmptyState';

type PortfolioTab = 'portfolio' | 'sold';

interface PortfolioViewProps {
  nfts: NFT[];
  soldTransactions: Transaction[];
  catalog: NFT[];
  onNftClick: (nft: NFT) => void;
  userBalance: number;
  onOpenWallet: () => void;
}

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

const PortfolioView: React.FC<PortfolioViewProps> = ({
  nfts,
  soldTransactions,
  catalog,
  onNftClick,
  userBalance,
  onOpenWallet,
}) => {
  const [tab, setTab] = useState<PortfolioTab>('portfolio');

  const catalogByCode = useMemo(() => {
    const m = new Map<string, NFT>();
    catalog.forEach((n) => {
      if (n.code) m.set(n.code, n);
      m.set(n.id, n);
    });
    return m;
  }, [catalog]);

  const soldItems = useMemo(() => {
    return soldTransactions
      .filter((t): t is Transaction & { nft_id: string; nft_title: string } =>
        t.type === 'sell' && Boolean(t.nft_id && t.nft_title)
      )
      .map((t) => ({
        ...t,
        image: catalogByCode.get(t.nft_id)?.image ?? '',
      }));
  }, [soldTransactions, catalogByCode]);

  return (
    <div className="animate-fade-in min-h-screen bg-tg-bg">
      <div className="screen-content">
        <Header balance={userBalance} onOpenWallet={onOpenWallet} title="Портфель" />

        <div className="px-4 pt-4 pb-4">
        <div className="flex gap-1 p-0.5 rounded-lg bg-tg-card border border-white/5 w-full">
          <TabButton
            active={tab === 'portfolio'}
            onClick={() => setTab('portfolio')}
            label="Портфель"
          />
          <TabButton
            active={tab === 'sold'}
            onClick={() => setTab('sold')}
            label="Проданые"
          />
        </div>
      </div>

      {tab === 'portfolio' && (
        <>
          {nfts.length > 0 ? (
            <div className="p-4 grid grid-cols-2 gap-3">
              {nfts.map((nft, i) => (
                <NFTCard
                  key={nft.rowId ?? `${nft.id}-${i}`}
                  nft={nft}
                  onClick={onNftClick}
                  showOwnerBadge
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Briefcase className="w-12 h-12" />}
              title="Портфель пуст"
              subtitle="Купленные NFT появятся здесь"
            />
          )}
        </>
      )}

      {tab === 'sold' && (
        <>
          {soldItems.length > 0 ? (
            <div className="p-4 grid grid-cols-2 gap-3">
              {soldItems.map((item) => (
                <div
                  key={`${item.id}-${item.date}`}
                  className="w-full bg-tg-card rounded-xl overflow-hidden border border-white/5 flex flex-col"
                >
                  <div className="aspect-square bg-tg-elevated relative overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.nft_title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Receipt className="w-10 h-10 text-tg-hint" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5">
                      <span className="text-[10px] font-medium text-green-400">{item.amount}</span>
                    </div>
                  </div>
                  <div className="p-3 flex flex-col flex-1 min-h-0">
                    <h3 className="font-semibold text-white text-sm leading-tight truncate">
                      {item.nft_title}
                    </h3>
                    <p className="text-tg-hint text-xs mt-0.5">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Receipt className="w-12 h-12" />}
              title="Проданных нет"
              subtitle="Здесь появятся NFT, которые вы продали"
            />
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default PortfolioView;
