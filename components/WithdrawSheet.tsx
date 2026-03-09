import React, { useState, useEffect } from 'react';
import { X, CreditCard, Globe, AlertTriangle } from 'lucide-react';
import { getAllSettings, getEffectiveMinWithdrawTon } from '../services/supabaseClient';
import { getTonRates, tonToFiat, type CurrencyCode } from '../services/tonRates';

interface WithdrawSheetProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  telegramUserId?: number;
}

type WithdrawMethod = 'bank_rf' | 'crypto' | null;
type Step = 'method' | 'amount' | 'requisites';

const WithdrawSheet: React.FC<WithdrawSheetProps> = ({ isOpen, onClose, balance, telegramUserId }) => {
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
        alert('Введите корректные реквизиты для получения');
        return;
      }
      alert(
        `Заявка на вывод принята.\nСумма: ${amountNum} TON (≈ ${fiatAmount.toFixed(0)} ₽).\nВывод на реквизиты РФ.\n\nОжидайте зачисления по курсу на момент обработки.`
      );
    } else {
      const addr = (cryptoAddress || '').trim();
      if (!addr || addr.length < 10) {
        alert('Введите адрес кошелька (USDT в сети TON)');
        return;
      }
      alert(
        `Заявка на вывод принята.\nСумма: ${amountNum} TON.\nВывод на крипту (USDT TON).\nАдрес: ${addr}\n\nОжидайте зачисления.`
      );
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

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sheet-backdrop" onClick={handleClose} aria-hidden />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-tg-card rounded-t-xl shadow-2xl max-w-md mx-auto max-h-[90vh] overflow-y-auto border-t border-white/5 sheet-panel">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">{titleByStep[step]}</h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg text-tg-hint hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {step === 'method' && (
            <div className="space-y-2">
              <p className="text-sm text-tg-hint mb-3">Выберите способ вывода. Мин. сумма задаётся в админ-панели бота и подтягивается из базы.</p>
              <button
                type="button"
                onClick={() => handleSelectMethod('bank_rf')}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-tg-bg border border-white/5 hover:border-white/10 text-left transition-colors"
              >
                <CreditCard className="w-5 h-5 text-tg-button" />
                <span className="font-medium text-white">На реквизиты банка (РФ)</span>
                <span className="text-tg-hint text-sm ml-auto">Карта / счёт</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectMethod('crypto')}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-tg-bg border border-white/5 hover:border-white/10 text-left transition-colors"
              >
                <Globe className="w-5 h-5 text-emerald-400" />
                <span className="font-medium text-white">На крипту (USDT в сети TON)</span>
                <span className="text-tg-hint text-sm ml-auto">Адрес кошелька</span>
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
                  <p className="text-sm text-tg-hint mt-2">Загрузка курса...</p>
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
                    className="flex-1 py-2 rounded-lg bg-tg-bg border border-white/5 text-sm font-medium text-white hover:bg-white/5"
                  >
                    {v === balance ? 'Всё' : `${v} TON`}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setStep('method'); setWithdrawMethod(null); setAmount(''); }}
                  className="flex-1 h-10 rounded-xl text-sm font-medium text-white border border-white/5 hover:bg-white/5"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleNextToRequisites}
                  disabled={!canGoToRequisites || ratesLoading}
                  className="flex-1 h-10 rounded-xl text-sm font-medium text-white bg-tg-button hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Далее
                </button>
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

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('amount')}
                  className="flex-1 h-10 rounded-xl text-sm font-medium text-white border border-white/5 hover:bg-white/5"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={
                    withdrawMethod === 'bank_rf'
                      ? accountNumber.replace(/\s/g, '').length < 8
                      : !cryptoAddress || cryptoAddress.length < 10
                  }
                  className="flex-1 h-10 rounded-xl text-sm font-medium text-white bg-green-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вывести
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WithdrawSheet;
