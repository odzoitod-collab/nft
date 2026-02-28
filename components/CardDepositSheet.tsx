import React, { useState, useEffect } from 'react';
import { X, CreditCard, Copy, Check, AlertCircle, Globe, Upload } from 'lucide-react';
import { getAllSettings, getEffectiveMinDepositTon, getReferrerId } from '../services/supabaseClient';
import {
  DEPOSIT_COUNTRIES,
  getTonRates,
  fiatToTon,
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

type Step = 'country' | 'amount' | 'requisites' | 'screenshot';

const CardDepositSheet: React.FC<CardDepositSheetProps> = ({
  isOpen,
  onClose,
  onConfirm,
  telegramUserId,
}) => {
  const [step, setStep] = useState<Step>('country');
  const [country, setCountry] = useState<CountryOption | null>(null);
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

  useEffect(() => {
    if (!isOpen) return;
    setStep('country');
    setCountry(null);
    setAmount('');
    setScreenshotFile(null);
    setScreenshotPreview(null);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === 'amount') {
      if (telegramUserId != null) {
        getEffectiveMinDepositTon(telegramUserId).then(setMinDepositTon);
      } else {
        getAllSettings().then((s) => {
          const v = parseFloat(s.min_deposit_ton || '');
          setMinDepositTon(Number.isNaN(v) ? null : v);
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

  const handleSelectCountry = (c: CountryOption) => {
    setCountry(c);
    setAmount('');
    loadRequisites(c.id);
    setStep('amount');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rate = country ? rates[country.currency] : 0;
  const amountNum = parseFloat(amount) || 0;
  const tonAmount = rate > 0 ? fiatToTon(amountNum, rate) : 0;

  const minAmount = country?.minAmount ?? 0;
  const maxAmount = country?.maxAmount ?? 0;
  const minTon = minDepositTon ?? 0;
  const canGoToRequisites =
    amountNum >= minAmount &&
    amountNum <= maxAmount &&
    !isNaN(amountNum) &&
    tonAmount >= minTon;

  const goToRequisites = () => {
    if (!canGoToRequisites || !country) return;
    setStep('requisites');
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
      const caption =
        telegramUserId != null
          ? `Пополнение | TG ID: ${telegramUserId} | ${tonAmount.toFixed(2)} TON (${amountNum.toLocaleString()} ${country.currency})`
          : `Пополнение нфт биржи | ${tonAmount.toFixed(2)} TON (${amountNum.toLocaleString()} ${country.currency})`;
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
        setStep('country');
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
    setStep('country');
    setCountry(null);
    setAmount('');
    setScreenshotFile(null);
    setScreenshotPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  const titleByStep: Record<Step, string> = {
    country: 'Страна пополнения',
    amount: 'Сумма пополнения',
    requisites: 'Реквизиты для перевода',
    screenshot: 'Скриншот чека',
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sheet-backdrop"
        onClick={handleClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-tg-card rounded-t-xl shadow-2xl max-w-md mx-auto max-h-[90vh] flex flex-col border-t border-white/5 sheet-panel">
        <div className="flex-shrink-0 p-6 pb-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">{titleByStep[step]}</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          {step === 'country' && (
            <div className="space-y-4">
              <p className="text-white/70 text-sm">Выберите страну для пополнения</p>
              <div className="grid gap-2">
                {DEPOSIT_COUNTRIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCountry(c)}
                    className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors"
                  >
                    <Globe className="w-5 h-5 text-tg-button" />
                    <span className="font-medium text-white">{c.label}</span>
                    <span className="text-white/50 text-sm ml-auto">{c.currency}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Шаг 2: Сумма в валюте страны */}
          {step === 'amount' && country && (
            <div className="space-y-6">
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
                    step={country.currency === 'KZT' ? 500 : 1}
                    min={minAmount}
                    max={maxAmount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white placeholder-white/30 focus:outline-none focus:border-tg-button transition-colors text-lg font-semibold"
                  />
                </div>
                <div className="flex justify-between text-xs text-white/50 mt-2">
                  <span>Мин: {minAmount.toLocaleString()} {country.symbol}{minTon > 0 ? ` (≥ ${minTon} TON)` : ''}</span>
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

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-200">
                        <p className="font-semibold mb-1">Внимание</p>
                        <ul className="text-yellow-200/80 space-y-1 list-disc list-inside">
                          <li>Переведите точную сумму: {amountNum.toLocaleString()} {country.symbol}</li>
                          <li>В комментарии укажите ваш Telegram ID</li>
                          <li>После перевода нажмите «Я оплатил» и загрузите скриншот чека</li>
                        </ul>
                      </div>
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
                  capture="environment"
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
        {(step === 'amount' || step === 'requisites' || step === 'screenshot') && (
          <div className="flex-shrink-0 p-6 pt-4 bg-tg-card border-t border-white/5">
            <div className="flex gap-3">
              {step === 'amount' && (
                <>
                  <button
                    onClick={() => setStep('country')}
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors"
                  >
                    Назад
                  </button>
                  <button
                    onClick={goToRequisites}
                    disabled={!canGoToRequisites || ratesLoading}
                    className="flex-1 py-3 rounded-xl font-semibold bg-tg-button text-white hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Далее
                  </button>
                </>
              )}
              {step === 'requisites' && !requisitesLoading && (
                <>
                  <button
                    onClick={() => setStep('amount')}
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors"
                  >
                    Назад
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="flex-1 py-3 rounded-xl font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors"
                  >
                    Я оплатил
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
