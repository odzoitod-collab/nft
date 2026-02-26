import React, { useState } from 'react';
import { X, ArrowUp, Plus, Wallet, ChevronRight } from 'lucide-react';

interface WalletSheetProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onDeposit: () => void;
  onCardDeposit: () => void;
  onWithdraw: () => void;
}

const WalletSheet: React.FC<WalletSheetProps> = ({ isOpen, onClose, balance, onDeposit, onCardDeposit, onWithdraw }) => {
  const [linkWalletOpen, setLinkWalletOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm sheet-backdrop" onClick={onClose} aria-hidden />

      <div className="bg-tg-card w-full rounded-t-xl max-w-md mx-auto relative overflow-hidden h-[85vh] flex flex-col border-t border-white/5 shadow-2xl sheet-panel">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-tg-hint">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium">TON</span>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-tg-hint hover:text-white hover:bg-white/5 transition-colors" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 min-h-0 overflow-y-auto">
          <div className="rounded-xl bg-tg-elevated border border-white/5 p-6 text-center">
            <p className="text-tg-hint text-xs font-medium mb-1">Баланс</p>
            <p className="text-3xl font-semibold text-white tracking-tight">
              {balance.toFixed(2)} <span className="text-lg text-tg-hint font-medium">TON</span>
            </p>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={onCardDeposit}
                className="flex-1 h-11 rounded-lg bg-tg-button text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" /> Пополнить
              </button>
              <button
                type="button"
                onClick={onWithdraw}
                className="flex-1 h-11 rounded-lg bg-tg-card text-white text-sm font-medium flex items-center justify-center gap-2 border border-white/5 hover:bg-white/5 transition-colors"
              >
                <ArrowUp className="w-4 h-4" /> Вывести
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLinkWalletOpen(true)}
            className="w-full mt-4 flex items-center gap-3 p-4 rounded-xl bg-tg-bg border border-white/5 hover:bg-white/5 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-tg-button/20 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-tg-button" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Привязать кошелёк TON</p>
              <p className="text-xs text-tg-hint mt-0.5">Подключить внешний кошелёк</p>
            </div>
            <ChevronRight className="w-5 h-5 text-tg-hint flex-shrink-0" />
          </button>
        </div>
      </div>

      {linkWalletOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm sheet-backdrop" onClick={() => setLinkWalletOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md max-h-[85vh] bg-tg-card rounded-t-xl border-t border-white/5 shadow-2xl flex flex-col sheet-panel">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Привязка кошелька TON</h2>
              <button
                type="button"
                onClick={() => setLinkWalletOpen(false)}
                className="p-2 rounded-lg text-tg-hint hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
              <div className="w-14 h-14 rounded-xl bg-tg-button/20 flex items-center justify-center mb-4">
                <Wallet className="w-7 h-7 text-tg-button" />
              </div>
              <p className="text-white font-medium">Скоро</p>
              <p className="text-tg-hint text-sm mt-1">Возможность привязать кошелёк TON будет доступна в следующих обновлениях.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSheet;