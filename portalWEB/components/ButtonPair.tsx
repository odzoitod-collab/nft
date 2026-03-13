import React from 'react';
import Button from './Button';

export interface ButtonPairProps {
  /** Кнопка «Назад» / отмена */
  backLabel: React.ReactNode;
  onBack: () => void;
  /** Кнопка подтверждения / основное действие */
  confirmLabel: React.ReactNode;
  onConfirm: () => void;
  /** primary | destructive — только для необратимых действий */
  confirmVariant?: 'primary' | 'destructive';
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  className?: string;
}

/**
 * Пара кнопок внизу шита/экрана: Назад (Secondary flex:1) + Подтвердить (Primary flex:2).
 * gap 12px, padding-bottom max(24px, safe-area).
 */
const ButtonPair: React.FC<ButtonPairProps> = ({
  backLabel,
  onBack,
  confirmLabel,
  onConfirm,
  confirmVariant = 'primary',
  confirmDisabled = false,
  confirmLoading = false,
  className = '',
}) => (
  <div
    className={`flex flex-row gap-3 pb-[max(24px,env(safe-area-inset-bottom))] ${className}`}
  >
    <Button variant="secondary" flexRatio={1} onClick={onBack}>
      {backLabel}
    </Button>
    <Button
      variant={confirmVariant}
      flexRatio={2}
      onClick={onConfirm}
      disabled={confirmDisabled}
      isLoading={confirmLoading}
    >
      {confirmLabel}
    </Button>
  </div>
);

export default ButtonPair;
