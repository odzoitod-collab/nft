import React, { useMemo, useState } from 'react';
import { Briefcase, Receipt } from 'lucide-react';
import { NFT, Transaction } from '../types';
import NFTCard from './NFTCard';
import Header from './Header';

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
    <div className="pb-24 animate-fade-in min-h-screen pt-14 bg-tg-bg">
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
            <div className="px-4 grid grid-cols-2 gap-3">
              {nfts.map((nft, i) => (
                <NFTCard
                  key={nft.rowId ?? `${nft.id}-${i}`}
                  nft={nft}
                  onClick={onNftClick}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-xl bg-tg-card border border-white/5 flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-tg-hint" />
              </div>
              <p className="text-sm font-medium text-white">Портфель пуст</p>
              <p className="text-xs text-tg-hint mt-1 max-w-[220px]">
                Купленные NFT появятся здесь.
              </p>
            </div>
          )}
        </>
      )}

      {tab === 'sold' && (
        <>
          {soldItems.length > 0 ? (
            <div className="px-4 grid grid-cols-2 gap-3">
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
                        className="w-full h-full object-cover"
                        loading="lazy"
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
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-xl bg-tg-card border border-white/5 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6 text-tg-hint" />
              </div>
              <p className="text-sm font-medium text-white">Проданных нет</p>
              <p className="text-xs text-tg-hint mt-1 max-w-[220px]">
                Здесь появятся NFT, которые вы продали.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PortfolioView;
