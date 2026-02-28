import React from 'react';
import { Store, Briefcase, Sparkles, User as UserIcon } from 'lucide-react';
import { ViewState } from '../types';

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
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-tg-card/95 backdrop-blur-md border-t border-white/5 pb-safe z-50">
      <div className="flex items-center justify-around h-full max-w-md mx-auto px-2">
        {items.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 transition-colors ${
                isActive ? 'text-tg-button' : 'text-tg-hint'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
