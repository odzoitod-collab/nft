import React from 'react';
import Button from './Button';

export interface EmptyStateProps {
  /** Иконка (React node, например Lucide icon) */
  icon: React.ReactNode;
  /** Заголовок */
  title: string;
  /** Подзаголовок */
  subtitle?: string;
  /** Текст кнопки — если не задан, кнопка не показывается */
  ctaLabel?: string;
  /** Обработчик кнопки */
  onCtaClick?: () => void;
  className?: string;
}

/**
 * Пустое состояние: flex column center, gap 12px, padding 48px 24px.
 * Иконка 48px tertiary 0.5, заголовок 17px semibold secondary, подзаголовок 15px tertiary.
 * CTA — Secondary, margin-top 8px.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  ctaLabel,
  onCtaClick,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center gap-3 py-12 px-6 ${className}`}
  >
    <div className="w-12 h-12 flex items-center justify-center text-tg-tertiary opacity-50" aria-hidden>
      {icon}
    </div>
    <p className="text-[17px] font-semibold text-tg-hint text-center">
      {title}
    </p>
    {subtitle && (
      <p className="text-[15px] text-tg-tertiary text-center max-w-[280px]">
        {subtitle}
      </p>
    )}
    {ctaLabel && onCtaClick && (
      <Button variant="secondary" onClick={onCtaClick} className="mt-2 w-auto">
        {ctaLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;
