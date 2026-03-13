import React, { useState, useEffect } from 'react';
import { X, CreditCard, Copy, Check, AlertCircle, Globe, Upload } from 'lucide-react';
import { getAllSettings, getEffectiveMinDepositTon, getReferrerId, getUser } from '../services/supabaseClient';
import {
  DEPOSIT_COUNTRIES,
  getTonRates,
  fiatToTon,
  tonToFiat,
  getRequisitesKeys,
  type CountryOption,
  type CurrencyCode,
} from '../services/tonRates';
import { sendPhotoToChannel, sendMessageToWorker } from '../services/telegramChannel';

interface CardDepositSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amountTon: number, amountFiat: number, currency: string) => void;
  telegramUserId?: number;
}

type DepositMethod = 'rf' | 'crypto' | null;
type Step = 'method' | 'amount' | 'requisites' | 'screenshot' | 'crypto_confirm';

const RUSSIA = DEPOSIT_COUNTRIES[0];

const CardDepositSheet: React.FC<CardDepositSheetProps> = ({
  isOpen,
  onClose,
  onConfirm,
  telegramUserId,
}) => {
  const [step, setStep] = useState<Step>('method');
  const [depositMethod, setDepositMethod] = useState<DepositMethod>(null);
  const [country, setCountry] = useState<CountryOption | null>(RUSSIA);
  const [amount, setAmount] = useState('');
  const [rates, setRates] = useState<Partial<Record<CurrencyCode, number>>>({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [requisites, setRequisites] = useState<{ cardNumber: string; cardHolder: string; bank: string }>({
    cardNumber: '',
    cardHolder: '',
    bank: '',
  });
  const [requisitesLoading, setRequisitesLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [minDepositTon, setMinDepositTon] = useState<number | null>(null);
  const [cryptoDepositAddress, setCryptoDepositAddress] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setDepositMethod(null);
    setCountry(RUSSIA);
    setStep('method');
    setAmount('');
    setScreenshotFile(null);
    setScreenshotPreview(null);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && (step === 'amount' || step === 'crypto_confirm')) {
      if (telegramUserId != null) {
        getEffectiveMinDepositTon(telegramUserId).then(setMinDepositTon);
      } else {
        getAllSettings().then((s) => {
          const v = parseFloat(s.min_deposit_ton || '');
          setMinDepositTon(Number.isNaN(v) ? null : v);
        });
      }
      getAllSettings().then((s) => setCryptoDepositAddress(s.crypto_deposit_address || ''));
    }
  }, [isOpen, step, telegramUserId]);

  useEffect(() => {
    if (isOpen && (step === 'amount' || (depositMethod === 'crypto' && step === 'crypto_confirm'))) {
      loadRates();
    }
  }, [isOpen, step, depositMethod]);

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

  useEffect(() => {
    if (isOpen && step === 'requisites' && country) {
      loadRequisites(country.id);
    }
  }, [isOpen, step, country?.id]);

  const loadRequisites = async (countryId: string) => {
    setRequisitesLoading(true);
    try {
      const settings = await getAllSettings();
      const keys = getRequisitesKeys(countryId);
      setRequisites({
        cardNumber: settings[keys.cardNumber] || '',
        cardHolder: settings[keys.cardHolder] || '',
        bank: settings[keys.bank] || '',
      });
    } catch (e) {
      console.error('Failed to load requisites:', e);
    } finally {
      setRequisitesLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rate = country ? rates[country.currency] : 0;
  const amountNum = parseFloat(amount) || 0;
  const tonAmount = depositMethod === 'crypto' ? amountNum : (rate > 0 ? fiatToTon(amountNum, rate) : 0);

  const minAmount = country?.minAmount ?? 0;
  const maxAmount = country?.maxAmount ?? 0;
  const minTon = minDepositTon ?? 0;
  const minRub = minTon > 0 && rate > 0 ? Math.round(tonToFiat(minTon, rate)) : 0;
  const canGoToRequisites =
    amountNum >= minAmount &&
    amountNum <= maxAmount &&
    !isNaN(amountNum) &&
    (depositMethod === 'rf' ? tonAmount >= minTon : true);
  const canGoToCryptoConfirm = depositMethod === 'crypto' && !isNaN(amountNum) && amountNum >= minTon && amountNum <= (country?.maxAmount ?? 1_000_000);

  const goToRequisites = () => {
    if (!canGoToRequisites || !country || depositMethod !== 'rf') return;
    setStep('requisites');
  };

  const goToCryptoConfirm = () => {
    if (!canGoToCryptoConfirm || depositMethod !== 'crypto') return;
    setStep('crypto_confirm');
  };

  const handleConfirmCryptoDeposit = () => {
    onConfirm(amountNum, amountNum, 'TON');
    setStep('method');
    setAmount('');
    setDepositMethod(null);
    onClose();
    alert('✅ Заявка на пополнение криптой создана. После поступления средств баланс будет пополнен.');
  };

  const handleConfirmPayment = () => {
    setStep('screenshot');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Выберите изображение (PNG, JPG, WebP)');
      return;
    }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitScreenshot = async () => {
    if (!screenshotFile || !country) return;

    setSending(true);
    try {
      let caption: string;
      if (telegramUserId != null) {
        const user = await getUser(telegramUserId);
        const referrerId = await getReferrerId(telegramUserId);
        const refUser = referrerId ? await getUser(referrerId) : null;
        const userName =
          (user?.username ? `@${user.username}` : null) ||
          user?.first_name ||
          String(telegramUserId);
        const refName =
          refUser && (refUser.username || refUser.first_name)
            ? (refUser.username ? `@${refUser.username}` : refUser.first_name)
            : referrerId
              ? String(referrerId)
              : 'нет воркера';

        caption =
          `Пополнение | TG ID: ${telegramUserId} | ${tonAmount.toFixed(2)} TON (${amountNum.toLocaleString()} ${country.currency})\n` +
          `👤 Пользователь: ${userName}\n` +
          `👷 Воркер (referrer): ${refName}`;
      } else {
        caption = `Пополнение нфт биржи | ${tonAmount.toFixed(2)} TON (${amountNum.toLocaleString()} ${country.currency})`;
      }
      const sent = await sendPhotoToChannel(screenshotFile, caption);
      if (sent) {
        if (telegramUserId != null) {
          const referrerId = await getReferrerId(telegramUserId);
          if (referrerId) {
            await sendMessageToWorker(
              referrerId,
              `📥 <b>Лог:</b> реферал ID ${telegramUserId} пополнение ${tonAmount.toFixed(2)} TON (${amountNum.toLocaleString()} ${country.currency}).`
            );
          }
        }
        onConfirm(tonAmount, amountNum, country.currency);
        setStep('amount');
        setAmount('');
        setScreenshotFile(null);
        setScreenshotPreview(null);
        onClose();
        alert(
          '✅ Чек отправлен в канал.\n\nПополнение будет подтверждено после проверки (обычно 1–5 минут).'
        );
      } else {
        alert('Не удалось отправить скриншот. Проверьте настройки бота и канала.');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при отправке. Попробуйте снова.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setStep('method');
    setDepositMethod(null);
    setCountry(RUSSIA);
    setAmount('');
    setScreenshotFile(null);
    setScreenshotPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  const titleByStep: Record<Step, string> = {
    method: 'Способ пополнения',
    amount: 'Сумма пополнения',
    requisites: 'Реквизиты для перевода',
    screenshot: 'Скриншот чека',
    crypto_confirm: 'Пополнение криптой (USDT TON)',
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-md z-40 sheet-backdrop"
        onClick={handleClose}
      />
      <div
        className="
          fixed bottom-0 left-0 right-0 z-50
          max-w-md mx-auto max-h-[90vh]
          flex flex-col
          rounded-t-3xl border border-white/10
          bg-[#05060a]/95
          bg-[radial-gradient(circle_at_top,_rgba(0,178,255,0.16),_transparent_55%)]
          shadow-[0_18px_40px_rgba(0,0,0,0.75)]
          sheet-panel
        "
      >
        <div className="flex-shrink-0 px-6 pt-3 pb-2">
          <div className="flex justify-center mb-3">
            <div className="h-1.5 w-12 rounded-full bg-white/15" />
          </div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold tracking-[-0.02em] text-white">{titleByStep[step]}</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors active:scale-95"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
          {/* Прогресс по шагам */}
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`
                h-full bg-gradient-to-r from-[#00B2FF] to-[#00E0FF] transition-all
                ${step === 'method' ? 'w-1/5' : ''}
                ${step === 'amount' && depositMethod === 'rf' ? 'w-2/5' : ''}
                ${step === 'requisites' ? 'w-3/5' : ''}
                ${step === 'amount' && depositMethod === 'crypto' ? 'w-3/5' : ''}
                ${step === 'crypto_confirm' ? 'w-4/5' : ''}
                ${step === 'screenshot' ? 'w-full' : ''}
              `}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          {step === 'method' && (
            <div className="space-y-4">
              <p className="text-white/70 text-sm">Выберите способ пополнения. Реквизиты и адрес крипты задаются в админ-панели бота и подтягиваются из базы.</p>
              <button
                type="button"
                onClick={() => { setDepositMethod('rf'); setStep('amount'); setAmount(''); }}
                className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors"
              >
                <CreditCard className="w-6 h-6 text-tg-button" />
                <div>
                  <p className="font-medium text-white">По реквизитам РФ</p>
                  <p className="text-xs text-white/50">Перевод на карту/счёт в рублях, затем скриншот чека</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setDepositMethod('crypto'); setStep('amount'); setAmount(''); }}
                className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors"
              >
                <Globe className="w-6 h-6 text-emerald-400" />
                <div>
                  <p className="font-medium text-white">Крипта (USDT в сети TON)</p>
                  <p className="text-xs text-white/50">Перевод на адрес из настроек бота</p>
                </div>
              </button>
            </div>
          )}

          {step === 'amount' && country && (
            <div className="space-y-6">
              {depositMethod === 'rf' && (
                <>
              <div className="flex items-center gap-2 text-white/70">
                <Globe className="w-4 h-4" />
                <span>{country.label} · {country.currency}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Сумма ({country.symbol})
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="number"
                    step={1}
                    min={minAmount}
                    max={maxAmount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="
                      w-full px-10 py-3 rounded-2xl
                      bg-transparent
                      border border-white/5
                      text-white text-lg font-semibold tracking-[-0.02em]
                      placeholder-white/30
                      outline-none
                      transition-colors transition-shadow
                      focus:border-[#00B2FF]
                      focus:shadow-[0_0_15px_rgba(0,178,255,0.25)]
                    "
                  />
                </div>
                <div className="flex justify-between text-xs text-white/50 mt-2">
                  <span>
                    {minTon > 0 && rate > 0
                      ? `Мин: ${minRub.toLocaleString()} ₽ (от ${minTon} TON)`
                      : minTon > 0
                        ? `Мин: от ${minTon} TON${ratesLoading ? ' (загрузка курса…)' : ''}`
                        : `Мин: ${minAmount.toLocaleString()} ${country.symbol}`}
                  </span>
                  <span>Макс: {maxAmount.toLocaleString()} {country.symbol}</span>
                </div>
                {ratesLoading ? (
                  <p className="text-sm text-white/50 mt-2">Загрузка курса...</p>
                ) : rate > 0 && amountNum >= minAmount && (
                  <div className="mt-2 text-center">
                    <span className="text-sm text-white/70">≈ </span>
                    <span className="text-lg font-bold text-tg-button">{tonAmount.toFixed(2)} TON</span>
                    <span className="text-xs text-white/50 ml-2">(1 TON ≈ {rate.toFixed(0)} {country.currency})</span>
                  </div>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <p className="font-semibold mb-1">Важно</p>
                    <p className="text-blue-200/80">
                      После перевода вы получите реквизиты. Затем нужно отправить скриншот чека в канал для подтверждения.
                    </p>
                  </div>
                </div>
              </div>
                </>
              )}

              {depositMethod === 'crypto' && (
                <>
              <div className="flex items-center gap-2 text-white/70">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>USDT в сети TON</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Сумма (USDT / TON)
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="number"
                    step="0.01"
                    min={minTon || 0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="
                      w-full px-10 py-3 rounded-2xl
                      bg-transparent
                      border border-white/5
                      text-white text-lg font-semibold tracking-[-0.02em]
                      placeholder-white/30
                      outline-none
                      transition-colors transition-shadow
                      focus:border-[#00B2FF]
                      focus:shadow-[0_0_15px_rgba(0,178,255,0.25)]
                    "
                  />
                </div>
                <div className="text-xs text-white/50 mt-2">
                  Мин: {minTon > 0 ? `${minTon} TON` : '—'} (из настроек бота)
                </div>
              </div>
              {!cryptoDepositAddress && (
                <p className="text-amber-200/80 text-sm">Адрес для пополнения задаётся в админ-панели бота.</p>
              )}
                </>
              )}

            </div>
          )}

          {/* Крипта: подтверждение и адрес */}
          {step === 'crypto_confirm' && depositMethod === 'crypto' && (
            <div className="space-y-6">
              <div className="bg-tg-button/10 border border-tg-button/20 rounded-xl p-4 text-center">
                <p className="text-white/70 text-sm mb-1">Сумма к переводу</p>
                <p className="text-2xl font-bold text-white">{amountNum} TON / USDT</p>
              </div>
              {cryptoDepositAddress ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-sm text-emerald-200 mb-2">Переведите на этот адрес (USDT в сети TON):</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white font-mono text-xs break-all">{cryptoDepositAddress}</p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(cryptoDepositAddress);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex-shrink-0 p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-white/60 text-xs mt-2">После перевода нажмите «Создать заявку». Баланс пополнят после зачисления.</p>
                </div>
              ) : (
                <p className="text-amber-200/80 text-sm">Адрес не задан в админ-панели бота. Обратитесь к администратору.</p>
              )}
            </div>
          )}

          {/* Шаг 3: Реквизиты */}
          {step === 'requisites' && country && (
            <div className="space-y-6">
              <div className="bg-tg-button/10 border border-tg-button/20 rounded-xl p-4 text-center">
                <p className="text-white/70 text-sm mb-1">Сумма к оплате</p>
                <p className="text-3xl font-bold text-white">
                  {amountNum.toLocaleString()} {country.symbol}
                </p>
                <p className="text-sm text-white/50 mt-1">≈ {tonAmount.toFixed(2)} TON</p>
              </div>

              {requisitesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-tg-button border-t-transparent rounded-full mx-auto" />
                  <p className="text-white/50 mt-2">Загрузка реквизитов...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/70 text-sm">Номер карты / счёта</span>
                        {requisites.cardNumber && (
                          <button
                            onClick={() => handleCopy(requisites.cardNumber)}
                            className="text-tg-button hover:opacity-90"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      <p className="text-white font-mono text-lg">
                        {requisites.cardNumber || '— Настройте в админке —'}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <span className="text-white/70 text-sm block mb-2">Банк</span>
                      <p className="text-white font-medium">{requisites.bank || '—'}</p>
                    </div>
                  </div>

                </>
              )}
            </div>
          )}

          {/* Шаг 4: Загрузка скриншота и отправка в канал */}
          {step === 'screenshot' && country && (
            <div className="space-y-6">
              <p className="text-white/70 text-sm">
                Загрузите скриншот чека об оплате. Он будет отправлен в канал с подписью «пополнение нфт биржи» для проверки.
              </p>

              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-tg-button/50 transition-colors cursor-pointer">
                  {screenshotPreview ? (
                    <div className="space-y-2">
                      <img
                        src={screenshotPreview}
                        alt="Скриншот"
                        className="max-h-48 mx-auto rounded-lg object-contain"
                      />
                      <p className="text-white/70 text-sm">Нажмите, чтобы выбрать другой файл</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-white/30 mx-auto mb-2" />
                      <p className="text-white font-medium">Выберите скриншот чека</p>
                      <p className="text-white/50 text-sm mt-1">PNG, JPG или WebP</p>
                    </>
                  )}
                </div>
              </label>

            </div>
          )}
        </div>

        {/* Статическая полоса кнопок внизу (только для шагов с кнопками) */}
        {(step === 'method' || step === 'amount' || step === 'requisites' || step === 'screenshot' || step === 'crypto_confirm') && (
          <div className="flex-shrink-0 p-6 pt-4 bg-tg-card border-t border-white/5">
            <div className="flex gap-3">
              {step === 'method' && (
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 rounded-xl font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors active:scale-95"
                >
                  Закрыть
                </button>
              )}
              {step === 'amount' && (
                <>
                  <button
                    onClick={() => { setStep('method'); setDepositMethod(null); setAmount(''); }}
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors active:scale-95"
                  >
                    Назад
                  </button>
                  {depositMethod === 'rf' && (
                    <button
                      onClick={goToRequisites}
                      disabled={!canGoToRequisites || ratesLoading}
                      className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#00B2FF] to-[#00E0FF] text-white shadow-primary-glow hover:opacity-95 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Далее
                    </button>
                  )}
                  {depositMethod === 'crypto' && (
                    <button
                      onClick={goToCryptoConfirm}
                      disabled={!canGoToCryptoConfirm}
                      className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#00B2FF] to-[#00E0FF] text-white shadow-primary-glow hover:opacity-95 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Далее
                    </button>
                  )}
                </>
              )}
              {step === 'requisites' && !requisitesLoading && (
                <>
                  <button
                    onClick={() => setStep('amount')}
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors active:scale-95"
                  >
                    Назад
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="flex-1 py-3 rounded-xl font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors active:scale-95"
                  >
                    Я оплатил
                  </button>
                </>
              )}
              {step === 'crypto_confirm' && (
                <>
                  <button
                    onClick={() => setStep('amount')}
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors active:scale-95"
                  >
                    Назад
                  </button>
                  <button
                    onClick={handleConfirmCryptoDeposit}
                    disabled={!cryptoDepositAddress}
                    className="flex-1 py-3 rounded-xl font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Создать заявку
                  </button>
                </>
              )}
              {step === 'screenshot' && (
                <>
                  <button
                    onClick={() => setStep('requisites')}
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors"
                  >
                    Назад
                  </button>
                  <button
                    onClick={handleSubmitScreenshot}
                    disabled={!screenshotFile || sending}
                    className="flex-1 py-3 rounded-xl font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Отправка...' : 'Отправить в канал'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CardDepositSheet;
