import React from 'react';
import { User } from '../types';
import { Settings, ChevronRight, Gift, ShoppingBag, BarChart3, Wallet, ShieldCheck } from 'lucide-react';

interface ProfileViewProps {
  user: User | null;
  onOpenWalletSheet: () => void;
  onOpenSettings: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onOpenWalletSheet,
  onOpenSettings,
}) => {
  return (
    <div className="pb-24 animate-fade-in min-h-screen bg-tg-bg">
      <div className="pt-14 px-4">
        <div className="flex flex-col items-center pt-6 pb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 bg-tg-card">
            <img src={user?.avatar} alt="" className="w-full h-full object-cover" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-white tracking-tight">
            {user?.username}
          </h1>
          <p className="mt-1 text-xs text-tg-hint flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Верификация: {user?.verificationStatus === 'active' ? 'Актив' : user?.verificationStatus === 'passive' ? 'Пассив' : 'Нет'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-8">
          <StatCard
            label="Объём"
            value={`${user?.totalVolume ?? 0} TON`}
            icon={<BarChart3 className="w-4 h-4 text-tg-button" />}
          />
          <StatCard
            label="Куплено"
            value={String(user?.bought ?? 0)}
            icon={<Gift className="w-4 h-4 text-tg-button" />}
          />
          <StatCard
            label="Продано"
            value={String(user?.sold ?? 0)}
            icon={<ShoppingBag className="w-4 h-4 text-tg-button" />}
          />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onOpenWalletSheet}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-tg-card border border-white/5 hover:bg-tg-elevated transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-tg-button/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-tg-button" />
              </div>
              <span className="font-medium text-white">Кошелёк</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-tg-button">{user?.balance ?? 0} TON</span>
              <ChevronRight className="w-5 h-5 text-tg-hint" />
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-tg-card border border-white/5 hover:bg-tg-elevated transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <Settings className="w-4 h-4 text-tg-hint" />
              </div>
              <span className="font-medium text-white">Настройки</span>
            </div>
            <ChevronRight className="w-5 h-5 text-tg-hint" />
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-tg-hint">Ethos Gallery · TON</p>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="rounded-xl p-3 bg-tg-card border border-white/5 flex flex-col items-center justify-center">
    <div className="mb-1.5 p-1.5 rounded-lg bg-white/5">{icon}</div>
    <span className="text-sm font-semibold text-white">{value}</span>
    <span className="text-[10px] text-tg-hint font-medium mt-0.5">{label}</span>
  </div>
);

export default ProfileView;
