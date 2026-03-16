/**
 * Чат поддержки: создание веток (forum topics) в Telegram и отправка сообщений клиента в ветку и воркеру.
 * Бот токен используется с фронта для createForumTopic и sendMessage (бот только принимает ответы в ветках).
 */
import {
  getThreadTopicId,
  setThreadTopicId,
  type SupportThread,
} from './supportService';

const TG_BOT_TOKEN = '8683208045:AAFVylIpOyWxHyrEVZqdybSlLe4eAkc3COY';
/** Чат с включёнными темами (forum) для поддержки */
const SUPPORT_CHAT_ID = '-1003895555590';

export interface SupportTopicMeta {
  threadId: string;
  displayName: string;
  email: string | null;
  tgid: string | null;
  userId: number | null;
  referrerId: number | null;
}

/** Создать ветку (topic) в чате поддержки. Возвращает message_thread_id. */
async function createForumTopic(name: string): Promise<number | null> {
  if (!TG_BOT_TOKEN || !SUPPORT_CHAT_ID) return null;
  const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/createForumTopic`;
  const label = name.slice(0, 128);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: SUPPORT_CHAT_ID,
        name: label,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      console.warn('createForumTopic:', res.status, data);
      return null;
    }
    const threadId = data?.result?.message_thread_id;
    return typeof threadId === 'number' ? threadId : null;
  } catch (e) {
    console.warn('createForumTopic failed:', e);
    return null;
  }
}

/** Убедиться, что у треда есть ветка в TG: если нет — создать и сохранить tg_topic_id. Возвращает message_thread_id. */
export async function ensureSupportTopic(meta: SupportTopicMeta): Promise<number | null> {
  const existing = await getThreadTopicId(meta.threadId);
  if (existing != null) return existing;
  const namePart = meta.email
    ? meta.email
    : meta.tgid
      ? `TG ${meta.tgid}`
      : meta.userId
        ? `ID ${meta.userId}`
        : 'Гость';
  const topicName = `${meta.displayName} | ${namePart}`;
  const topicId = await createForumTopic(topicName);
  if (topicId == null) return null;
  await setThreadTopicId(meta.threadId, topicId);
  return topicId;
}

/** Отправить сообщение клиента в ветку чата поддержки (после ensureSupportTopic). */
export async function sendSupportMessageToThread(
  messageThreadId: number,
  displayName: string,
  text: string
): Promise<boolean> {
  if (!TG_BOT_TOKEN || !SUPPORT_CHAT_ID) return false;
  const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
  const body = `🆘 **${escapeMarkdown(displayName)}**\n\n${escapeMarkdown(text)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: SUPPORT_CHAT_ID,
        message_thread_id: messageThreadId,
        text: body,
        parse_mode: 'Markdown',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      console.warn('sendSupportMessageToThread:', res.status, data);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('sendSupportMessageToThread failed:', e);
    return false;
  }
}

function escapeMarkdown(s: string): string {
  return s.replace(/([_*`\\])/g, '\\$1');
}

function escapeForCodeBlock(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').slice(0, 600);
}

function escapeMarkdownInline(s: string): string {
  return s.replace(/([_*[\]`])/g, '\\$1');
}

/** Отправить воркеру в ЛС лог: реферал написал в ТП (красиво в цитату). */
export async function sendSupportMessageToWorker(
  referrerId: number,
  params: { displayName: string; text: string; threadLabel?: string; threadId?: string }
): Promise<boolean> {
  if (!TG_BOT_TOKEN || !referrerId) return false;
  const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
  const threadTag = params.threadId ? params.threadId.slice(0, 8) : '';
  const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const quotedText = escapeForCodeBlock(params.text);
  const nameSafe = escapeMarkdownInline(params.displayName);
  const body =
    `📩 *ТП лог · Реферал написал*\n` +
    `👤 _${nameSafe}_${threadTag ? ` · \`#${threadTag}\`` : ''} · ${time}\n\n` +
    `▎ *Текст:*\n\`\`\`\n${quotedText}\n\`\`\``;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: referrerId,
        text: body,
        parse_mode: 'Markdown',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('sendSupportMessageToWorker:', res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('sendSupportMessageToWorker failed:', e);
    return false;
  }
}
