import React from 'react';
import { Gem } from 'lucide-react';

interface HeaderProps {
  balance?: number;
  onOpenWallet: () => void;
  title?: string;
  transparent?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  balance = 0,
  onOpenWallet,
  title,
  transparent = false,
}) => {
  return (
    <header
      className={`sticky top-0 z-[10] h-14 px-4 flex items-center justify-between transition-colors pt-safe-top ${
        transparent
          ? 'bg-transparent'
          : 'border-b border-[var(--border-subtle)]'
      }`}
      style={
        transparent
          ? undefined
          : {
              background: 'rgba(10,10,11,0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }
      }
    >
      <div className="flex items-center gap-2.5">
        {!title ? (
          <span className="font-semibold text-base text-[var(--text-primary)] tracking-tight">Ethos</span>
        ) : (
          <span className="font-semibold text-lg text-[var(--text-primary)] tracking-tight">{title}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenWallet}
        className={`flex items-center gap-2 rounded-[20px] py-1.5 px-3.5 text-[15px] font-semibold transition-colors border ${
          transparent
            ? 'bg-white/10 text-[var(--text-primary)] border-white/10 hover:bg-white/15'
            : 'text-[var(--accent)] border-[rgba(0,145,255,0.2)] hover:border-[rgba(0,145,255,0.3)]'
        }`}
        style={
          transparent
            ? undefined
            : { background: 'rgba(0,145,255,0.1)' }
        }
      >
        <Gem className="w-4 h-4 shrink-0" aria-hidden />
        <span>{typeof balance === 'number' ? balance.toFixed(2) : balance}</span>
      </button>
    </header>
  );
};

export default Header;
