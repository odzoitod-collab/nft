import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  Settings,
  ChevronRight,
  Gift,
  ShoppingBag,
  BarChart3,
  Wallet,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { getUserTransactions, getNftCatalog, getVerificationStatus } from '../services/supabaseClient';
import type { DbTransaction } from '../services/supabaseClient';
import type { DbNftCatalogItem } from '../services/supabaseClient';

interface ProfileViewProps {
  user: User | null;
  telegramUserId?: number;
  onOpenWalletSheet: () => void;
  onOpenSettings: () => void;
}

interface TxItem {
  id: number;
  type: 'buy' | 'sell';
  title: string;
  date: string;
  amount: string;
  nftId: string | null;
  nftTitle: string | null;
  image: string | null;
}

function formatTx(dbTx: DbTransaction, catalogByCode: Map<string, DbNftCatalogItem>): TxItem {
  const date = new Date(dbTx.created_at);
  const dateStr = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const sign = dbTx.type === 'sell' ? '+' : '-';
  const amount = `${sign}${dbTx.amount} TON`;
  const image = dbTx.nft_id ? catalogByCode.get(dbTx.nft_id)?.image ?? null : null;
  return {
    id: dbTx.id,
    type: dbTx.type as 'buy' | 'sell',
    title: dbTx.title,
    date: dateStr,
    amount,
    nftId: dbTx.nft_id ?? null,
    nftTitle: dbTx.nft_title ?? null,
    image,
  };
}

const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  telegramUserId,
  onOpenWalletSheet,
  onOpenSettings,
}) => {
  const [purchases, setPurchases] = useState<TxItem[]>([]);
  const [sales, setSales] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'active' | 'passive' | null>(null);

  useEffect(() => {
    if (!telegramUserId) {
      setPurchases([]);
      setSales([]);
      setVerificationStatus(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [transactions, catalog, verif] = await Promise.all([
          getUserTransactions(telegramUserId),
          getNftCatalog(),
          getVerificationStatus(telegramUserId),
        ]);
        if (cancelled) return;
        setVerificationStatus(verif);
        const catalogByCode = new Map(catalog.map((c) => [c.code, c]));
        const buyItems = transactions
          .filter((t) => t.type === 'buy')
          .map((t) => formatTx(t, catalogByCode));
        const sellItems = transactions
          .filter((t) => t.type === 'sell')
          .map((t) => formatTx(t, catalogByCode));
        setPurchases(buyItems);
        setSales(sellItems);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [telegramUserId]);

  return (
    <div className="pb-24 animate-fade-in min-h-screen bg-tg-bg">
      <div className="pt-14 px-4">
        <div className="flex flex-col items-center pt-6 pb-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 bg-tg-card">
            <img src={user?.avatar} alt="" className="w-full h-full object-cover" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-white tracking-tight">
            {user?.username}
          </h1>
        </div>

        {/* Статус верификации — из Supabase */}
        <div className="mb-6">
          <div className={`rounded-xl border p-4 ${
            verificationStatus === 'active'
              ? 'bg-green-500/10 border-green-500/20'
              : verificationStatus === 'passive'
                ? 'bg-tg-button/10 border-tg-button/20'
                : 'bg-tg-card border-white/5'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                verificationStatus === 'active'
                  ? 'bg-green-500/20 text-green-400'
                  : verificationStatus === 'passive'
                    ? 'bg-tg-button/20 text-tg-button'
                    : 'bg-white/5 text-tg-hint'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {verificationStatus === 'active'
                    ? 'Верификация пройдена (актив)'
                    : verificationStatus === 'passive'
                      ? 'Верификация пройдена (пассив)'
                      : 'Верификация не пройдена'}
                </p>
                <p className="text-xs text-tg-hint mt-0.5">
                  Отображается по данным вашего аккаунта
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
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

        <div className="space-y-3 mb-8">
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

        {/* История покупок и продаж — только из Supabase */}
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-tg-hint uppercase tracking-wide mb-3 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-red-400" />
              Покупки NFT
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8 rounded-xl bg-tg-card border border-white/5">
                <Loader2 className="w-6 h-6 text-tg-button animate-spin" />
              </div>
            ) : !telegramUserId ? (
              <div className="py-6 px-4 rounded-xl bg-tg-card border border-white/5 text-center">
                <p className="text-sm text-tg-hint">Войдите через Telegram, чтобы видеть историю</p>
              </div>
            ) : purchases.length === 0 ? (
              <div className="py-6 px-4 rounded-xl bg-tg-card border border-white/5 text-center">
                <ShoppingBag className="w-8 h-8 text-tg-hint mx-auto mb-2 opacity-60" />
                <p className="text-sm text-tg-hint">Покупок пока нет</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {purchases.map((item) => (
                  <li
                    key={`buy-${item.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-tg-card border border-white/5"
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-tg-elevated border border-white/5 flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-tg-hint">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {item.nftTitle || item.title}
                      </p>
                      <p className="text-xs text-tg-hint">{item.date}</p>
                    </div>
                    <span className="text-sm font-semibold text-white flex-shrink-0">{item.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-tg-hint uppercase tracking-wide mb-3 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
              Продажи NFT
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8 rounded-xl bg-tg-card border border-white/5">
                <Loader2 className="w-6 h-6 text-tg-button animate-spin" />
              </div>
            ) : !telegramUserId ? (
              <div className="py-6 px-4 rounded-xl bg-tg-card border border-white/5 text-center">
                <p className="text-sm text-tg-hint">Войдите через Telegram, чтобы видеть историю</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="py-6 px-4 rounded-xl bg-tg-card border border-white/5 text-center">
                <Gift className="w-8 h-8 text-tg-hint mx-auto mb-2 opacity-60" />
                <p className="text-sm text-tg-hint">Продаж пока нет</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {sales.map((item) => (
                  <li
                    key={`sell-${item.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-tg-card border border-white/5"
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-tg-elevated border border-white/5 flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-tg-hint">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {item.nftTitle || item.title}
                      </p>
                      <p className="text-xs text-tg-hint">{item.date}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-400 flex-shrink-0">{item.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
