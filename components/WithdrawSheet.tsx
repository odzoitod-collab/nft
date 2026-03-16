import React, { useState, useEffect } from 'react';
import { CreditCard, Globe, AlertTriangle } from 'lucide-react';
import ButtonPair from './ButtonPair';
import BottomSheet from './BottomSheet';
import LoadingRow from './LoadingRow';
import { getAllSettings, getEffectiveMinWithdrawTon, logAction } from '../services/supabaseClient';
import { getTonRates, tonToFiat, type CurrencyCode } from '../services/tonRates';

interface WithdrawSheetProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  telegramUserId?: number;
}

type WithdrawMethod = 'bank_rf' | 'crypto' | null;
type Step = 'method' | 'amount' | 'requisites';

const WithdrawSheet: React.FC<WithdrawSheetProps> = ({ isOpen, onClose, balance, onError, onSuccess, telegramUserId }) => {
  const [step, setStep] = useState<Step>('method');
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>(null);
  const [amount, setAmount] = useState('');
  const [rates, setRates] = useState<Partial<Record<CurrencyCode, number>>>({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [minWithdrawTon, setMinWithdrawTon] = useState(1);
  const rateRub = rates.RUB ?? 0;

  useEffect(() => {
    if (!isOpen) return;
    setStep('method');
    setWithdrawMethod(null);
    setAmount('');
    setAccountNumber('');
    setCryptoAddress('');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === 'amount') {
      if (telegramUserId != null) {
        getEffectiveMinWithdrawTon(telegramUserId).then(setMinWithdrawTon);
      } else {
        getAllSettings().then((s) => {
          const v = parseFloat(s.min_withdraw_ton || '');
          setMinWithdrawTon(Number.isNaN(v) || v < 0 ? 1 : v);
        });
      }
    }
  }, [isOpen, step, telegramUserId]);

  useEffect(() => {
    if (isOpen && step !== 'method') {
      loadRates();
    }
  }, [isOpen, step]);

  const loadRates = async () => {
    setRatesLoading(true);
    try {
      const r = await getTonRates();
      setRates(r.prices);
    } catch (e) {
      console.error('Failed to load TON rates:', e);
    } finally {
      setRatesLoading(false);
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const rate = rateRub;
  const fiatAmount = rate > 0 ? tonToFiat(amountNum, rate) : 0;

  const canGoToRequisites =
    amountNum >= minWithdrawTon && amountNum <= balance && !isNaN(amountNum);

  const handleSelectMethod = (m: WithdrawMethod) => {
    setWithdrawMethod(m);
    setAmount('');
    setStep('amount');
  };

  const handleNextToRequisites = () => {
    if (!canGoToRequisites) return;
    setStep('requisites');
  };

  const handleWithdraw = () => {
    if (withdrawMethod === 'bank_rf') {
      const digits = accountNumber.replace(/\s/g, '').replace(/-/g, '');
      if (!digits || digits.length < 8) {
        onError?.('Введите корректные реквизиты для получения');
        return;
      }
      logAction('withdraw_request', {
        userId: telegramUserId ?? undefined,
        tgid: telegramUserId != null ? String(telegramUserId) : undefined,
        payload: { amount: amountNum, method: 'bank_rf' },
      });
      onSuccess?.('Заявка на вывод принята');
    } else {
      const addr = (cryptoAddress || '').trim();
      if (!addr || addr.length < 10) {
        onError?.('Введите адрес кошелька (USDT в сети TON)');
        return;
      }
      logAction('withdraw_request', {
        userId: telegramUserId ?? undefined,
        tgid: telegramUserId != null ? String(telegramUserId) : undefined,
        payload: { amount: amountNum, method: 'crypto' },
      });
      onSuccess?.('Заявка на вывод принята');
    }
    handleClose();
  };

  const handleClose = () => {
    setStep('method');
    setWithdrawMethod(null);
    setAmount('');
    setAccountNumber('');
    setCryptoAddress('');
    onClose();
  };

  if (!isOpen) return null;

  const titleByStep: Record<Step, string> = {
    method: 'Куда вывести',
    amount: 'Сумма вывода',
    requisites: withdrawMethod === 'bank_rf' ? 'Реквизиты для получения (РФ)' : 'Адрес для получения (USDT TON)',
  };

  const renderFooter = () => {
    if (step === 'amount' && withdrawMethod) {
      return (
        <div className="pt-2">
          <ButtonPair
            backLabel="Назад"
            onBack={() => { setStep('method'); setWithdrawMethod(null); setAmount(''); }}
            confirmLabel="Далее"
            onConfirm={handleNextToRequisites}
            confirmDisabled={!canGoToRequisites || ratesLoading}
          />
        </div>
      );
    }
    if (step === 'requisites' && withdrawMethod) {
      return (
        <ButtonPair
          backLabel="Назад"
          onBack={() => setStep('amount')}
          confirmLabel="Вывести"
          onConfirm={handleWithdraw}
          confirmDisabled={
            withdrawMethod === 'bank_rf'
              ? accountNumber.replace(/\s/g, '').length < 8
              : !cryptoAddress || cryptoAddress.length < 10
          }
        />
      );
    }
    return null;
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={titleByStep[step]}
        size="auto"
        zIndex={50}
        footer={renderFooter()}
      >
        {step === 'method' && (
          <div className="space-y-2">
            <p className="text-[15px] text-tg-hint mb-3">Выберите способ вывода. Мин. сумма задаётся в админ-панели бота и подтягивается из базы.</p>
            <button
              type="button"
              onClick={() => handleSelectMethod('bank_rf')}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-tg-bg border border-tg-border-subtle hover:border-tg-border-default text-left transition-colors"
            >
              <CreditCard className="w-5 h-5 text-tg-button" />
              <span className="font-medium text-white">На реквизиты банка (РФ)</span>
              <span className="text-tg-hint text-[15px] ml-auto">Карта / счёт</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMethod('crypto')}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-tg-bg border border-tg-border-subtle hover:border-tg-border-default text-left transition-colors"
            >
              <Globe className="w-5 h-5 text-emerald-400" />
              <span className="font-medium text-white">На крипту (USDT в сети TON)</span>
              <span className="text-tg-hint text-[15px] ml-auto">Адрес кошелька</span>
            </button>
          </div>
        )}

        {step === 'amount' && withdrawMethod && (
          <div className="space-y-4">
              <div className="rounded-xl bg-tg-bg border border-white/5 p-4">
                <p className="text-tg-hint text-xs mb-1">Доступно</p>
                <p className="text-xl font-semibold text-white">{balance.toFixed(2)} TON</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-tg-hint mb-2">Сумма (TON)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-hint pointer-events-none" />
                  <input
                    type="number"
                    step="0.1"
                    min={minWithdrawTon}
                    max={balance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full h-12 pl-10 pr-3 rounded-xl bg-tg-bg border border-white/5 text-white placeholder-tg-hint outline-none focus:border-tg-button text-lg font-medium"
                  />
                </div>
                <div className="flex justify-between text-xs text-tg-hint mt-2">
                  <span>Мин: {minWithdrawTon} TON</span>
                  <span>Макс: {balance.toFixed(2)} TON</span>
                </div>
                {ratesLoading && amountNum >= minWithdrawTon && (
                  <LoadingRow text="Загрузка курса..." className="mt-2" />
                )}
                {!ratesLoading && rate > 0 && amountNum >= minWithdrawTon && (
                  <p className="text-sm text-tg-button font-medium mt-2">
                    ≈ {fiatAmount.toFixed(0)} ₽
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {[1, 5, 10, balance].filter((v) => v <= balance && v >= minWithdrawTon).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v === balance ? balance.toFixed(2) : String(v))}
                    className="flex-1 py-2 rounded-lg bg-tg-bg border border-tg-border-subtle text-[15px] font-medium text-white hover:bg-white/5"
                  >
                    {v === balance ? 'Всё' : `${v} TON`}
                  </button>
                ))}
              </div>
            </div>
          )}

        {step === 'requisites' && withdrawMethod && (
            <div className="space-y-4">
              <div className="rounded-xl bg-tg-button/10 border border-tg-button/20 p-4 text-center">
                <p className="text-tg-hint text-sm mb-1">К выводу</p>
                <p className="text-2xl font-semibold text-white">{amountNum} TON</p>
                {rate > 0 && <p className="text-sm text-tg-hint mt-1">≈ {fiatAmount.toFixed(0)} ₽</p>}
              </div>

              {withdrawMethod === 'bank_rf' && (
                <>
                  <div className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200">
                      Вывод на реквизиты банка РФ. Укажите карту или счёт для зачисления.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tg-hint mb-2">
                      Номер карты или счёта для получения (РФ)
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-hint pointer-events-none" />
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\s/g, '');
                          const formatted = v.match(/.{1,4}/g)?.join(' ') || v;
                          setAccountNumber(formatted.slice(0, 24));
                        }}
                        placeholder="0000 0000 0000 0000"
                        className="w-full h-12 pl-10 pr-3 rounded-xl bg-tg-bg border border-white/5 text-white placeholder-tg-hint outline-none focus:border-tg-button font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {withdrawMethod === 'crypto' && (
                <>
                  <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-3 flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-200">
                      Вывод на криптокошелёк (USDT в сети TON). Укажите свой адрес для зачисления.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tg-hint mb-2">
                      Адрес кошелька (USDT в сети TON)
                    </label>
                    <input
                      type="text"
                      value={cryptoAddress}
                      onChange={(e) => setCryptoAddress(e.target.value.trim())}
                      placeholder="UQ..."
                      className="w-full h-12 px-3 rounded-xl bg-tg-bg border border-white/5 text-white placeholder-tg-hint outline-none focus:border-tg-button font-mono text-sm"
                    />
                  </div>
                </>
              )}

            </div>
          )}
      </BottomSheet>
    </>
  );
};

export default WithdrawSheet;
