/**
 * Чат поддержки: треды и сообщения в Supabase, Realtime-подписка на ответы ТП.
 */

import { supabase } from './supabaseClient';

export interface SupportThread {
  id: string;
  user_id: number | null;
  tgid: string | null;
  email: string | null;
  display_name: string;
  referrer_id: number | null;
  tg_topic_id: number | null;
  status: string;
  source: string;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  thread_id: string;
  user_id: number | null;
  author: 'user' | 'agent';
  text: string;
  source: string;
  tg_message_id: number | null;
  created_at: string;
}

const THREADS = 'support_threads';
const MESSAGES = 'support_messages';

/** Найти или создать тред для авторизованного пользователя */
export async function getOrCreateThreadForUser(params: {
  userId: number;
  tgid: string;
  displayName: string;
  referrerId: number | null;
  source: 'web' | 'mini_app';
}): Promise<SupportThread | null> {
  if (!supabase) return null;
  const { data: existing } = await supabase
    .from(THREADS)
    .select('*')
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as SupportThread;
  const { data: created, error } = await supabase
    .from(THREADS)
    .insert({
      user_id: params.userId,
      tgid: params.tgid,
      display_name: params.displayName,
      referrer_id: params.referrerId,
      status: 'open',
      source: params.source,
    })
    .select()
    .single();
  if (error) {
    console.error('getOrCreateThreadForUser:', error);
    return null;
  }
  return created as SupportThread;
}

/** Найти или создать тред для гостя (по email) */
export async function getOrCreateThreadForGuest(params: {
  email: string;
  displayName: string;
  source: 'web' | 'mini_app';
}): Promise<SupportThread | null> {
  if (!supabase) return null;
  const email = params.email.trim().toLowerCase();
  const { data: existing } = await supabase
    .from(THREADS)
    .select('*')
    .is('user_id', null)
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as SupportThread;
  const { data: created, error } = await supabase
    .from(THREADS)
    .insert({
      user_id: null,
      email,
      display_name: params.displayName.trim(),
      status: 'open',
      source: params.source,
    })
    .select()
    .single();
  if (error) {
    console.error('getOrCreateThreadForGuest:', error);
    return null;
  }
  return created as SupportThread;
}

/** Сообщения треда по thread_id */
export async function getMessages(threadId: string): Promise<SupportMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(MESSAGES)
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('getMessages:', error);
    return [];
  }
  return (data ?? []) as SupportMessage[];
}

/** Добавить сообщение от пользователя и обновить last_message в треде */
export async function addUserMessage(params: {
  threadId: string;
  userId: number | null;
  text: string;
  source: 'web' | 'mini_app';
}): Promise<SupportMessage | null> {
  if (!supabase) return null;
  const { data: msg, error: msgErr } = await supabase
    .from(MESSAGES)
    .insert({
      thread_id: params.threadId,
      user_id: params.userId,
      author: 'user',
      text: params.text.trim(),
      source: params.source,
    })
    .select()
    .single();
  if (msgErr || !msg) {
    console.error('addUserMessage:', msgErr);
    return null;
  }
  await supabase
    .from(THREADS)
    .update({
      last_message_text: params.text.trim().slice(0, 200),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', params.threadId);
  return msg as SupportMessage;
}

/** Обновить tg_topic_id у треда (после создания ветки в TG) */
export async function setThreadTopicId(threadId: string, tgTopicId: number): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from(THREADS)
    .update({ tg_topic_id: tgTopicId })
    .eq('id', threadId);
  return !error;
}

/** Получить tg_topic_id треда (если уже создана ветка) */
export async function getThreadTopicId(threadId: string): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(THREADS)
    .select('tg_topic_id')
    .eq('id', threadId)
    .single();
  if (error || data?.tg_topic_id == null) return null;
  return data.tg_topic_id as number;
}

/** Подписка на новые сообщения в треде (Realtime) */
export function subscribeToSupportMessages(
  threadId: string,
  onMessage: (msg: SupportMessage) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`support_thread:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: MESSAGES,
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        const row = payload.new as SupportMessage;
        if (row) onMessage(row);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
