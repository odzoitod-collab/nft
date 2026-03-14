import React from 'react';
import { NFT } from '../types';

interface NFTCardProps {
  nft: NFT;
  onClick: (nft: NFT) => void;
  /** Показывать бейдж «Владелец» (в портфеле) */
  showOwnerBadge?: boolean;
}

const NFTCard: React.FC<NFTCardProps> = ({ nft, onClick, showOwnerBadge }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(nft);
  };

  return (
    <button
      type="button"
      className="nft-card min-touch w-full text-left flex flex-col h-full"
      style={{ touchAction: 'manipulation' }}
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="aspect-square w-full relative overflow-hidden bg-[var(--bg-raised)]">
        <img
          src={nft.image}
          alt={nft.title}
          className="w-full h-full object-cover aspect-square"
          style={{ transitionTimingFunction: 'var(--ease-spring)' }}
          loading="lazy"
          decoding="async"
        />
        {showOwnerBadge && (
          <span
            className="absolute top-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-semibold text-[var(--text-primary)]"
            style={{ background: 'rgba(0,145,255,0.85)' }}
          >
            Владелец
          </span>
        )}
        {nft.verified && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-tg-button flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>
      <div
        className="flex flex-col flex-1 min-h-0"
        style={{ padding: '10px 12px' }}
      >
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] leading-tight truncate">
          {nft.title}
        </h3>
        <p className="text-[12px] text-[var(--text-secondary)] truncate mt-0.5">
          {nft.collection || (nft.catalogId != null ? `ID: ${nft.catalogId}` : '') || nft.code || nft.subtitle || `#${nft.id}`}
        </p>
        <div className="mt-auto pt-2 flex items-baseline gap-1">
          <span className="text-[15px] font-bold text-[var(--text-primary)]">
            {nft.price}
          </span>
          <span className="text-[13px] text-[var(--accent)] font-medium">TON</span>
        </div>
      </div>
    </button>
  );
};

export default React.memo(NFTCard);
