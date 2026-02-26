/**
 * Курсы TON к фиатным валютам через TonAPI (только для отображения).
 * Для конвертации суммы в валюте → TON используется rate = цена 1 TON в этой валюте.
 */

const TONAPI_RATES_URL = 'https://tonapi.io/v2/rates?tokens=ton&currencies=usd,rub,uah,pln,kzt,eur';

export type CurrencyCode = 'RUB' | 'UAH' | 'PLN' | 'KZT' | 'EUR';

export interface CountryOption {
  id: string;
  label: string;
  currency: CurrencyCode;
  symbol: string;
  minAmount: number;
  maxAmount: number;
}

export const DEPOSIT_COUNTRIES: CountryOption[] = [
  { id: 'ua', label: 'Украина', currency: 'UAH', symbol: '₴', minAmount: 100, maxAmount: 500_000 },
  { id: 'pl', label: 'Польша', currency: 'PLN', symbol: 'zł', minAmount: 20, maxAmount: 50_000 },
  { id: 'ru', label: 'Россия', currency: 'RUB', symbol: '₽', minAmount: 100, maxAmount: 1_000_000 },
  { id: 'kz', label: 'Казахстан', currency: 'KZT', symbol: '₸', minAmount: 1000, maxAmount: 5_000_000 },
  { id: 'eu', label: 'Европа', currency: 'EUR', symbol: '€', minAmount: 10, maxAmount: 10_000 },
];

export interface TonRates {
  prices: Partial<Record<CurrencyCode, number>>;
}

let cachedRates: TonRates | null = null;
let cacheTime = 0;
const CACHE_MS = 60_000; // 1 минута

export async function getTonRates(): Promise<TonRates> {
  if (cachedRates && Date.now() - cacheTime < CACHE_MS) {
    return cachedRates;
  }
  const res = await fetch(TONAPI_RATES_URL);
  if (!res.ok) throw new Error('Не удалось загрузить курсы TON');
  const data = await res.json();
  const rates = data?.rates?.TON;
  if (!rates?.prices) throw new Error('Неверный формат ответа курсов');
  cachedRates = { prices: rates.prices };
  cacheTime = Date.now();
  return cachedRates;
}

/**
 * Конвертация суммы в фиате в TON.
 * rate = цена 1 TON в данной валюте (например, 101.44 для RUB).
 */
export function fiatToTon(amountFiat: number, ratePerTon: number): number {
  if (ratePerTon <= 0) return 0;
  return amountFiat / ratePerTon;
}

/**
 * Конвертация TON в фиат.
 */
export function tonToFiat(amountTon: number, ratePerTon: number): number {
  return amountTon * ratePerTon;
}

/**
 * Ключи настроек реквизитов для каждой страны (system_settings).
 * Формат: requisites_{countryId}_card_number, _card_holder, _bank
 */
export function getRequisitesKeys(countryId: string): {
  cardNumber: string;
  cardHolder: string;
  bank: string;
} {
  const prefix = `requisites_${countryId}_`;
  return {
    cardNumber: `${prefix}card_number`,
    cardHolder: `${prefix}card_holder`,
    bank: `${prefix}bank`,
  };
}
