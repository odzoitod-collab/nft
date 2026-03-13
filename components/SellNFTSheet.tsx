import React, { useState } from 'react';
import { Gem } from 'lucide-react';
import { NFT } from '../types';
import Button from './Button';
import ButtonPair from './ButtonPair';
import BottomSheet from './BottomSheet';

interface SellNFTSheetProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT;
  /** price — сумма в TON, instant — продажа по рыночной (моментально), иначе листинг по своей цене */
  onSell: (price: number, instant: boolean) => void;
  onError?: (message: string) => void;
}

type SellMode = 'choice' | 'market' | 'custom';

const SellNFTSheet: React.FC<SellNFTSheetProps> = ({ isOpen, onClose, nft, onSell, onError }) => {
  const [mode, setMode] = useState<SellMode>('choice');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSellAgreement, setShowSellAgreement] = useState(false);
  const [pendingSell, setPendingSell] = useState<{ price: number; instant: boolean } | null>(null);

  const marketPrice = nft.price ?? 0;

  const doInstantSell = async () => {
    if (marketPrice <= 0) return;
    setIsSubmitting(true);
    await onSell(marketPrice, true);
    setIsSubmitting(false);
    setPrice('');
    setMode('choice');
    setPendingSell(null);
    setShowSellAgreement(false);
    onClose();
  };

  const doCustomSell = async (priceNum: number) => {
    setIsSubmitting(true);
    const totalPrice = nft.is_duo ? priceNum * 2 : priceNum;
    await onSell(totalPrice, false);
    setIsSubmitting(false);
    setPrice('');
    setMode('choice');
    setPendingSell(null);
    setShowSellAgreement(false);
    onClose();
  };

  const handleInstantSell = () => {
    if (marketPrice <= 0) {
      onError?.('Рыночная цена недоступна');
      return;
    }
    setPendingSell({ price: nft.is_duo ? 2 * marketPrice : marketPrice, instant: true });
    setShowSellAgreement(true);
  };

  const handleSubmitCustom = () => {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      onError?.('Введите корректную цену');
      return;
    }
    if (priceNum < 1) {
      onError?.('Минимальная цена: 1 TON');
      return;
    }
    if (priceNum > 10000) {
      onError?.('Максимальная цена: 10 000 TON');
      return;
    }
    setPendingSell({ price: priceNum, instant: false });
    setShowSellAgreement(true);
  };

  const handleAgreementConfirm = async () => {
    if (!pendingSell) return;
    if (pendingSell.instant) {
      await doInstantSell();
    } else {
      await doCustomSell(pendingSell.price);
    }
  };

  const resetAndClose = () => {
    setMode('choice');
    setPrice('');
    onClose();
  };

  if (!isOpen) return null;

  const renderFooter = () => {
    if (mode === 'choice') {
      return (
        <Button variant="secondary" onClick={resetAndClose} className="w-full">
          Отмена
        </Button>
      );
    }
    if (mode === 'market') {
      return (
        <ButtonPair
          backLabel="Назад"
          onBack={() => setMode('choice')}
          confirmLabel={nft.is_duo ? 'Продать пару (2 шт.)' : 'Продать моментально'}
          onConfirm={handleInstantSell}
          confirmVariant="destructive"
          confirmDisabled={isSubmitting || marketPrice <= 0}
          confirmLoading={isSubmitting}
        />
      );
    }
    if (mode === 'custom') {
      return (
        <ButtonPair
          backLabel="Назад"
          onBack={() => setMode('choice')}
          confirmLabel="Выставить"
          onConfirm={handleSubmitCustom}
          confirmDisabled={isSubmitting || !price}
          confirmLoading={isSubmitting}
        />
      );
    }
    return null;
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={resetAndClose}
        title="Продажа NFT"
        size="auto"
        zIndex={50}
        footer={renderFooter()}
      >
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-tg-bg border border-tg-border-subtle">
            <img
              src={nft.image}
              alt={nft.title}
              loading="lazy"
              decoding="async"
              className="w-14 h-14 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <h3 className="font-medium text-white truncate">{nft.title}</h3>
              <p className="text-xs text-tg-hint truncate">{nft.code ? `Код: ${nft.code}` : `#${nft.id}`}</p>
            </div>
          </div>

        {nft.is_duo && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <p className="text-[15px] text-amber-200">
              Дуо-токен: продаются оба NFT (2 шт.) сразу. Если у вас только один — продажа недоступна. Цена указана за один; за пару вы получите 2 × цену.
            </p>
          </div>
        )}

        {mode === 'choice' && (
          <>
            <p className="text-[15px] text-tg-hint mb-3">Выберите способ продажи:</p>
            <div className="space-y-2 mb-6">
              <button
                type="button"
                onClick={() => setMode('market')}
                className="w-full p-4 rounded-xl bg-tg-bg border border-tg-border-subtle hover:border-tg-button/50 text-left transition-colors"
              >
                <span className="font-medium text-white block">По рыночной</span>
                <span className="text-[13px] text-tg-hint">Продажа моментально по текущей цене маркета ({marketPrice} TON)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className="w-full p-4 rounded-xl bg-tg-bg border border-tg-border-subtle hover:border-tg-button/50 text-left transition-colors"
              >
                <span className="font-medium text-white block">По своей цене</span>
                <span className="text-[13px] text-tg-hint">Укажите цену — после покупки средства поступят на баланс</span>
              </button>
            </div>
          </>
        )}

        {mode === 'market' && (
          <div className="mb-4 p-4 rounded-xl bg-tg-button/10 border border-tg-button/20">
            <p className="text-tg-hint text-[13px] mb-1">Цена за один</p>
            <p className="text-xl font-semibold text-white flex items-center gap-1">
              <Gem className="w-5 h-5 text-tg-button" />
              {marketPrice} TON
            </p>
            {nft.is_duo && (
              <p className="text-[15px] text-white mt-2">Итого за пару (2 шт.): {2 * marketPrice} TON</p>
            )}
            <p className="text-[13px] text-tg-hint mt-2">
              {nft.is_duo ? 'Будут проданы оба NFT сразу, средства зачислятся на баланс.' : 'NFT будет продан сразу, средства зачислятся на баланс.'}
            </p>
          </div>
        )}

        {mode === 'custom' && (
          <>
            <label className="block text-[15px] font-medium text-tg-hint mb-2">
              {nft.is_duo ? 'Цена за один NFT (TON). За пару будет зачислено 2 × эта сумма' : 'Ваша цена (TON)'}
            </label>
            <div className="relative mb-4">
              <Gem className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-hint pointer-events-none" />
              <input
                type="number"
                step="0.01"
                min="1"
                max="10000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full h-11 pl-9 pr-3 rounded-md bg-tg-input border border-tg-border-subtle text-white placeholder-tg-hint outline-none focus:border-tg-border-default text-sm"
              />
            </div>
            <p className="text-[13px] text-tg-hint mb-6">
              Мин. 1 TON, макс. 10 000 TON. После покупки средства поступят на баланс.
            </p>
          </>
        )}
      </BottomSheet>

      {/* Соглашение перед продажей */}
      {showSellAgreement && pendingSell && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[40]"
            onClick={() => { setShowSellAgreement(false); setPendingSell(null); }}
            aria-hidden
          />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[50] bg-tg-card rounded-xl border border-white/10 p-4 shadow-xl max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-white mb-2">Согласие с условиями продажи</h3>
            <p className="text-sm text-tg-hint mb-4">
              {pendingSell.instant
                ? nft.is_duo
                  ? `Вы подтверждаете моментальную продажу пары (2 шт.) NFT «${nft.title}» по ${pendingSell.price / 2} TON за один. Итого к зачислению: ${pendingSell.price} TON. Оба NFT будут сняты с портфеля.`
                  : `Вы подтверждаете моментальную продажу NFT «${nft.title}» по рыночной цене ${pendingSell.price} TON. NFT будет снят с портфеля, средства зачислены на баланс.`
                : nft.is_duo
                  ? `Вы подтверждаете выставление пары (2 шт.) NFT «${nft.title}» на продажу. Итого за пару: ${pendingSell.price * 2} TON. После покупки средства поступят на баланс, оба NFT будут сняты с портфеля.`
                  : `Вы подтверждаете выставление NFT «${nft.title}» на продажу за ${pendingSell.price} TON. После покупки средства поступят на баланс, NFT будет снят с портфеля.`}
            </p>
            <div className="flex flex-row gap-3 pb-[max(24px,env(safe-area-inset-bottom))]">
              <Button variant="ghost" flexRatio={1} onClick={() => { setShowSellAgreement(false); setPendingSell(null); }}>
                Отмена
              </Button>
              <Button variant="primary" flexRatio={2} onClick={handleAgreementConfirm} disabled={isSubmitting} isLoading={isSubmitting}>
                Я согласен
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SellNFTSheet;
