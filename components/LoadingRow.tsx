import React from 'react';

interface LoadingRowProps {
  /** Текст рядом со спиннером */
  text?: string;
  className?: string;
}

/** Строка-плейсхолдер в шитах: мини-спиннер 14px + «Загрузка...», text-secondary 13px */
const LoadingRow: React.FC<LoadingRowProps> = ({ text = 'Загрузка...', className = '' }) => (
  <div
    className={`flex items-center gap-2 text-[13px] text-tg-hint ${className}`}
    role="status"
    aria-live="polite"
  >
    <span className="loading-spinner-inline shrink-0" aria-hidden />
    <span>{text}</span>
  </div>
);

export default LoadingRow;
