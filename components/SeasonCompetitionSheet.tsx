import React from 'react';
import { X, Trophy, TrendingUp, Users, Zap, Award, Crown, Gem } from 'lucide-react';

const MIN_BALANCE = 10_000;

interface SeasonCompetitionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
  minBalanceRequired: number;
  onOpenWallet: () => void;
}

const SeasonCompetitionSheet: React.FC<SeasonCompetitionSheetProps> = ({
  isOpen,
  onClose,
  userBalance,
  minBalanceRequired,
  onOpenWallet,
}) => {
  const canJoin = userBalance >= minBalanceRequired;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm sheet-backdrop" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-tg-card rounded-t-xl border-t border-white/5 shadow-2xl sheet-panel">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-tg-card z-10">
          <h2 className="text-lg font-semibold text-white">Условия участия</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-tg-hint hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6 pb-8">
          <div className="rounded-xl bg-tg-bg border border-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-tg-button" />
              Требование для участия
            </h3>
            <div className="flex items-center justify-between py-2">
              <span className="text-tg-hint text-sm">Минимальный баланс</span>
              <span className="text-white font-semibold">{minBalanceRequired.toLocaleString()} TON</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-tg-hint text-sm">Ваш баланс</span>
              <span className={canJoin ? 'text-green-400 font-semibold' : 'text-white font-semibold'}>
                {userBalance.toLocaleString()} TON
              </span>
            </div>
            {!canJoin && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenWallet(); }}
                className="w-full mt-4 h-10 rounded-xl bg-tg-button text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90"
              >
                <Gem className="w-4 h-4" /> Пополнить баланс
              </button>
            )}
          </div>

          <div className="rounded-xl bg-tg-bg border border-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-tg-button" />
              Призы
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-tg-button/20 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-4 h-4 text-tg-button" />
                </div>
                <div>
                  <span className="font-medium text-white">1 место</span>
                  <span className="text-tg-hint block text-xs">Legendary NFT + 10 000 TON</span>
                </div>
              </li>
              <li className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-4 h-4 text-tg-hint" />
                </div>
                <div>
                  <span className="font-medium text-white">2 место</span>
                  <span className="text-tg-hint block text-xs">Epic NFT + 5 000 TON</span>
                </div>
              </li>
              <li className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-4 h-4 text-tg-hint" />
                </div>
                <div>
                  <span className="font-medium text-white">3 место</span>
                  <span className="text-tg-hint block text-xs">Rare NFT + 2 500 TON</span>
                </div>
              </li>
              <li className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 text-tg-hint text-xs font-bold">
                  4–10
                </div>
                <div>
                  <span className="font-medium text-white">4–10 места</span>
                  <span className="text-tg-hint block text-xs">NFT + 500 TON</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-tg-bg border border-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-tg-button" />
              Как участвовать
            </h3>
            <ol className="space-y-3 text-sm text-tg-hint">
              <li className="flex gap-2">
                <span className="text-white font-medium w-5">1.</span>
                Баланс от 10 000 TON — необходимое условие для входа в конкурс.
              </li>
              <li className="flex gap-2">
                <span className="text-white font-medium w-5">2.</span>
                Покупай и продавай NFT на маркете: за сделку начисляются очки.
              </li>
              <li className="flex gap-2">
                <span className="text-white font-medium w-5">3.</span>
                Поднимайся в рейтинге — топ-10 в конце сезона получают NFT и TON.
              </li>
            </ol>
          </div>

          <div className="rounded-xl bg-tg-bg border border-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-tg-button" />
              Топ участников
            </h3>
            <div className="space-y-2">
              {[
                { rank: 1, name: 'CryptoKing', points: 2450, trend: '+125' },
                { rank: 2, name: 'NFTMaster', points: 2180, trend: '+98' },
                { rank: 3, name: 'TradeWizard', points: 1950, trend: '+76' },
              ].map(({ rank, name, points, trend }) => (
                <div
                  key={rank}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/5 border border-white/5"
                >
                  <span className="w-6 h-6 rounded-full bg-tg-button/20 flex items-center justify-center text-tg-button text-xs font-bold">
                    {rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{name}</p>
                    <p className="text-tg-hint text-xs">{points.toLocaleString()} очков</p>
                  </div>
                  <span className="text-green-400 text-xs font-medium flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> {trend}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {canJoin ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-xl bg-tg-button text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Trophy className="w-5 h-5" /> Начать участие
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onClose(); onOpenWallet(); }}
              className="w-full h-12 rounded-xl bg-tg-card border border-white/5 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/5"
            >
              <Gem className="w-5 h-5 text-tg-button" /> Пополнить баланс
            </button>
          )}

          <p className="text-center text-tg-hint text-xs">Сезон завершается через 12 дней</p>
        </div>
      </div>
    </div>
  );
};

export default SeasonCompetitionSheet;
