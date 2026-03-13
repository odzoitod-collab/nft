import React from 'react';
import { haptic } from '../services/telegramWebApp';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  /** Для пар: flex-1 у Secondary, flex-2 у Primary/Destructive */
  flexRatio?: 1 | 2;
  className?: string;
  children: React.ReactNode;
}

const HEIGHT = 'h-[52px]';
const RADIUS = 'rounded-md'; // var(--radius-md) 12px
const TRANSITION = 'btn-transition transition-colors duration-[150ms]';

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={`animate-spin-slow shrink-0 ${className ?? ''}`}
    aria-hidden
  />
);

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  flexRatio,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  const base = `${TRANSITION} active:scale-[0.97] flex items-center justify-center gap-2 font-semibold text-[17px] disabled:cursor-not-allowed disabled:active:scale-100 ${isLoading ? 'opacity-100' : 'disabled:opacity-45'} ${RADIUS} ${flexRatio === 1 ? 'flex-1' : ''} ${flexRatio === 2 ? 'flex-[2]' : ''} ${className}`;

  const variants: Record<ButtonVariant, string> = {
    primary:
      `${HEIGHT} bg-tg-button text-white hover:bg-tg-button-hover disabled:hover:bg-tg-button`,
    secondary:
      `${HEIGHT} bg-transparent border border-tg-border-default text-tg-text hover:bg-white/5`,
    destructive:
      `${HEIGHT} bg-tg-danger text-white hover:opacity-90 disabled:opacity-45 disabled:hover:opacity-45`,
    ghost:
      'h-auto py-2 px-2 text-[15px] font-medium text-tg-button hover:opacity-75 bg-transparent border-0',
  };

  const variantStyles = variants[variant];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    haptic.light();
    props.onClick?.(e);
  };

  return (
    <button
      type="button"
      className={`${base} ${variantStyles}`}
      disabled={isDisabled}
      {...props}
      onClick={handleClick}
    >
      {isLoading && variant !== 'ghost' ? (
        <>
          <Spinner className="text-white" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
