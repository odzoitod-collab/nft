import React from 'react';
import { NFT } from '../types';
import { Gem } from 'lucide-react';

interface NFTCardProps {
  nft: NFT;
  onClick: (nft: NFT) => void;
}

const NFTCard: React.FC<NFTCardProps> = ({ nft, onClick }) => {
  return (
    <button
      type="button"
      className="w-full text-left bg-tg-card rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all active:scale-[0.99] flex flex-col h-full group"
      onClick={() => onClick(nft)}
    >
      <div className="aspect-square bg-tg-elevated relative overflow-hidden">
        <img
          src={nft.image}
          alt={nft.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {nft.verified && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-tg-button flex items-center justify-center shadow-lg">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1 min-h-0">
        <h3 className="font-semibold text-white text-sm leading-tight truncate">
          {nft.title}
        </h3>
        <p className="text-tg-hint text-xs mt-0.5 truncate">
          {nft.code ? `Код: ${nft.code}` : nft.subtitle || `#${nft.id}`}
        </p>
        <div className="mt-auto pt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-sm text-white">
            <Gem className="w-3.5 h-3.5 text-tg-button" />
            {nft.price}
          </span>
          <span className="text-[10px] text-tg-hint font-medium">TON</span>
        </div>
      </div>
    </button>
  );
};

export default NFTCard;
