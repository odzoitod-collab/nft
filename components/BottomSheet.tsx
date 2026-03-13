import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';

const SHEET_CLOSE_MS = 250;

export type BottomSheetSize = 'small' | 'medium' | 'large' | 'auto';

const SIZE_CLASS: Record<BottomSheetSize, string> = {
  small: 'max-h-[40vh]',
  medium: 'h-[65vh]',
  large: 'h-[85vh]',
  auto: 'max-h-[90vh]',
};

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Заголовок хедера */
  title: React.ReactNode;
  /** Размер: small 40vh, medium 65vh, large 85vh, auto 90vh */
  size?: BottomSheetSize;
  /** Контент между хедером и футером */
  children: React.ReactNode;
  /** Футер с кнопками — sticky к низу */
  footer?: React.ReactNode;
  /** Дополнительные элементы в хедере слева от кнопки закрытия (например, Назад) */
  headerLeft?: React.ReactNode;
  /** z-index контейнера шита (backdrop на -10) */
  zIndex?: number;
}

/**
 * Единый стандарт bottom sheet:
 * Backdrop 200ms, blur 4px, клик закрывает.
 * Контейнер max-w 448px, rounded-t-xl, анимация 380ms.
 * Хэндл, хедер с заголовком и кнопкой закрытия, контент, sticky футер.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  size = 'large',
  children,
  footer,
  headerLeft,
  zIndex = 50,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, SHEET_CLOSE_MS);
  }, [onClose, isClosing]);

  useEffect(() => {
    if (!isOpen) setIsClosing(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const backdropZ = zIndex - 10;
  const panelZ = zIndex;

  return (
    <>
      {/* 1. BACKDROP */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[4px] sheet-backdrop"
        style={{ zIndex: backdropZ }}
        onClick={requestClose}
        onKeyDown={(e) => e.key === 'Escape' && requestClose()}
        role="button"
        tabIndex={-1}
        aria-label="Закрыть"
      />

      {/* 2. КОНТЕЙНЕР ШИТА — при закрытии slideDown 250ms, затем onClose */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[448px]
          bg-tg-card rounded-t-[20px] border-t border-tg-border-subtle
          flex flex-col overflow-hidden
          sheet-panel
          ${isClosing ? 'sheet-panel--closing' : ''}
          ${SIZE_CLASS[size]}
        `}
        style={{ zIndex: panelZ }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
      >
        {/* 3. ХЭНДЛ */}
        <div className="flex justify-center pt-3 flex-shrink-0">
          <div
            className="w-9 h-1 rounded-[2px] bg-[var(--border-default)]"
            aria-hidden
          />
        </div>

        {/* 4. ХЕДЕР */}
        <div className="flex items-center justify-between px-5 pt-0 pb-4 border-b border-tg-border-subtle flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {headerLeft}
            <h2 id="bottom-sheet-title" className="text-[20px] font-bold text-white truncate">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0 text-tg-hint hover:bg-white/[0.12] transition-colors duration-[150ms]"
            aria-label="Закрыть"
          >
            <X className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>

        {/* 5. КОНТЕНТ */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {/* 6. FOOTER — sticky к низу */}
        {footer != null && (
          <div
            className="sticky bottom-0 left-0 right-0 px-5 pt-4 border-t border-tg-border-subtle bg-tg-card flex-shrink-0"
            style={{ paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 16px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
};

export default BottomSheet;
