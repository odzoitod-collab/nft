import React from 'react';
import { Store, Briefcase, Sparkles, User as UserIcon } from 'lucide-react';
import { ViewState } from '../types';
import { haptic } from '../services/telegramWebApp';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const items = [
    { id: ViewState.STORE, label: 'Маркет', icon: Store },
    { id: ViewState.PORTFOLIO, label: 'Портфель', icon: Briefcase },
    { id: ViewState.SEASON, label: 'Сезон', icon: Sparkles },
    { id: ViewState.PROFILE, label: 'Профиль', icon: UserIcon },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[20] h-14 border-t border-[var(--border-subtle)] pb-safe max-w-md mx-auto w-full"
      style={{
        background: 'rgba(10,10,11,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-stretch h-full">
        {items.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                haptic.selection();
                setView(item.id);
              }}
              className={`flex flex-col items-center justify-center gap-[3px] flex-1 min-w-0 py-2 cursor-pointer transition-transform duration-200 ${
                isActive ? 'text-[var(--accent)] scale-105' : 'text-[var(--text-tertiary)]'
              }`}
              style={{
                transitionTimingFunction: 'var(--ease-spring)',
              }}
            >
              <Icon
                className="w-[22px] h-[22px] shrink-0"
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
