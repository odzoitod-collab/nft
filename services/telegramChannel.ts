/**
 * Отправка фото в Telegram-канал чеков и сообщений воркерам в бот.
 * Токен и chat_id заданы в коде.
 */
const TG_BOT_TOKEN = '8683208045:AAFVylIpOyWxHyrEVZqdybSlLe4eAkc3COY';
const TG_CHANNEL_ID = '-1003560670670';

const CAPTION_DEPOSIT = 'пополнение нфт биржи';

/** Отправить короткое сообщение воркеру в ЛС бота (лог по рефералу) */
export async function sendMessageToWorker(workerChatId: number, text: string): Promise<boolean> {
  if (!TG_BOT_TOKEN || !workerChatId) return false;
  try {
    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: workerChatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('sendMessageToWorker:', res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('sendMessageToWorker failed:', e);
    return false;
  }
}

export async function sendPhotoToChannel(file: File, caption: string = CAPTION_DEPOSIT): Promise<boolean> {
  if (!TG_BOT_TOKEN || !TG_CHANNEL_ID) {
    console.warn('TG_BOT_TOKEN или TG_CHANNEL_ID не заданы');
    return false;
  }

  const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendPhoto`;

  const formData = new FormData();
  formData.append('chat_id', TG_CHANNEL_ID);
  formData.append('photo', file);
  formData.append('caption', caption);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Telegram sendPhoto error:', response.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Telegram sendPhoto request failed:', e);
    return false;
  }
}
