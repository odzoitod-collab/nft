import React, { useState } from 'react';
import { NFT } from '../types';
import { X, Share2, ChevronRight, Gem, Check } from 'lucide-react';
import SellNFTSheet from './SellNFTSheet';

interface NFTDetailProps {
  nft: NFT;
  onBack: () => void;
  onBuy: (nft: NFT) => void;
  userBalance: number;
  isOwner: boolean;
  onOpenWallet: () => void;
  onSellNFT?: (nft: NFT, price: number, instant: boolean) => void;
}

const NFTDetail: React.FC<NFTDetailProps> = ({
  nft,
  onBack,
  onBuy,
  userBalance,
  isOwner,
  onOpenWallet,
  onSellNFT,
}) => {
  const canBuy = !isOwner && userBalance >= nft.price;
  const [isSellSheetOpen, setIsSellSheetOpen] = useState(false);
  const [showBuyAgreement, setShowBuyAgreement] = useState(false);

  const handleSell = (price: number, instant: boolean) => {
    onSellNFT?.(nft, price, instant);
  };

  const handleBuyClick = () => {
    if (!canBuy) {
      onOpenWallet();
      return;
    }
    setShowBuyAgreement(true);
  };

  const handleBuyConfirm = () => {
    setShowBuyAgreement(false);
    onBuy(nft);
  };

  return (
    <div className="fixed inset-0 z-50 bg-tg-bg flex flex-col overflow-y-auto sheet-panel-full">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between p-4 bg-tg-bg/90 backdrop-blur-md border-b border-white/5">
        <button
          type="button"
          onClick={onOpenWallet}
          className="flex items-center gap-2 h-9 px-3 rounded-lg bg-tg-card border border-white/5 text-sm font-medium text-white"
        >
          <Gem className="w-3.5 h-3.5 text-tg-button" />
          {userBalance.toFixed(2)}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-lg bg-tg-card border border-white/5 flex items-center justify-center text-tg-hint hover:text-white transition-colors"
          aria-label="Назад"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 px-4 pb-28">
        {/* Image */}
        <div className="flex justify-center pt-6 pb-4">
          <div className="relative w-56 h-56 rounded-xl overflow-hidden border border-white/5 bg-tg-card">
            <img
              src={nft.image}
              alt={nft.title}
              className="w-full h-full object-cover"
            />
            {isOwner && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-tg-button/90 text-white text-xs font-medium">
                <Check className="w-3 h-3" />
                Владелец
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-white flex items-center justify-center gap-1">
            {nft.title}
            <ChevronRight className="w-5 h-5 text-tg-hint" />
          </h1>
          <p className="mt-1 text-sm text-tg-hint">Код: {nft.code || nft.id}</p>
        </div>

        {/* Attributes */}
        <div className="rounded-xl border border-white/5 bg-tg-card overflow-hidden mb-6">
          <Row label="Код" value={nft.code || nft.id} />
          <Row label="Модель" value={nft.model || '—'} />
          <Row label="Коллекция" value={nft.collection || '—'} />
          <Row label="Фон" value={nft.backdrop || '—'} />
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-sm text-tg-hint">Цена</span>
            <span className="text-sm font-semibold text-white flex items-center gap-1">
              <Gem className="w-3.5 h-3.5 text-tg-button" />
              {nft.price} TON
            </span>
          </div>
        </div>

        <button
          type="button"
          className="w-full h-10 rounded-lg border border-white/5 flex items-center justify-center gap-2 text-sm text-tg-hint hover:bg-white/5 hover:text-white transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Поделиться
        </button>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-tg-bg/95 backdrop-blur-md border-t border-white/5 pb-safe max-w-md mx-auto z-40">
        <div className="flex gap-3">
          {isOwner && (
            <button
              type="button"
              onClick={() => setIsSellSheetOpen(true)}
              className="flex-1 h-12 rounded-xl font-medium text-sm text-white bg-tg-card border border-white/5 hover:bg-tg-elevated transition-colors"
            >
              Выставить
            </button>
          )}
          {isOwner ? (
            <div className="flex-1 h-12 rounded-xl flex flex-col items-center justify-center bg-tg-button/10 border border-tg-button/20 text-tg-button text-sm font-medium">
              <span>Вы владелец</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleBuyClick}
              className={`flex-1 h-12 rounded-xl font-medium text-sm text-white transition-colors flex flex-col items-center justify-center ${
                canBuy
                  ? 'bg-tg-button hover:opacity-90'
                  : 'bg-red-500/80 hover:bg-red-500'
              }`}
            >
              <span>{canBuy ? 'Купить' : 'Пополнить'}</span>
              <span className="text-xs opacity-80">{nft.price} TON</span>
            </button>
          )}
        </div>
      </div>

      {/* Соглашение перед покупкой */}
      {showBuyAgreement && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowBuyAgreement(false)} aria-hidden />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[61] bg-tg-card rounded-xl border border-white/10 p-4 shadow-xl max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-white mb-2">Согласие с условиями покупки</h3>
            <p className="text-sm text-tg-hint mb-4">
              Нажимая «Я согласен», вы подтверждаете покупку NFT «{nft.title}» за {nft.price} TON. Средства будут списаны с баланса, NFT поступит в ваш портфель. Отмена после списания невозможна.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBuyAgreement(false)}
                className="flex-1 h-10 rounded-lg text-sm font-medium text-white border border-white/5 hover:bg-white/5"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleBuyConfirm}
                className="flex-1 h-10 rounded-lg text-sm font-medium text-white bg-tg-button hover:opacity-90"
              >
                Я согласен
              </button>
            </div>
          </div>
        </>
      )}

      <SellNFTSheet
        isOpen={isSellSheetOpen}
        onClose={() => setIsSellSheetOpen(false)}
        nft={nft}
        onSell={handleSell}
      />
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0">
    <span className="text-sm text-tg-hint">{label}</span>
    <span className="text-sm font-medium text-white">{value}</span>
  </div>
);

export default NFTDetail;
