import React, { useState, useEffect, useCallback } from 'react';
import { NFT } from '../types';
import { ChevronRight, Gem, Check } from 'lucide-react';
import SellNFTSheet from './SellNFTSheet';
import Button from './Button';
import FullScreenView from './FullScreenView';
import {
  showBackButton,
  hideBackButton,
  onBackButtonClick,
  hideMainButton,
} from '../services/telegramWebApp';

interface NFTDetailProps {
  nft: NFT;
  onBack: () => void;
  onBuy: (nft: NFT) => void;
  userBalance: number;
  isOwner: boolean;
  onOpenWallet: () => void;
  onSellNFT?: (nft: NFT, price: number, instant: boolean) => void;
  onError?: (message: string) => void;
}

const NFTDetail: React.FC<NFTDetailProps> = ({
  nft,
  onBack,
  onBuy,
  userBalance,
  isOwner,
  onOpenWallet,
  onSellNFT,
  onError,
}) => {
  const canBuy = !isOwner && userBalance >= nft.price;
  const [isSellSheetOpen, setIsSellSheetOpen] = useState(false);
  const [showBuyAgreement, setShowBuyAgreement] = useState(false);

  const handleBuyClick = useCallback(() => {
    if (!canBuy) {
      onOpenWallet();
      return;
    }
    setShowBuyAgreement(true);
  }, [canBuy, onOpenWallet]);

  // TG BackButton: показываем на full-screen, дублируем нашу кнопку «Назад»
  // TG MainButton не показываем — только наши кнопки в футере (иначе дубль и белый фон у нативной кнопки)
  useEffect(() => {
    hideMainButton();
    showBackButton();
    const off = onBackButtonClick(onBack);
    return () => {
      off();
      hideBackButton();
    };
  }, [onBack]);

  const handleSell = (price: number, instant: boolean) => {
    onSellNFT?.(nft, price, instant);
  };

  const handleBuyConfirm = () => {
    setShowBuyAgreement(false);
    onBuy(nft);
  };

  const footer = (
    <div className="flex gap-3 max-w-md mx-auto">
      {isOwner && (
        <Button variant="secondary" flexRatio={1} onClick={() => setIsSellSheetOpen(true)}>
          Выставить
        </Button>
      )}
      {isOwner ? (
        <div className="flex-[2] h-[52px] rounded-md flex flex-col items-center justify-center bg-tg-button/10 border border-tg-button/20 text-tg-button text-[17px] font-semibold">
          <span>Вы владелец</span>
        </div>
      ) : (
        <Button
          variant="primary"
          onClick={handleBuyClick}
          className="flex-1 flex flex-col items-center justify-center gap-0.5"
        >
          <span>{canBuy ? 'Купить' : 'Пополнить'}</span>
          <span className="text-[13px] font-medium opacity-90">{nft.price} TON</span>
        </Button>
      )}
    </div>
  );

  return (
    <FullScreenView
      onBack={onBack}
      balance={userBalance}
      onBalanceClick={onOpenWallet}
      footer={footer}
    >
      <div className="px-4 pb-6">
        {/* Image */}
        <div className="flex justify-center pt-6 pb-4">
          <div className="relative w-56 h-56 rounded-xl overflow-hidden border border-white/5 bg-tg-card">
            <img
              src={nft.image}
              alt={nft.title}
              className="w-full h-full object-cover aspect-square"
              loading="lazy"
              decoding="async"
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
        <p className="mt-1 text-sm text-tg-hint">Код: {nft.code || nft.id}{nft.catalogId != null ? ` · ID: ${nft.catalogId}` : ''}</p>
        </div>

        {/* Attributes */}
        <div className="rounded-xl border border-white/5 bg-tg-card overflow-hidden mb-6">
          {nft.catalogId != null && <Row label="ID" value={String(nft.catalogId)} />}
          <Row label="Код" value={nft.code || nft.id} />
          <Row label="Модель" value={nft.model || '—'} />
          <Row label="Коллекция" value={nft.collection || '—'} />
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-sm text-tg-hint">Цена</span>
            <span className="text-sm font-semibold text-white flex items-center gap-1">
              <Gem className="w-3.5 h-3.5 text-tg-button" />
              {nft.price} TON
            </span>
          </div>
        </div>
      </div>

      {/* Соглашение перед покупкой — Ghost + Primary */}
      {showBuyAgreement && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[40]" onClick={() => setShowBuyAgreement(false)} aria-hidden />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[50] bg-tg-card rounded-lg border border-tg-border-default p-4 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-white mb-2">Согласие с условиями покупки</h3>
            <p className="text-sm text-tg-hint mb-4">
              Нажимая «Я согласен», вы подтверждаете покупку NFT «{nft.title}» за {nft.price} TON. Средства будут списаны с баланса, NFT поступит в ваш портфель. Отмена после списания невозможна.
            </p>
            <div className="flex flex-row gap-3">
              <Button variant="ghost" flexRatio={1} onClick={() => setShowBuyAgreement(false)}>
                Отмена
              </Button>
              <Button variant="primary" flexRatio={2} onClick={handleBuyConfirm}>
                Я согласен
              </Button>
            </div>
          </div>
        </>
      )}

      <SellNFTSheet
        isOpen={isSellSheetOpen}
        onClose={() => setIsSellSheetOpen(false)}
        nft={nft}
        onSell={handleSell}
        onError={onError}
      />
    </FullScreenView>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0">
    <span className="text-sm text-tg-hint">{label}</span>
    <span className="text-sm font-medium text-white">{value}</span>
  </div>
);

export default NFTDetail;
