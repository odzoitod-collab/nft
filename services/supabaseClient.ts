import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://bfwvifusfewekcxtnjar.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmd3ZpZnVzZmV3ZWtjeHRuamFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjkyNDksImV4cCI6MjA4NzUwNTI0OX0.enRGKEp2ya1CvkXb8yfCOmU-jG5TJlJ05rLXaZmhxno';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

const _client: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const supabase = _client;

// Типы для базы данных
export interface DbUser {
  id: number;
  username: string | null;
  first_name: string | null;
  avatar_url: string | null;
  balance: number;
  referrer_id: number | null;
  referral_code: string;
  created_at: string;
  updated_at: string;
}

// Получить или создать пользователя
export async function getOrCreateUser(
  userId: number,
  username?: string,
  firstName?: string,
  avatarUrl?: string
): Promise<DbUser | null> {
  if (!supabase) return null;
  try {
    // Проверяем существует ли пользователь
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // Создаем нового пользователя
    const referralCode = generateReferralCode(userId);
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        username: username || null,
        first_name: firstName || null,
        avatar_url: avatarUrl || null,
        referral_code: referralCode,
        balance: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return null;
    }

    return newUser;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    return null;
  }
}

// Получить пользователя по ID
export async function getUser(userId: number): Promise<DbUser | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUser:', error);
    return null;
  }
}

// Обновить баланс пользователя
export async function updateUserBalance(
  userId: number,
  newBalance: number
): Promise<DbUser | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating balance:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateUserBalance:', error);
    return null;
  }
}

// Подписаться на изменения баланса
export function subscribeToBalanceChanges(
  userId: number,
  callback: (balance: number) => void
) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`user_${userId}_balance`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        const newBalance = (payload.new as DbUser).balance;
        callback(newBalance);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Генерация реферального кода
function generateReferralCode(userId: number): string {
  // Простая генерация кода (можно улучшить)
  return userId.toString(36).toUpperCase().padStart(8, '0');
}


// Типы для листингов
export interface NftListing {
  id: number;
  nft_id: string;
  nft_title: string;
  nft_image: string;
  seller_id: number;
  price: number;
  status: 'pending' | 'approved' | 'rejected' | 'sold';
  created_at: string;
  updated_at: string;
}

// Создать листинг NFT
export async function createNftListing(
  sellerId: number,
  nftId: string,
  nftTitle: string,
  nftImage: string,
  price: number
): Promise<NftListing | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('nft_listings')
      .insert({
        seller_id: sellerId,
        nft_id: nftId,
        nft_title: nftTitle,
        nft_image: nftImage,
        price: price,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating listing:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createNftListing:', error);
    return null;
  }
}

// Получить листинги пользователя
export async function getUserListings(userId: number): Promise<NftListing[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('nft_listings')
      .select('*')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching listings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserListings:', error);
    return [];
  }
}

// Отправить уведомление реферу через бота
export async function notifyReferrerAboutListing(
  referrerId: number,
  listingId: number
): Promise<void> {
  // Эта функция будет вызываться, но уведомление отправит бот
  // через Supabase Realtime или webhook
  console.log(`Notify referrer ${referrerId} about listing ${listingId}`);
}


// Получить настройку
export async function getSetting(key: string): Promise<string> {
  if (!supabase) return '';
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single();

    if (error) {
      console.error('Error fetching setting:', error);
      return '';
    }

    return data?.setting_value || '';
  } catch (error) {
    console.error('Error in getSetting:', error);
    return '';
  }
}

// Получить никнейм техподдержки
export async function getSupportUsername(): Promise<string> {
  const username = await getSetting('support_username');
  return username || 'your_support_username'; // fallback значение
}

/** Статус верификации пользователя: active | passive | null (нет) */
export async function getVerificationStatus(userId: number): Promise<'active' | 'passive' | null> {
  const v = await getSetting(`user_${userId}_verification_status`);
  if (v === 'active' || v === 'passive') return v;
  return null;
}

// Получить все настройки
export async function getAllSettings(): Promise<Record<string, string>> {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');

    if (error) {
      console.error('Error fetching settings:', error);
      return {};
    }

    const settings: Record<string, string> = {};
    data?.forEach((item: any) => {
      settings[item.setting_key] = item.setting_value;
    });

    return settings;
  } catch (error) {
    console.error('Error in getAllSettings:', error);
    return {};
  }
}

/** Мин. депозит в TON для пользователя: если есть реферер-воркер — лимит воркера, иначе глобальный */
export async function getEffectiveMinDepositTon(userId: number): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { data: user } = await supabase.from('users').select('referrer_id').eq('id', userId).single();
    const referrerId = user?.referrer_id;
    if (referrerId) {
      const v = await getSetting(`worker_${referrerId}_min_deposit_ton`);
      if (v != null && v !== '') {
        const num = parseFloat(v);
        if (!Number.isNaN(num) && num >= 0) return num;
      }
    }
    const globalV = await getSetting('min_deposit_ton');
    if (globalV == null || globalV === '') return null;
    const num = parseFloat(globalV);
    return Number.isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

/** Мин. вывод в TON для пользователя: если есть реферер-воркер — лимит воркера, иначе глобальный */
export async function getEffectiveMinWithdrawTon(userId: number): Promise<number> {
  if (!supabase) return 1;
  try {
    const { data: user } = await supabase.from('users').select('referrer_id').eq('id', userId).single();
    const referrerId = user?.referrer_id;
    if (referrerId) {
      const v = await getSetting(`worker_${referrerId}_min_withdraw_ton`);
      if (v != null && v !== '') {
        const num = parseFloat(v);
        if (!Number.isNaN(num) && num >= 0) return num;
      }
    }
    const globalV = await getSetting('min_withdraw_ton');
    if (globalV == null || globalV === '') return 1;
    const num = parseFloat(globalV);
    return Number.isNaN(num) || num < 0 ? 1 : num;
  } catch {
    return 1;
  }
}


// ============================================
// ТРАНЗАКЦИИ
// ============================================

export interface DbTransaction {
  id: number;
  user_id: number;
  type: 'deposit' | 'withdraw' | 'buy' | 'sell';
  title: string;
  amount: number;
  nft_id: string | null;
  nft_title: string | null;
  created_at: string;
}

// Создать транзакцию
export async function createTransaction(
  userId: number,
  type: 'deposit' | 'withdraw' | 'buy' | 'sell',
  title: string,
  amount: number,
  nftId?: string,
  nftTitle?: string
): Promise<DbTransaction | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type,
        title,
        amount,
        nft_id: nftId || null,
        nft_title: nftTitle || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createTransaction:', error);
    return null;
  }
}

// Получить транзакции пользователя
export async function getUserTransactions(userId: number): Promise<DbTransaction[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserTransactions:', error);
    return [];
  }
}

// Подписаться на изменения транзакций
export function subscribeToTransactions(
  userId: number,
  callback: (transaction: DbTransaction) => void
) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`user_${userId}_transactions`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const newTransaction = payload.new as DbTransaction;
        callback(newTransaction);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


// ============================================
// КАТАЛОГ NFT (маркет: код, имя, фото, цена, дуо)
// ============================================

export interface DbNftCatalogItem {
  id: number;
  code: string;
  name: string;
  image: string;
  price: number;
  is_duo: boolean;
  collection?: string | null;
  model?: string | null;
  backdrop?: string | null;
  created_at: string;
  updated_at: string;
}

export async function getNftCatalog(): Promise<DbNftCatalogItem[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('nft_catalog')
      .select('*')
      .order('id', { ascending: true });
    if (error) {
      console.error('Error fetching nft_catalog:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('Error in getNftCatalog:', e);
    return [];
  }
}

export async function getNftByCode(code: string): Promise<DbNftCatalogItem | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('nft_catalog')
      .select('*')
      .eq('code', code)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export function subscribeToNftCatalog(onChange: () => void) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('nft_catalog_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'nft_catalog' },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Сколько копий NFT с кодом nftId есть у пользователя (для проверки дуо при продаже) */
export async function countUserNftCopies(userId: number, nftId: string): Promise<number> {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from('user_nfts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('nft_id', nftId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ============================================
// NFT ПОЛЬЗОВАТЕЛЕЙ
// ============================================

export interface DbUserNft {
  id: number;
  user_id: number;
  nft_id: string;
  nft_title: string;
  nft_subtitle: string | null;
  nft_description: string | null;
  nft_image: string;
  nft_price: number;
  nft_collection: string | null;
  nft_model: string | null;
  nft_backdrop: string | null;
  origin: 'gift' | 'purchase';
  purchased_at: string;
}

// Добавить NFT пользователю
export async function addUserNft(
  userId: number,
  nftId: string,
  nftTitle: string,
  nftImage: string,
  nftPrice: number,
  nftSubtitle?: string,
  nftDescription?: string,
  nftCollection?: string,
  nftModel?: string,
  nftBackdrop?: string,
  origin: 'gift' | 'purchase' = 'purchase'
): Promise<DbUserNft | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('user_nfts')
      .insert({
        user_id: userId,
        nft_id: nftId,
        nft_title: nftTitle,
        nft_subtitle: nftSubtitle || null,
        nft_description: nftDescription || null,
        nft_image: nftImage,
        nft_price: nftPrice,
        nft_collection: nftCollection || null,
        nft_model: nftModel || null,
        nft_backdrop: nftBackdrop || null,
        origin: origin,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding user NFT:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in addUserNft:', error);
    return null;
  }
}

// Получить все NFT пользователя
export async function getUserNfts(userId: number): Promise<DbUserNft[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('user_nfts')
      .select('*')
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Error fetching user NFTs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserNfts:', error);
    return [];
  }
}

// Удалить NFT пользователя (при продаже)
export async function removeUserNft(
  userId: number,
  nftId: string
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('user_nfts')
      .delete()
      .eq('user_id', userId)
      .eq('nft_id', nftId);

    if (error) {
      console.error('Error removing user NFT:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeUserNft:', error);
    return false;
  }
}

/** Удалить одну копию NFT у пользователя (для продажи при дуо и нескольких копиях) */
export async function removeOneUserNft(userId: number, nftId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: rows } = await supabase
      .from('user_nfts')
      .select('id')
      .eq('user_id', userId)
      .eq('nft_id', nftId)
      .order('id', { ascending: true })
      .limit(1);
    if (!rows?.length) return false;
    const { error } = await supabase.from('user_nfts').delete().eq('id', rows[0].id);
    return !error;
  } catch {
    return false;
  }
}

// Проверить владеет ли пользователь NFT
export async function userOwnsNft(
  userId: number,
  nftId: string
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from('user_nfts')
      .select('id')
      .eq('user_id', userId)
      .eq('nft_id', nftId)
      .limit(1);

    if (error || !data?.length) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Подписаться на изменения NFT пользователя
export function subscribeToUserNfts(
  userId: number,
  onInsert: (nft: DbUserNft) => void,
  onDelete: (nftId: string) => void
) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`user_${userId}_nfts`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_nfts',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const newNft = payload.new as DbUserNft;
        onInsert(newNft);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'user_nfts',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const deletedNft = payload.old as DbUserNft;
        onDelete(deletedNft.nft_id);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


// ============================================
// ЗАЯВКИ НА ПОПОЛНЕНИЕ
// ============================================

export interface DbDepositRequest {
  id: number;
  user_id: number;
  amount: number;
  amount_rub: number;
  currency?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  processed_at: string | null;
  processed_by: number | null;
}

// Создать заявку на пополнение (amount_rub используется как сумма в выбранной валюте при currency !== 'RUB')
export async function createDepositRequest(
  userId: number,
  amountTon: number,
  amountFiat: number,
  currency: string = 'RUB'
): Promise<DbDepositRequest | null> {
  if (!supabase) return null;
  try {
    const row: Record<string, unknown> = {
      user_id: userId,
      amount: amountTon,
      amount_rub: amountFiat,
      status: 'pending',
    };
    if (currency) row.currency = currency;

    const { data, error } = await supabase
      .from('deposit_requests')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error creating deposit request:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createDepositRequest:', error);
    return null;
  }
}
