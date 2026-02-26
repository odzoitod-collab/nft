import React, { useState } from 'react';
import { Sparkles, Trophy, Zap, ArrowRight, Clock, Gem } from 'lucide-react';
import Header from './Header';
import SeasonCompetitionSheet from './SeasonCompetitionSheet';

const MIN_BALANCE_TO_JOIN = 10_000;

interface SeasonViewProps {
  userBalance: number;
  onOpenWallet: () => void;
}

const SeasonView: React.FC<SeasonViewProps> = ({ userBalance, onOpenWallet }) => {
  const [isCompetitionOpen, setIsCompetitionOpen] = useState(false);
  const canJoin = userBalance >= MIN_BALANCE_TO_JOIN;

  const handleParticipateClick = () => {
    if (canJoin) setIsCompetitionOpen(true);
    else onOpenWallet();
  };

  return (
    <div className="pb-24 animate-fade-in bg-tg-bg min-h-screen">
      <Header balance={userBalance} onOpenWallet={onOpenWallet} />

      <div className="pt-14 px-4">
        <div className="rounded-xl bg-tg-card border border-white/5 overflow-hidden">
          <div className="p-6 bg-tg-elevated/50 border-b border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-tg-button/20 text-tg-button text-[10px] font-semibold uppercase tracking-wide">
                Season II
              </span>
              <span className="text-tg-hint text-xs">Live</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Сезонный конкурс</h1>
            <p className="text-sm text-tg-hint mt-1">
              Торгуй NFT, набирай очки и выигрывай эксклюзивные призы.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-tg-bg border border-white/5 p-4 text-center">
                <Trophy className="w-5 h-5 text-tg-button mx-auto mb-1.5" />
                <p className="text-lg font-semibold text-white">50K TON</p>
                <p className="text-[10px] text-tg-hint uppercase tracking-wide">Призовой фонд</p>
              </div>
              <div className="rounded-xl bg-tg-bg border border-white/5 p-4 text-center">
                <Zap className="w-5 h-5 text-tg-button mx-auto mb-1.5" />
                <p className="text-lg font-semibold text-white">12 405</p>
                <p className="text-[10px] text-tg-hint uppercase tracking-wide">Участников</p>
              </div>
            </div>

            <div className="rounded-xl bg-tg-bg border border-white/5 p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/5 flex-shrink-0 bg-tg-elevated">
                <img src="/images/40.png" alt="Приз" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-tg-hint text-xs font-medium uppercase tracking-wide">Главный приз</p>
                <p className="text-white font-semibold">Legendary NFT + 10 000 TON</p>
                <p className="text-tg-hint text-xs mt-0.5">Победитель получает эксклюзивный NFT и TON</p>
              </div>
            </div>

            {!canJoin && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                <p className="text-amber-200 text-sm font-medium">
                  Для участия нужен баланс от <span className="font-bold text-white">10 000 TON</span>.
                </p>
                <p className="text-tg-hint text-xs mt-1">Пополните кошелёк, чтобы участвовать в сезоне.</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleParticipateClick}
              className={`w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                canJoin
                  ? 'bg-tg-button text-white hover:opacity-90'
                  : 'bg-tg-card border border-white/5 text-white hover:bg-white/5'
              }`}
            >
              {canJoin ? (
                <>
                  Участвовать <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  <Gem className="w-5 h-5 text-tg-button" /> Пополнить для участия
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-tg-hint text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Осталось 12 дней</span>
            </div>
          </div>
        </div>
      </div>

      <SeasonCompetitionSheet
        isOpen={isCompetitionOpen}
        onClose={() => setIsCompetitionOpen(false)}
        userBalance={userBalance}
        minBalanceRequired={MIN_BALANCE_TO_JOIN}
        onOpenWallet={onOpenWallet}
      />
    </div>
  );
};

export default SeasonView;
