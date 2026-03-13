import React, { useState } from 'react';
import { ArrowUp, Plus, Wallet, ChevronRight } from 'lucide-react';
import Button from './Button';
import BottomSheet from './BottomSheet';

interface WalletSheetProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onDeposit: () => void;
  onCardDeposit: () => void;
  onWithdraw: () => void;
}

const WalletSheet: React.FC<WalletSheetProps> = ({
  isOpen,
  onClose,
  balance,
  onCardDeposit,
  onWithdraw,
}) => {
  const [linkWalletOpen, setLinkWalletOpen] = useState(false);

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Кошелёк"
        size="large"
        zIndex={60}
      >
        <div className="rounded-xl bg-tg-elevated border border-tg-border-subtle p-6 text-center">
          <p className="text-tg-hint text-[13px] font-medium mb-1">Баланс</p>
          <p className="text-[28px] font-semibold text-white tracking-tight">
            {balance.toFixed(2)} <span className="text-[17px] text-tg-hint font-medium">TON</span>
          </p>
          <div className="flex gap-3 mt-6">
            <Button variant="primary" onClick={onCardDeposit} className="flex-1">
              <Plus className="w-4 h-4" /> Пополнить
            </Button>
            <Button variant="secondary" onClick={onWithdraw} className="flex-1">
              <ArrowUp className="w-4 h-4" /> Вывести
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLinkWalletOpen(true)}
          className="w-full mt-4 flex items-center gap-3 p-4 rounded-xl bg-tg-bg border border-tg-border-subtle hover:bg-white/5 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-tg-button/20 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-tg-button" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium text-white">Привязать кошелёк TON</p>
            <p className="text-[13px] text-tg-hint mt-0.5">Подключить внешний кошелёк</p>
          </div>
          <ChevronRight className="w-5 h-5 text-tg-hint flex-shrink-0" />
        </button>
      </BottomSheet>

      {linkWalletOpen && (
        <BottomSheet
          isOpen={linkWalletOpen}
          onClose={() => setLinkWalletOpen(false)}
          title="Привязка кошелька TON"
          size="small"
          zIndex={70}
        >
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="w-14 h-14 rounded-xl bg-tg-button/20 flex items-center justify-center mb-4">
              <Wallet className="w-7 h-7 text-tg-button" />
            </div>
            <p className="text-white font-medium">Скоро</p>
            <p className="text-tg-hint text-[15px] mt-1">
              Возможность привязать кошелёк TON будет доступна в следующих обновлениях.
            </p>
          </div>
        </BottomSheet>
      )}
    </>
  );
};

export default WalletSheet;
