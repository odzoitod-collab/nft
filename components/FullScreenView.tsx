import React, { useState, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';

const EXIT_DURATION_MS = 250;

export interface FullScreenViewProps {
  /** Вызывается после завершения анимации выхода */
  onBack: () => void;
  /** Опциональный баланс TON — показывается pill справа в хедере */
  balance?: number;
  /** При клике на pill баланса (например, открыть кошелёк) */
  onBalanceClick?: () => void;
  /** Контент (скроллится между хедером и футером) */
  children: React.ReactNode;
  /** Кнопки действий — sticky к низу */
  footer?: React.ReactNode;
  /** Дополнительный контент слева от кнопки «Назад» (редко) */
  headerLeft?: React.ReactNode;
}

/**
 * Full-screen экран: контейнер с анимацией входа/выхода,
 * sticky хедер (Назад слева + опционально баланс справа),
 * контент, sticky футер.
 * z-index 60 (выше bottom sheet).
 */
const FullScreenView: React.FC<FullScreenViewProps> = ({
  onBack,
  balance,
  onBalanceClick,
  children,
  footer,
  headerLeft,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleBack = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onBack(), EXIT_DURATION_MS);
  }, [onBack]);

  return (
    <div
      className={`fixed inset-0 z-[60] bg-tg-bg overflow-y-auto fullscreen-view ${isExiting ? 'fullscreen-view--exiting' : ''}`}
      role="dialog"
      aria-modal="true"
    >
      {/* Sticky хедер */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b border-tg-border-subtle"
        style={{
          paddingTop: 'max(0px, env(safe-area-inset-top))',
          background: 'rgba(10,10,11,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {headerLeft}
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-sm)] bg-white/[0.08] text-white hover:bg-white/[0.12] active:scale-[0.96] transition-[background-color,transform]"
            aria-label="Назад"
          >
            <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2.5} />
            <span className="text-[15px] font-medium">Назад</span>
          </button>
        </div>

        {balance !== undefined && (
          onBalanceClick ? (
            <button
              type="button"
              onClick={onBalanceClick}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-full border shrink-0 hover:opacity-90 active:scale-[0.98] transition-opacity"
              style={{
                background: 'rgba(0,145,255,0.15)',
                borderColor: 'rgba(0,145,255,0.3)',
              }}
            >
              <span className="text-[15px] font-semibold text-tg-button">
                {balance.toFixed(2)} TON
              </span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-full border shrink-0"
              style={{
                background: 'rgba(0,145,255,0.15)',
                borderColor: 'rgba(0,145,255,0.3)',
              }}
            >
              <span className="text-[15px] font-semibold text-tg-button">
                {balance.toFixed(2)} TON
              </span>
            </div>
          )
        )}
      </header>

      {/* Контент */}
      <main className="min-h-0 flex-1">
        {children}
      </main>

      {/* Sticky футер */}
      {footer != null && (
        <footer
          className="sticky bottom-0 left-0 right-0 z-10 p-4 border-t border-tg-border-subtle"
          style={{
            paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 16px))',
            background: 'rgba(10,10,11,0.9)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
};

export default FullScreenView;
