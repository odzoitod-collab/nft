import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { haptic } from '../services/telegramWebApp';

const TOAST_DURATION_MS = 3500;
const TOAST_EXIT_MS = 250;

export interface ErrorToastProps {
  /** Показывать тост */
  isVisible: boolean;
  /** Текст ошибки */
  message: string;
  /** Вызов при скрытии (после автоскрытия или по клику) */
  onHide: () => void;
}

/**
 * Тост ошибки: fixed bottom 96px (над навбаром), left/right 16px.
 * bg danger/15, border danger/30, radius md, padding 12 16.
 * Иконка ! + текст. Автоскрытие 3500ms, анимация выезда вниз.
 */
const ErrorToast: React.FC<ErrorToastProps> = ({ isVisible, message, onHide }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!isVisible || !message) return;
    haptic.error();
    const t1 = setTimeout(() => {
      setIsExiting(true);
    }, TOAST_DURATION_MS);
    const t2 = setTimeout(onHide, TOAST_DURATION_MS + TOAST_EXIT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isVisible, message, onHide]);

  if (!isVisible || !message) return null;

  return (
    <div
      className={`fixed left-4 right-4 z-[30] flex items-center gap-3 rounded-md border px-4 py-3 shadow-lg error-toast ${isExiting ? 'error-toast--exiting' : ''}`}
      style={{
        bottom: 96,
        background: 'rgba(255,59,48,0.15)',
        borderColor: 'rgba(255,59,48,0.3)',
      }}
      role="alert"
    >
      <AlertCircle className="w-5 h-5 shrink-0 text-tg-danger" aria-hidden />
      <p className="text-[15px] font-medium text-white flex-1">{message}</p>
    </div>
  );
};

export default ErrorToast;
