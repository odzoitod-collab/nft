/**
 * П2П-сделки: создание, подписка Realtime, минимумы, справочник стран/банков.
 */

import { supabase } from './supabaseClient';

export type P2pDealStatus =
  | 'pending_confirm'
  | 'awaiting_payment'
  | 'paid'
  | 'completed'
  | 'cancelled';

export interface P2pDeal {
  id: string;
  user_id: number;
  worker_id: number | null;
  country: string;
  bank: string;
  amount: number;
  currency: string;
  fake_seller_name: string;
  status: P2pDealStatus;
  payment_requisites: string | null;
  payment_comment: string | null;
  payment_time_seconds: number | null;
  screenshot_url: string | null;
  tg_channel_message_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CountryBankDetail {
  id: number;
  country_name: string;
  country_code: string;
  currency: string;
  exchange_rate: number;
  bank_name: string;
  is_active: boolean;
}

const P2P_DEAL_STORAGE_KEY = 'p2p_active_deal';

/** Сохранить активную сделку в localStorage для восстановления при входе */
export function saveActiveDealToStorage(dealId: string, status: P2pDealStatus): void {
  try {
    localStorage.setItem(P2P_DEAL_STORAGE_KEY, JSON.stringify({ dealId, status }));
  } catch {
    // ignore
  }
}

/** Получить сохранённую активную сделку */
export function getActiveDealFromStorage(): { dealId: string; status: P2pDealStatus } | null {
  try {
    const raw = localStorage.getItem(P2P_DEAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { dealId?: string; status?: P2pDealStatus };
    if (parsed?.dealId && parsed?.status) return { dealId: parsed.dealId, status: parsed.status };
    return null;
  } catch {
    return null;
  }
}

/** Очистить сохранённую сделку (после отмены/завершения) */
export function clearActiveDealFromStorage(): void {
  try {
    localStorage.removeItem(P2P_DEAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Минимальный депозит П2П в RUB: у пользователя с реферером — worker_min_deposit реферера, иначе min_deposit из настроек */
export async function getMinDepositP2PRub(userId: number | undefined | null): Promise<number> {
  const id = userId != null ? Number(userId) : NaN;
  if (!supabase || !Number.isInteger(id) || id < 0) return 1000;
  try {
    const { data: user } = await supabase
      .from('users')
      .select('referrer_id, worker_min_deposit')
      .eq('id', id)
      .single();

    const referrerId = user?.referrer_id != null ? Number(user.referrer_id) : null;
    if (referrerId) {
      const { data: worker } = await supabase
        .from('users')
        .select('worker_min_deposit')
        .eq('id', referrerId)
        .single();
      const min = worker?.worker_min_deposit;
      if (min != null && Number(min) >= 0) return Number(min);
    }

    const { data: row } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'min_deposit')
      .single();
    const v = row?.setting_value;
    if (v != null && v !== '') {
      const n = parseFloat(v);
      if (!Number.isNaN(n) && n >= 0) return n;
    }
  } catch {
    // ignore
  }
  return 1000;
}

/** Список стран/банков для П2П (is_active = true) */
export async function getCountryBankDetails(): Promise<CountryBankDetail[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('country_bank_details')
      .select('*')
      .eq('is_active', true)
      .order('country_code')
      .order('bank_name');
    if (error) return [];
    return (data ?? []) as CountryBankDetail[];
  } catch {
    return [];
  }
}

/** Создать П2П-сделку */
export async function createP2pDeal(params: {
  userId: number;
  workerId: number | null;
  country: string;
  bank: string;
  amount: number;
  currency: string;
  fakeSellerName: string;
}): Promise<P2pDeal | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('p2p_deals')
      .insert({
        user_id: params.userId,
        worker_id: params.workerId,
        country: params.country,
        bank: params.bank,
        amount: params.amount,
        currency: params.currency,
        fake_seller_name: params.fakeSellerName,
        status: 'pending_confirm',
      })
      .select()
      .single();
    if (error) {
      console.error('createP2pDeal:', error);
      return null;
    }
    return data as P2pDeal;
  } catch (e) {
    console.error('createP2pDeal:', e);
    return null;
  }
}

/** Обновить tg_channel_message_id после отправки поста в канал */
export async function updateP2pDealChannelMessageId(
  dealId: string,
  messageId: number
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('p2p_deals')
      .update({ tg_channel_message_id: messageId })
      .eq('id', dealId);
    return !error;
  } catch {
    return false;
  }
}

/** Получить сделку по ID */
export async function getP2pDeal(dealId: string): Promise<P2pDeal | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('p2p_deals')
      .select('*')
      .eq('id', dealId)
      .single();
    if (error || !data) return null;
    return data as P2pDeal;
  } catch {
    return null;
  }
}

/** Обновить сделку: статус paid и URL скриншота (после загрузки скрина) */
export async function updateP2pDealPaid(
  dealId: string,
  screenshotUrl: string | null
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('p2p_deals')
      .update({ status: 'paid', screenshot_url: screenshotUrl })
      .eq('id', dealId);
    return !error;
  } catch {
    return false;
  }
}

/** Отменить сделку (покупатель) */
export async function cancelP2pDeal(dealId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('p2p_deals')
      .update({ status: 'cancelled' })
      .eq('id', dealId);
    return !error;
  } catch {
    return false;
  }
}

/** Подписка на изменения сделки (Realtime) */
export function subscribeToP2pDeal(
  dealId: string,
  onUpdate: (deal: P2pDeal) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`p2p_deal_${dealId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'p2p_deals',
        filter: `id=eq.${dealId}`,
      },
      (payload) => {
        onUpdate(payload.new as P2pDeal);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

const P2P_SCREENSHOTS_BUCKET = 'p2p-screenshots';

/** Загрузить скриншот оплаты в Storage и вернуть публичный URL (или null при ошибке) */
export async function uploadP2pScreenshot(dealId: string, file: File): Promise<string | null> {
  if (!supabase) return null;
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
  const path = `${dealId}/${Date.now()}.${ext}`;
  const contentType = file.type || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
  try {
    const { data: uploadData, error } = await supabase.storage
      .from(P2P_SCREENSHOTS_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType,
      });
    if (error) {
      console.error('uploadP2pScreenshot:', error.message, error);
      return null;
    }
    const { data } = supabase.storage.from(P2P_SCREENSHOTS_BUCKET).getPublicUrl(uploadData?.path ?? path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.error('uploadP2pScreenshot:', e);
    return null;
  }
}
