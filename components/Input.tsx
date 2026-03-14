import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  /** Суффикс справа (например «TON») */
  suffix?: string;
  className?: string;
}

const Input: React.FC<InputProps> = ({ suffix, className = '', ...props }) => {
  const base =
    'h-[52px] w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-4 ' +
    'text-[17px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] ' +
    'outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(0,145,255,0.15)] ' +
    'transition-[border-color,box-shadow] duration-150';

  if (suffix) {
    return (
      <div className={`relative ${className}`}>
        <input
          {...props}
          className={`${base} pr-24`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-[17px] pointer-events-none">
          {suffix}
        </span>
      </div>
    );
  }

  return <input {...props} className={`${base} ${className}`} />;
};

export default Input;
