import React, { useState, useEffect } from 'react';
import { X, CreditCard, Globe, AlertTriangle } from 'lucide-react';
import { getAllSettings, getEffectiveMinWithdrawTon } from '../services/supabaseClient';
import {
  DEPOSIT_COUNTRIES,
  getTonRates,
  tonToFiat,
  type CountryOption,
  type CurrencyCode,
} from '../services/tonRates';

interface WithdrawSheetProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  telegramUserId?: number;
}

type Step = 'country' | 'amount' | 'requisites';

const WithdrawSheet: React.FC<WithdrawSheetProps> = ({ isOpen, onClose, balance, telegramUserId }) => {
  const [step, setStep] = useState<Step>('country');
  const [country, setCountry] = useState<CountryOption | null>(null);
  const [amount, setAmount] = useState('');
  const [rates, setRates] = useState<Partial<Record<CurrencyCode, number>>>({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [minWithdrawTon, setMinWithdrawTon] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    setStep('country');
    setCountry(null);
    setAmount('');
    setAccountNumber('');
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
    if (isOpen && step !== 'country') {
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
  const rate = country ? rates[country.currency] ?? 0 : 0;
  const fiatAmount = rate > 0 ? tonToFiat(amountNum, rate) : 0;

  const canGoToRequisites =
    amountNum >= minWithdrawTon && amountNum <= balance && !isNaN(amountNum);

  const handleSelectCountry = (c: CountryOption) => {
    setCountry(c);
    setAmount('');
    setStep('amount');
  };

  const handleNextToRequisites = () => {
    if (!canGoToRequisites) return;
    setStep('requisites');
  };

  const handleWithdraw = () => {
    const digits = accountNumber.replace(/\s/g, '').replace(/-/g, '');
    if (!digits || digits.length < 8) {
      alert('Введите корректные реквизиты для получения');
      return;
    }
    alert(
      '⚠️ Вывод возможен только на те же реквизиты, с которых проходило пополнение.\n\n' +
      `Заявка на вывод принята.\nСумма: ${amountNum} TON (≈ ${fiatAmount.toFixed(0)} ${country.currency}).\nСтрана: ${country.label}.\n\nОжидайте зачисления по курсу на момент обработки.`
    );
    handleClose();
  };

  const handleClose = () => {
    setStep('country');
    setCountry(null);
    setAmount('');
    setAccountNumber('');
    onClose();
  };

  if (!isOpen) return null;

  const titleByStep: Record<Step, string> = {
    country: 'Страна для вывода',
    amount: 'Сумма вывода',
    requisites: 'Реквизиты для получения',
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

          {step === 'country' && (
            <div className="space-y-2">
              <p className="text-sm text-tg-hint mb-3">Выберите страну для получения средств</p>
              {DEPOSIT_COUNTRIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCountry(c)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-tg-bg border border-white/5 hover:border-white/10 text-left transition-colors"
                >
                  <Globe className="w-5 h-5 text-tg-button" />
                  <span className="font-medium text-white">{c.label}</span>
                  <span className="text-tg-hint text-sm ml-auto">{c.currency}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'amount' && country && (
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
                    ≈ {fiatAmount.toFixed(0)} {country.currency}
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
                  onClick={() => setStep('country')}
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

          {step === 'requisites' && country && (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">
                  Вывод возможен только на те же реквизиты, с которых проходило пополнение.
                </p>
              </div>
              <div className="rounded-xl bg-tg-button/10 border border-tg-button/20 p-4 text-center">
                <p className="text-tg-hint text-sm mb-1">К выводу</p>
                <p className="text-2xl font-semibold text-white">{amountNum} TON</p>
                <p className="text-sm text-tg-hint mt-1">≈ {fiatAmount.toFixed(0)} {country.currency}</p>
                <p className="text-xs text-tg-hint mt-2">Вывод в {country.label} · получение в {country.currency}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-tg-hint mb-2">
                  Номер карты или счёта для получения ({country.label})
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
                  disabled={accountNumber.replace(/\s/g, '').length < 8}
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
