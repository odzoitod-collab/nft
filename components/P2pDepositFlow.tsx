/**
 * П2П-пополнение по спецификации: P2P_DEALS → P2P_WAITING → P2P_PAYMENT → P2P_CHECK → успех.
 * PageHeader по шагу, модалки выбора страны/банка, оверлей деталей сделки.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, Check, Clock, Upload, ChevronRight, Globe, CreditCard, Loader2, Shield, AlertCircle } from 'lucide-react';
import {
  getCountryBankDetails,
  getMinDepositP2PRub,
  createP2pDeal,
  getP2pDeal,
  updateP2pDealPaid,
  cancelP2pDeal,
  subscribeToP2pDeal,
  saveActiveDealToStorage,
  getActiveDealFromStorage,
  clearActiveDealFromStorage,
  uploadP2pScreenshot,
  updateP2pDealChannelMessageId,
  type P2pDeal,
  type P2pDealStatus,
  type CountryBankDetail,
} from '../services/p2pService';
import { sendP2pDealToChannel, sendPhotoToChannel } from '../services/telegramChannel';
import { getReferrerId, getUser, logAction } from '../services/supabaseClient';
import { getBotUsername } from '../services/supabaseClient';

type Step = 'P2P_DEALS' | 'P2P_WAITING' | 'P2P_PAYMENT' | 'P2P_CHECK' | 'done';

const STEP_TITLES: Record<Step, string> = {
  P2P_DEALS: 'П2П торговля',
  P2P_WAITING: 'Ожидание продавца',
  P2P_PAYMENT: 'Оплата сделки',
  P2P_CHECK: 'Скриншот оплаты',
  done: 'П2П',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: '₽', KZT: '₸', PLN: 'zł', UAH: '₴', BYN: 'Br', UZS: "so'm", GEL: '₾', AMD: '֏', KGS: 'с',
  TRY: '₺', AZN: '₼', TJS: 'SM', MDL: 'L', EUR: '€', THB: '฿', AED: 'د.إ', EGP: 'E£',
};

const COUNTRY_FLAGS: Record<string, string> = {
  RU: '🇷🇺', KZ: '🇰🇿', BY: '🇧🇾', UA: '🇺🇦', PL: '🇵🇱', GE: '🇬🇪', AM: '🇦🇲', KG: '🇰🇬', UZ: '🇺🇿',
  TR: '🇹🇷', AZ: '🇦🇿', TJ: '🇹🇯', MD: '🇲🇩', LV: '🇱🇻', LT: '🇱🇹', EE: '🇪🇪', TH: '🇹🇭', AE: '🇦🇪', EG: '🇪🇬',
};
function getCountryFlag(code: string): string {
  return COUNTRY_FLAGS[code] ?? '🌍';
}

/** Фейковые имена «продавцов» для генерации предложений */
const FAKE_SELLER_NAMES = [
  'Алексей К.',
  'Мария П.',
  'Дмитрий В.',
  'Елена С.',
  'Сергей М.',
  'Анна Т.',
  'Игорь Н.',
  'Ольга Л.',
];

/** Одно сгенерированное «предложение» на экране выбора */
export interface P2pOffer {
  fakeSellerName: string;
  bank: string;
  amount: number;
  currency: string;
  minAmount: number;
  maxAmount: number;
  rating: number;
  dealsCount: number;
  completionPercent: number;
  avatarLetter: string;
  avatarColor: string;
}

const AVATAR_COLORS = ['#0091ff', '#30d158', '#ff9f0a', '#bf5af2', '#ff3b30', '#64d2ff'];

function generateOffers(
  amount: number,
  currency: string,
  bank: string,
  minAmount: number
): P2pOffer[] {
  const names = [...FAKE_SELLER_NAMES].sort(() => Math.random() - 0.5);
  const variants = [
    amount,
    Math.max(minAmount, amount - 500),
    amount + 500,
    Math.max(minAmount, amount - 1000),
    amount + 1000,
    amount + 2000,
  ].filter((a) => a >= minAmount);
  return variants.slice(0, 6).map((a, i) => ({
    fakeSellerName: names[i % names.length],
    bank,
    amount: a,
    currency,
    minAmount: Math.max(minAmount, Math.floor(a * 0.5)),
    maxAmount: Math.floor(a * 2),
    rating: 4.8 + Math.random() * 0.2,
    dealsCount: 50 + Math.floor(Math.random() * 500),
    completionPercent: 96 + Math.floor(Math.random() * 4),
    avatarLetter: names[i % names.length].charAt(0),
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}

const PENDING_CONFIRM_TIMEOUT_SEC = 10 * 60; // 10 минут до автоотмены

interface P2pDepositFlowProps {
  isOpen: boolean;
  onClose: () => void;
  telegramUserId?: number;
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
}

const P2pDepositFlow: React.FC<P2pDepositFlowProps> = ({
  isOpen,
  onClose,
  telegramUserId,
  onError,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('P2P_DEALS');
  const [countries, setCountries] = useState<CountryBankDetail[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryBankDetail | null>(null);
  const [banks, setBanks] = useState<CountryBankDetail[]>([]);
  /** Конкретный банк или null = «Любой банк» */
  const [selectedBank, setSelectedBank] = useState<CountryBankDetail | null>(null);
  const [amount, setAmount] = useState('');
  const [minDepositRub, setMinDepositRub] = useState<number>(1000);
  const [offers, setOffers] = useState<P2pOffer[]>([]);
  const [showOffers, setShowOffers] = useState(false);
  const [deal, setDeal] = useState<P2pDeal | null>(null);
  const [modalCountryOpen, setModalCountryOpen] = useState(false);
  const [modalBankOpen, setModalBankOpen] = useState(false);
  const [selectedDealForOverlay, setSelectedDealForOverlay] = useState<P2pOffer | null>(null);
  const [confirmOpenDeal, setConfirmOpenDeal] = useState<P2pOffer | null>(null);
  const [confirmCancelDeal, setConfirmCancelDeal] = useState(false);
  const [confirmScreenshot, setConfirmScreenshot] = useState(false);
  const [paymentScreenOpenedAt, setPaymentScreenOpenedAt] = useState<number | null>(null);
  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState<number | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitingStartedAt, setWaitingStartedAt] = useState<number | null>(null);
  /** Игнорировать клик по бэкдропу в первые ~400 мс после открытия (тот же тап не должен закрыть) */
  const ignoreBackdropUntil = useRef(0);

  const minLocal = selectedCountry
    ? Math.ceil(minDepositRub * selectedCountry.exchange_rate)
    : minDepositRub;
  const amountNum = parseFloat(amount) || 0;
  const canProceedAmount = amountNum >= minLocal;

  // Загрузка справочника и минимума (только при валидном telegramUserId)
  useEffect(() => {
    if (!isOpen) return;
    const uid = telegramUserId != null ? Number(telegramUserId) : NaN;
    if (!Number.isInteger(uid) || uid < 0) return;
    getCountryBankDetails().then((list) => {
      setCountries(list);
      if (list.length > 0 && !selectedCountry) setSelectedCountry(list[0]);
    });
    getMinDepositP2PRub(uid).then(setMinDepositRub);
  }, [isOpen, telegramUserId]);

  useEffect(() => {
    if (isOpen) ignoreBackdropUntil.current = Date.now() + 450;
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    if (Date.now() < ignoreBackdropUntil.current) return;
    onClose();
  }, [onClose]);

  // Банки по выбранной стране (при смене страны сбрасываем банк)
  useEffect(() => {
    if (!selectedCountry) {
      setBanks([]);
      setSelectedBank(null);
      return;
    }
    const list = countries.filter(
      (c) => c.country_code === selectedCountry.country_code && c.is_active
    );
    setBanks(list);
    setSelectedBank(null);
    setShowOffers(false);
  }, [selectedCountry, countries]);

  // Уникальные страны для селектора (первая запись по каждой стране)
  const countryOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return countries.filter((c) => {
      if (seen.has(c.country_code)) return false;
      seen.add(c.country_code);
      return true;
    });
  }, [countries]);


  // Восстановление активной сделки при открытии
  useEffect(() => {
    if (!isOpen) return;
    const saved = getActiveDealFromStorage();
    if (!saved) return;
    getP2pDeal(saved.dealId).then((d) => {
      if (!d) {
        clearActiveDealFromStorage();
        return;
      }
      setDeal(d);
      if (d.status === 'awaiting_payment' && d.payment_requisites) {
        setStep('P2P_PAYMENT');
        setPaymentSecondsLeft(d.payment_time_seconds);
        setPaymentScreenOpenedAt(Date.now());
      } else if (d.status === 'pending_confirm') {
        setStep('P2P_WAITING');
      } else if (d.status === 'paid' || d.status === 'completed') {
        setStep('done');
      } else if (d.status === 'cancelled') {
        clearActiveDealFromStorage();
        setDeal(null);
      }
    });
  }, [isOpen]);

  const handleSelectCountry = useCallback((c: CountryBankDetail) => {
    setSelectedCountry(c);
  }, []);

  const handleSelectBank = useCallback((b: CountryBankDetail | null) => {
    setSelectedBank(b);
    setShowOffers(false);
  }, []);

  /** Банк для генерации предложений: выбранный или первый из списка («Любой банк») */
  const effectiveBank = selectedBank ?? (banks[0] ?? null);

  // Автопоказ предложений при валидной сумме и выбранной стране/банке (без кнопки «Обновить»)
  useEffect(() => {
    if (!effectiveBank || amountNum < minLocal) {
      setShowOffers(false);
      return;
    }
    setOffers(
      generateOffers(amountNum, effectiveBank.currency, effectiveBank.bank_name, minLocal)
    );
    setShowOffers(true);
  }, [effectiveBank?.id, effectiveBank?.currency, effectiveBank?.bank_name, amountNum, minLocal]);

  const handleCancelDeal = useCallback(async () => {
    if (!deal) return;
    const ok = await cancelP2pDeal(deal.id);
    if (ok) {
      clearActiveDealFromStorage();
      setDeal(null);
      setStep('P2P_DEALS');
      onSuccess?.('Сделка отменена.');
    } else {
      onError?.('Не удалось отменить сделку.');
    }
  }, [deal, onError, onSuccess]);

  const goBack = useCallback(() => {
    if (step === 'P2P_DEALS') onClose();
    else if (step === 'P2P_WAITING' || step === 'P2P_PAYMENT') setConfirmCancelDeal(true);
    else if (step === 'P2P_CHECK') setStep('P2P_PAYMENT');
    else if (step === 'done') { setDeal(null); setStep('P2P_DEALS'); }
  }, [step, onClose]);

  const doCancelDeal = useCallback(() => {
    setConfirmCancelDeal(false);
    handleCancelDeal().then(() => { setDeal(null); setStep('P2P_DEALS'); });
  }, [handleCancelDeal]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const openDeal = useCallback(
    async (offer: P2pOffer) => {
      const workerId = await getReferrerId(telegramUserId);
      const created = await createP2pDeal({
        userId: telegramUserId,
        workerId,
        country: selectedCountry!.country_name,
        bank: offer.bank,
        amount: offer.amount,
        currency: offer.currency,
        fakeSellerName: offer.fakeSellerName,
      });
      if (!created) {
        onError?.('Не удалось создать сделку. Попробуйте позже.');
        return;
      }
      setDeal(created);
      setStep('P2P_WAITING');
      setWaitingStartedAt(Date.now());
      saveActiveDealToStorage(created.id, 'pending_confirm');

      const user = await getUser(telegramUserId);
      const workerName = workerId ? (await getUser(workerId))?.first_name || `ID ${workerId}` : 'Прямая регистрация';
      const userName = user?.username ? `@${user.username}` : user?.first_name || String(telegramUserId);
      const text =
        `🟢 <b>П2П СДЕЛКА ОТКРЫТА</b>\n\n` +
        `👤 Пользователь: ${userName} (ID ${telegramUserId})\n` +
        `👷 Воркер: ${workerName}\n` +
        `💰 Сумма: ${offer.amount.toLocaleString()} ${offer.currency}\n` +
        `🌍 Страна: ${selectedCountry!.country_name}\n` +
        `🏦 Банк: ${offer.bank}\n` +
        `📋 Продавец: ${offer.fakeSellerName}\n` +
        `🕐 Время: ${new Date().toLocaleString('ru')}\n` +
        `ID сделки: <code>${created.id}</code>`;

      const botUsername = await getBotUsername();
      const { ok, messageId } = await sendP2pDealToChannel(
        text,
        created.id,
        botUsername || 'EthosGalleryBot'
      );
      if (ok && messageId) {
        await updateP2pDealChannelMessageId(created.id, messageId);
        setDeal((prev) => (prev ? { ...prev, tg_channel_message_id: messageId } : null));
      }
      logAction('deposit_request', {
        userId: telegramUserId,
        tgid: String(telegramUserId),
        payload: {
          source: 'p2p',
          event: 'deal_opened',
          deal_id: created.id,
          amount: offer.amount,
          currency: offer.currency,
          bank: offer.bank,
          country: selectedCountry!.country_name,
        },
      });
    },
    [telegramUserId, selectedCountry, onError]
  );

  // Realtime подписка на сделку
  useEffect(() => {
    if (!deal || (step !== 'P2P_WAITING' && step !== 'P2P_PAYMENT')) return;
    const unsub = subscribeToP2pDeal(deal.id, (updated) => {
      setDeal(updated);
      if (updated.status === 'awaiting_payment' && updated.payment_requisites) {
        setStep('P2P_PAYMENT');
        setPaymentSecondsLeft(updated.payment_time_seconds);
        setPaymentScreenOpenedAt(Date.now());
      } else if (updated.status === 'cancelled') {
        clearActiveDealFromStorage();
        setStep('P2P_DEALS');
        setDeal(null);
      }
    });
    return unsub;
  }, [deal?.id, step]);

  useEffect(() => {
    if (step === 'P2P_PAYMENT') setPaymentScreenOpenedAt(Date.now());
  }, [step]);

  // Таймер оплаты
  useEffect(() => {
    if (step !== 'P2P_PAYMENT' || paymentSecondsLeft == null || paymentSecondsLeft <= 0) return;
    const t = setInterval(() => {
      setPaymentSecondsLeft((s) => (s == null || s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [step, paymentSecondsLeft]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError?.('Выберите изображение (PNG, JPG, WebP).');
      return;
    }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitScreenshot = useCallback(async () => {
    if (!deal || !screenshotFile) return;
    setSending(true);
    try {
      const url = await uploadP2pScreenshot(deal.id, screenshotFile);
      const ok = await updateP2pDealPaid(deal.id, url);
      if (ok) {
        saveActiveDealToStorage(deal.id, 'paid');
        setStep('done');
        clearActiveDealFromStorage();
        onSuccess?.('Скриншот отправлен. Ожидайте зачисления.');
        // Моментально отправить скриншот в тот же ТГ-канал со сделками
        const caption = `🖼 П2П скриншот оплаты\nСделка: ${deal.id}\nСумма: ${deal.amount} ${deal.currency}\nБанк: ${deal.bank}`;
        sendPhotoToChannel(screenshotFile, caption).catch((e) => console.warn('Отправка скриншота в канал:', e));
      } else {
        onError?.('Не удалось обновить сделку.');
      }
    } catch (e) {
      console.error(e);
      onError?.('Ошибка при отправке.');
    } finally {
      setSending(false);
    }
  }, [deal, screenshotFile, onError, onSuccess]);

  if (!isOpen) return null;

  if (telegramUserId == null) {
    return (
      <>
        <div className="fixed inset-0 bg-[#0a0a0b] z-[90]" onClick={handleBackdropClick} aria-hidden />
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0b] p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex-shrink-0 flex items-center justify-between h-14">
            <h1 className="text-lg font-semibold text-white">П2П</h1>
            <button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 active:opacity-80" aria-label="Закрыть">
              <X className="w-5 h-5 text-white/80" />
            </button>
          </header>
          <p className="text-white/70 text-sm mb-6">Вход через Telegram необходим. Откройте приложение из бота.</p>
          <button type="button" onClick={onClose} className="w-full min-h-[48px] py-3 rounded-xl font-medium bg-white/10 text-white active:bg-white/15">
            Назад
          </button>
        </div>
      </>
    );
  }

  const currencySymbol = (effectiveBank && CURRENCY_SYMBOLS[effectiveBank.currency]) || effectiveBank?.currency || '';

  const renderContent = () => {
    if (step === 'P2P_DEALS') {
      const offerList = showOffers && effectiveBank ? (offers.length ? offers : generateOffers(amountNum, effectiveBank.currency, effectiveBank.bank_name, minLocal)) : [];
      const hasValidAmount = amountNum >= minLocal;
      const isEmptyState = !selectedCountry || !hasValidAmount || !showOffers || offerList.length === 0;

      return (
        <>
          <div className="max-w-2xl mx-auto lg:max-w-4xl flex flex-col gap-0">
            {/* Верхняя панель фильтров — компактно */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setModalCountryOpen(true)}
                className="rounded-lg border border-white/10 bg-white/5 p-3 text-left cursor-pointer touch-manipulation flex items-center gap-2 min-h-[56px] btn-touch transition-colors hover:border-white/20"
                style={{ touchAction: 'manipulation' }}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-white/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-white/50">Страна</p>
                  <p className="text-[13px] font-medium text-white truncate">{selectedCountry?.country_name ?? 'Выберите страну'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => selectedCountry && setModalBankOpen(true)}
                disabled={!selectedCountry}
                className="rounded-lg border border-white/10 bg-white/5 p-3 text-left cursor-pointer touch-manipulation flex items-center gap-2 min-h-[56px] disabled:opacity-60 disabled:cursor-not-allowed btn-touch transition-colors hover:border-white/20"
                style={{ touchAction: 'manipulation' }}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-white/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-white/50">Банк</p>
                  <p className="text-[13px] font-medium text-white truncate">{selectedBank ? selectedBank.bank_name : selectedCountry ? 'Любой банк' : '—'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
              </button>
            </div>

            {/* Поле суммы — компактно */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-2">
              <p className="text-[11px] text-white/50 mb-1">Сумма</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={minLocal}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setShowOffers(false); }}
                  placeholder={`от ${minLocal.toLocaleString()}`}
                  className={`flex-1 min-h-[40px] bg-transparent border-0 text-[17px] font-semibold font-mono text-white placeholder-white/40 outline-none ${!hasValidAmount && amount.length > 0 ? 'text-red-400' : ''}`}
                />
                <span className="text-[14px] font-medium text-white/80 w-6 text-right">{currencySymbol}</span>
              </div>
              <div className="flex justify-between items-center mt-1 text-[11px]">
                <span className="text-white/45">Мин. сумма: {minLocal.toLocaleString()} {effectiveBank?.currency ?? ''}</span>
                {!hasValidAmount && amount.length > 0 && (
                  <span className="text-red-400">От {minLocal.toLocaleString()}</span>
                )}
              </div>
            </div>

            <div className="h-px bg-white/10 my-1.5" aria-hidden />

            {/* Список предложений или пустое состояние — без кнопки обновить */}
            <div className="flex-1 min-h-0 overflow-y-auto py-1.5">
              {isEmptyState ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4 slide-up">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <Globe className="w-5 h-5 text-white/30" />
                  </div>
                  <p className="text-white/60 text-[13px]">
                    {!selectedCountry ? 'Выберите страну и банк' : !hasValidAmount ? `Укажите сумму от ${minLocal.toLocaleString()} ${effectiveBank?.currency ?? ''}` : 'Подбираем предложения…'}
                  </p>
                  {!hasValidAmount && selectedCountry && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(minLocal))}
                      className="mt-3 text-[12px] text-[var(--accent)] underline cursor-pointer"
                    >
                      Поставить минимум
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2 text-[11px] text-white/50">
                    <span>Найдено {offerList.length} предложений</span>
                    {selectedCountry && <span>{getCountryFlag(selectedCountry.country_code)} {selectedCountry.country_name}</span>}
                  </div>
                  <div className="space-y-2">
                    {offerList.slice(0, 6).map((o, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedDealForOverlay(o)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-left cursor-pointer touch-manipulation hover:border-[var(--accent)]/40 transition-all duration-200 btn-touch"
                        style={{ touchAction: 'manipulation' }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: o.avatarColor }}>
                            {o.avatarLetter}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-[14px]">{o.fakeSellerName}</p>
                            <p className="text-[11px] text-white/50">★ {o.rating.toFixed(1)} · {o.dealsCount} · {o.completionPercent}%</p>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 flex-shrink-0">{o.bank}</span>
                          <div className="flex items-center gap-0.5 rounded-md border border-[var(--accent)]/50 px-2 py-1 flex-shrink-0">
                            <span className="text-[11px] font-medium text-[var(--accent)]">Купить</span>
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--accent)]" />
                          </div>
                        </div>
                        <div className="mt-2 flex items-end justify-between">
                          <div>
                            <p className="text-[15px] font-bold text-white">{o.amount.toLocaleString()} {o.currency}</p>
                            <p className="text-[11px] text-white/45">Лимит {o.minAmount.toLocaleString()}–{o.maxAmount.toLocaleString()}</p>
                          </div>
                          <p className="text-[11px] text-white/45">Комиссия 0%</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Модалка: Страна перевода — анимация выезда */}
          {modalCountryOpen && (
            <>
              <div className="fixed inset-0 z-[110] sheet-backdrop bg-black/60 backdrop-blur-sm" onClick={() => setModalCountryOpen(false)} aria-hidden />
              <div className="fixed bottom-0 left-0 right-0 z-[120] max-h-[65vh] rounded-t-2xl border-t border-white/10 bg-[#0a0a0b] overflow-hidden flex flex-col sheet-panel">
                <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-white/70" />
                    <h3 className="text-[15px] font-semibold text-white">Страна перевода</h3>
                  </div>
                  <button type="button" onClick={() => setModalCountryOpen(false)} className="p-1.5 rounded-full hover:bg-white/10 btn-touch"><X className="w-4 h-4 text-white/70" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {countryOptions.map((c) => (
                      <button
                        key={c.country_code}
                        type="button"
                        onClick={() => { handleSelectCountry(c); setModalCountryOpen(false); }}
                        className={`relative flex flex-col items-center gap-0.5 py-3 px-2 rounded-lg border-2 min-h-[70px] cursor-pointer touch-manipulation transition-colors btn-touch ${selectedCountry?.country_code === c.country_code ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                        style={{ touchAction: 'manipulation' }}
                      >
                        <span className="text-xl">{getCountryFlag(c.country_code)}</span>
                        <span className="font-medium text-white text-[12px] text-center leading-tight">{c.country_name}</span>
                        <span className="text-[10px] text-white/50">{c.currency}</span>
                        {selectedCountry?.country_code === c.country_code && <Check className="w-3.5 h-3.5 text-green-500 absolute top-1.5 right-1.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Модалка: Выбор банка — компактно */}
          {modalBankOpen && selectedCountry && (
            <>
              <div className="fixed inset-0 z-[110] sheet-backdrop bg-black/60 backdrop-blur-sm" onClick={() => setModalBankOpen(false)} aria-hidden />
              <div className="fixed bottom-0 left-0 right-0 z-[120] max-h-[65vh] rounded-t-2xl border-t border-white/10 bg-[#0a0a0b] overflow-hidden flex flex-col sheet-panel">
                <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-white/10">
                  <h3 className="text-[15px] font-semibold text-white">Выбор банка</h3>
                  <button type="button" onClick={() => setModalBankOpen(false)} className="p-1.5 rounded-full hover:bg-white/10 btn-touch"><X className="w-4 h-4 text-white/70" /></button>
                </div>
                <p className="text-[11px] text-white/50 px-3 pb-1.5">Конкретный банк или «Любой банк»</p>
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => { handleSelectBank(null); setModalBankOpen(false); }}
                    className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-lg border-2 cursor-pointer touch-manipulation btn-touch ${!selectedBank ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Shield className="w-4 h-4 text-white/80" /></div>
                    <span className="font-medium text-white text-[13px]">Любой банк</span>
                    {!selectedBank && <Check className="w-4 h-4 text-[var(--accent)] ml-auto" />}
                  </button>
                  {banks.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { handleSelectBank(b); setModalBankOpen(false); }}
                      className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-lg border-2 cursor-pointer touch-manipulation btn-touch ${selectedBank?.id === b.id ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      <span className="font-medium text-white text-[13px]">{b.bank_name}</span>
                      {selectedBank?.id === b.id && <Check className="w-4 h-4 text-[var(--accent)] ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Оверлей: Детали сделки — компактно + анимация */}
          {selectedDealForOverlay && effectiveBank && (
            <>
              <div className="fixed inset-0 z-[110] sheet-backdrop bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDealForOverlay(null)} aria-hidden />
              <div className="fixed bottom-0 left-0 right-0 z-[120] rounded-t-2xl border-t border-white/10 bg-[#0a0a0b] p-3 pb-[env(safe-area-inset-bottom)] sheet-panel">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-semibold text-white">Детали сделки</h3>
                  <button type="button" onClick={() => setSelectedDealForOverlay(null)} className="p-1.5 rounded-full hover:bg-white/10 btn-touch"><X className="w-4 h-4 text-white/70" /></button>
                </div>
                <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-white/5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base" style={{ backgroundColor: selectedDealForOverlay.avatarColor }}>{selectedDealForOverlay.avatarLetter}</div>
                  <div>
                    <p className="font-semibold text-white text-[14px]">{selectedDealForOverlay.fakeSellerName}</p>
                    <p className="text-[11px] text-white/50">★ {selectedDealForOverlay.rating.toFixed(1)} · {selectedDealForOverlay.dealsCount} сделок · {selectedDealForOverlay.completionPercent}%</p>
                  </div>
                </div>
                <dl className="space-y-1.5 text-[13px] mb-3">
                  <div className="flex justify-between"><dt className="text-white/50">Сумма</dt><dd className="text-white font-medium">{selectedDealForOverlay.amount.toLocaleString()} {selectedDealForOverlay.currency}</dd></div>
                  <div className="flex justify-between"><dt className="text-white/50">Банк</dt><dd className="text-white">{selectedDealForOverlay.bank}</dd></div>
                  <div className="flex justify-between"><dt className="text-white/50">Лимиты</dt><dd className="text-white">{selectedDealForOverlay.minAmount.toLocaleString()} – {selectedDealForOverlay.maxAmount.toLocaleString()} {selectedDealForOverlay.currency}</dd></div>
                  <div className="flex justify-between"><dt className="text-white/50">Страна</dt><dd className="text-white">{selectedCountry?.country_name}</dd></div>
                </dl>
                <button
                  type="button"
                  onClick={() => { setConfirmOpenDeal(selectedDealForOverlay); setSelectedDealForOverlay(null); }}
                  className="w-full min-h-[44px] py-2.5 rounded-lg font-semibold bg-[var(--accent)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation btn-touch text-[14px]"
                  style={{ touchAction: 'manipulation' }}
                >
                  Открыть сделку <ChevronRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-white/50 mt-1.5 text-center">Запрос будет отправлен продавцу. Ожидайте реквизиты.</p>
              </div>
            </>
          )}

        </>
      );
    }

    if (step === 'P2P_WAITING') {
      const elapsed = waitingStartedAt ? Math.floor((Date.now() - waitingStartedAt) / 1000) : 0;
      const left = Math.max(0, PENDING_CONFIRM_TIMEOUT_SEC - elapsed);
      const expired = left <= 0;
      return (
        <div className="max-w-2xl mx-auto flex flex-col flex-1 justify-center items-center text-center px-4 py-6 ">
          <div className="w-20 h-20 rounded-full border-2 border-[var(--accent)] flex items-center justify-center mb-4 animate-pulse">
            <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
          </div>
          <h3 className="text-[17px] font-bold text-white">Ожидаем подтверждения</h3>
          <p className="text-white/60 mt-1.5 text-[13px]">Запрос отправлен продавцу. Реквизиты появятся после подтверждения.</p>
          {deal && (
            <div className="mt-4 w-full max-w-sm rounded-lg border border-white/10 bg-white/5 p-3 text-left">
              <div className="flex justify-between text-[12px]"><span className="text-white/50">Продавец</span><span className="text-white">{deal.fake_seller_name}</span></div>
              <div className="flex justify-between text-[12px] mt-1"><span className="text-white/50">Сумма</span><span className="text-white">{deal.amount} {deal.currency}</span></div>
              <div className="flex justify-between text-[12px] mt-1"><span className="text-white/50">Банк</span><span className="text-white">{deal.bank}</span></div>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-[13px]">
            <Clock className="w-4 h-4 text-white/50" />
            {expired ? <span className="text-amber-400">Время истекло — продавец не ответил</span> : <span className="text-white/70">Автоотмена через: {Math.floor(left / 60)}:{(left % 60).toString().padStart(2, '0')}</span>}
          </div>
          {expired ? (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 w-full max-w-sm">
              <p className="text-amber-200 text-[13px] mb-2">Время ожидания истекло.</p>
              <button type="button" onClick={() => setConfirmCancelDeal(true)} className="w-full min-h-[40px] rounded-lg font-medium bg-amber-500/30 text-amber-200 cursor-pointer text-[13px] btn-touch">Выбрать другую сделку</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmCancelDeal(true)} className="mt-3 text-[13px] text-[var(--accent)] underline cursor-pointer">Отменить и выбрать другую сделку</button>
          )}
        </div>
      );
    }

    if (step === 'P2P_PAYMENT' && deal) {
      const expired = paymentSecondsLeft != null && paymentSecondsLeft <= 0;
      const payDelaySec = paymentScreenOpenedAt ? Math.max(0, 5 - Math.floor((Date.now() - paymentScreenOpenedAt) / 1000)) : 0;
      const payDisabled = expired || payDelaySec > 0;
      return (
        <div className="max-w-2xl mx-auto flex flex-col gap-3 pb-4 overflow-y-auto ">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-green-500" /></div>
              <div>
                <h3 className="text-[16px] font-bold text-white">Сделка подтверждена</h3>
                <p className="text-[12px] text-white/50">Переведите средства продавцу</p>
              </div>
            </div>
            {paymentSecondsLeft != null && (
              <span className={expired ? 'text-red-400 font-mono text-[13px]' : 'text-[var(--accent)] font-mono text-[13px]'}>
                {expired ? 'Время вышло' : `${Math.floor(paymentSecondsLeft / 60)}:${(paymentSecondsLeft % 60).toString().padStart(2, '0')}`}
              </span>
            )}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] text-white/50 mb-0.5">Сумма к оплате</p>
            <p className="text-[18px] font-bold text-white">{deal.amount.toLocaleString()} {deal.currency}</p>
            <p className="text-[11px] text-white/45 mt-0.5">Банк: {deal.bank}</p>
          </div>
          <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 p-2.5 text-[12px] text-amber-200">
            Отправляйте <strong>точно</strong> {deal.amount} {deal.currency}. Комментарий обязателен, если указан ниже.
          </div>
          <div className="rounded-lg border-l-4 border-[var(--accent)] border border-white/10 bg-white/5 p-3">
            <p className="text-[13px] font-medium text-white mb-1.5">Реквизиты для перевода</p>
            <div className="font-mono text-[13px] text-white break-all p-2 rounded border border-dashed border-white/20 bg-black/20">
              {deal.payment_requisites || '—'}
            </div>
            {deal.payment_requisites && (
              <button type="button" onClick={() => handleCopy(deal.payment_requisites!)} className="mt-1.5 min-h-[36px] px-3 rounded-lg bg-white/10 text-white text-[12px] font-medium cursor-pointer btn-touch">Копировать реквизиты</button>
            )}
            {deal.payment_comment && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-[11px] text-white/50 mb-1">Комментарий</p>
                <div className="font-mono text-[12px] text-white break-all p-2 rounded bg-black/20">{deal.payment_comment}</div>
                <button type="button" onClick={() => handleCopy(deal.payment_comment!)} className="mt-1.5 min-h-[36px] px-3 rounded-lg bg-white/10 text-white text-[12px] font-medium cursor-pointer btn-touch">Копировать комментарий</button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-white/45">Переведите точную сумму, затем нажмите «Я оплатил».</p>
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => setConfirmCancelDeal(true)} className="flex-1 min-h-[44px] py-2.5 rounded-lg font-semibold border border-white/20 text-white text-[13px] cursor-pointer btn-touch">Отмена</button>
            <button
              type="button"
              disabled={payDisabled}
              onClick={() => setStep('P2P_CHECK')}
              className="flex-1 min-h-[44px] py-2.5 rounded-lg font-semibold bg-[var(--accent)] text-[var(--text-primary)] text-[13px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer btn-touch flex items-center justify-center gap-1"
              style={{ touchAction: 'manipulation' }}
            >
              Я оплатил <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {payDelaySec > 0 && <p className="text-[11px] text-amber-400 text-center">Активна через {payDelaySec} с</p>}
        </div>
      );
    }

    if (step === 'P2P_CHECK' && deal) {
      return (
        <div className="max-w-2xl mx-auto flex flex-col gap-3 pb-4 ">
          <h3 className="text-[16px] font-bold text-white">Прикрепите скриншот</h3>
          <p className="text-white/60 text-[12px]">Помогает быстрее подтвердить платёж.</p>
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <div className="w-full min-h-[160px] border-2 border-dashed border-white/20 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-[var(--accent)]/50 active:bg-white/5 touch-manipulation relative transition-colors" style={{ touchAction: 'manipulation' }}>
              {screenshotPreview ? (
                <div className="relative w-full flex flex-col items-center">
                  <img src={screenshotPreview} alt="Скриншот" className="max-h-36 rounded-lg object-contain mx-auto" />
                  <p className="text-white/60 text-[12px] mt-1.5">{screenshotFile?.name ?? 'Файл'}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setScreenshotFile(null); setScreenshotPreview(null); }}
                    className="absolute top-0 right-0 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full bg-red-500/80 text-white cursor-pointer btn-touch"
                    aria-label="Удалить"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-white/40 mb-1.5" />
                  <p className="text-white font-medium text-[13px]">Нажмите чтобы выбрать файл</p>
                  <p className="text-white/45 text-[11px] mt-0.5">JPG, PNG, WEBP</p>
                </>
              )}
            </div>
          </label>
          <button
            type="button"
            onClick={() => (screenshotFile ? setConfirmScreenshot(true) : null)}
            disabled={!screenshotFile || sending}
            className="w-full min-h-[44px] py-2.5 rounded-lg font-semibold bg-[var(--accent)] text-[var(--text-primary)] text-[13px] disabled:opacity-50 cursor-pointer btn-touch flex items-center justify-center gap-2"
            style={{ touchAction: 'manipulation' }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {sending ? 'Отправка…' : 'Подтвердить оплату'}
          </button>
          <ol className="text-[11px] text-white/45 space-y-0.5 list-decimal list-inside">
            <li>Сумма и валюта на скрине совпадают</li>
            <li>Комментарий присутствует, если указан</li>
            <li>Видно время и статус платежа</li>
          </ol>

          {/* Подтверждение отправки скриншота */}
          {confirmScreenshot && (
            <>
              <div className="fixed inset-0 z-[130] sheet-backdrop bg-black/70" onClick={() => !sending && setConfirmScreenshot(false)} aria-hidden />
              <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 pointer-events-none">
                <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#141416] p-4 sheet-panel pointer-events-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                    <h4 className="text-[15px] font-semibold text-white">Отправить скриншот?</h4>
                  </div>
                  <p className="text-[13px] text-white/70 mb-4">Скриншот будет отправлен на проверку. После одобрения средства зачислят.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmScreenshot(false)} disabled={sending} className="flex-1 min-h-[40px] rounded-lg border border-white/20 text-white text-[13px] font-medium cursor-pointer btn-touch disabled:opacity-50">Отмена</button>
                    <button type="button" onClick={() => { setConfirmScreenshot(false); handleSubmitScreenshot(); }} disabled={sending} className="flex-1 min-h-[40px] rounded-lg bg-[var(--accent)] text-[var(--text-primary)] text-[13px] font-semibold cursor-pointer btn-touch disabled:opacity-50">Да, отправить</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    if (step === 'done') {
      return (
        <div className="max-w-2xl mx-auto flex flex-col flex-1 justify-center items-center text-center px-4 ">
          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mb-3"><Check className="w-7 h-7 text-green-500" /></div>
          <h3 className="text-[17px] font-bold text-white">Ожидайте зачисления</h3>
          <p className="text-white/60 mt-1.5 text-[13px]">Средства зачислят после проверки.</p>
          <button
            type="button"
            onClick={() => { setDeal(null); setStep('P2P_DEALS'); onClose(); }}
            className="mt-4 min-h-[44px] px-6 py-2.5 rounded-lg font-semibold bg-[var(--accent)] text-[var(--text-primary)] text-[13px] cursor-pointer btn-touch"
            style={{ touchAction: 'manipulation' }}
          >
            Закрыть
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div className="fixed inset-0 bg-[#0a0a0b] z-[90]" onClick={handleBackdropClick} aria-hidden />
      <div
        className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0b] overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-shrink-0 flex items-center gap-3 h-14 px-4 border-b border-white/5">
          <button
            type="button"
            onClick={goBack}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 active:opacity-80 cursor-pointer touch-manipulation -ml-1"
            aria-label="Назад"
            style={{ touchAction: 'manipulation' }}
          >
            <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-semibold text-white flex-1">{STEP_TITLES[step]}</h1>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {renderContent()}
        </main>

        {/* Глобальные модалки подтверждения (видны на любом шаге) */}
        {confirmOpenDeal && (
          <>
            <div className="fixed inset-0 z-[130] sheet-backdrop bg-black/70" onClick={() => setConfirmOpenDeal(null)} aria-hidden />
            <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#141416] p-4 sheet-panel pointer-events-auto">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                  <h4 className="text-[15px] font-semibold text-white">Подтвердить открытие сделки?</h4>
                </div>
                <p className="text-[13px] text-white/70 mb-1">Сумма: <strong>{confirmOpenDeal.amount.toLocaleString()} {confirmOpenDeal.currency}</strong></p>
                <p className="text-[13px] text-white/70 mb-4">Продавец: <strong>{confirmOpenDeal.fakeSellerName}</strong></p>
                <p className="text-[11px] text-white/50 mb-3">Запрос будет отправлен продавцу. Реквизиты появятся после подтверждения.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmOpenDeal(null)} className="flex-1 min-h-[40px] rounded-lg border border-white/20 text-white text-[13px] font-medium cursor-pointer btn-touch">Отмена</button>
                  <button type="button" onClick={() => { openDeal(confirmOpenDeal); setConfirmOpenDeal(null); }} className="flex-1 min-h-[40px] rounded-lg bg-[var(--accent)] text-[var(--text-primary)] text-[13px] font-semibold cursor-pointer btn-touch">Да, открыть</button>
                </div>
              </div>
            </div>
          </>
        )}
        {confirmCancelDeal && (
          <>
            <div className="fixed inset-0 z-[130] sheet-backdrop bg-black/70" onClick={() => setConfirmCancelDeal(false)} aria-hidden />
            <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#141416] p-4 sheet-panel pointer-events-auto">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <h4 className="text-[15px] font-semibold text-white">Отменить сделку?</h4>
                </div>
                <p className="text-[13px] text-white/70 mb-4">Вы вернётесь к списку предложений.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmCancelDeal(false)} className="flex-1 min-h-[40px] rounded-lg border border-white/20 text-white text-[13px] font-medium cursor-pointer btn-touch">Нет</button>
                  <button type="button" onClick={doCancelDeal} className="flex-1 min-h-[40px] rounded-lg bg-red-500/80 text-white text-[13px] font-semibold cursor-pointer btn-touch">Да, отменить</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default P2pDepositFlow;
