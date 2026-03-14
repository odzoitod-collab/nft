import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled, 'aria-label': ariaLabel }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative w-[51px] h-[31px] rounded-[16px] border-0 shrink-0 transition-colors duration-200 disabled:opacity-50"
      style={{
        background: checked ? 'var(--accent)' : 'var(--border-default)',
        transitionTimingFunction: 'var(--ease-spring)',
      }}
    >
      <span
        className="absolute top-1/2 -translate-y-1/2 w-[27px] h-[27px] rounded-full bg-[var(--text-primary)] transition-transform duration-200"
        style={{
          left: checked ? '22px' : '2px',
          transitionTimingFunction: 'var(--ease-spring)',
        }}
      />
    </button>
  );
};

export default Toggle;
