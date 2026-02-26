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
      className={`fixed top-0 left-0 right-0 z-50 h-14 px-4 flex items-center justify-between transition-colors ${
        transparent ? 'bg-transparent' : 'bg-tg-bg/90 backdrop-blur-md border-b border-white/5'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {!title ? (
          <span className="font-semibold text-base text-white tracking-tight">Ethos</span>
        ) : (
          <span className="font-semibold text-lg text-white tracking-tight">{title}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenWallet}
        className={`flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors border ${
          transparent
            ? 'bg-white/10 text-white border-white/10 hover:bg-white/15'
            : 'bg-tg-card text-white border-white/5 hover:border-white/10 hover:bg-tg-elevated'
        }`}
      >
        <Gem className="w-3.5 h-3.5 text-tg-button" />
        <span>{typeof balance === 'number' ? balance.toFixed(2) : balance}</span>
      </button>
    </header>
  );
};

export default Header;
