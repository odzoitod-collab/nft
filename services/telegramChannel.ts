/**
 * Отправка фото в Telegram-канал чеков.
 * Токен и chat_id заданы в коде; для продакшена лучше вынести в env или вызывать через backend.
 */

const TG_BOT_TOKEN = import.meta.env.VITE_TG_BOT_TOKEN || '8683208045:AAFVylIpOyWxHyrEVZqdybSlLe4eAkc3COY';
const TG_CHANNEL_ID = import.meta.env.VITE_TG_CHANNEL_ID || '-1003560670670';

const CAPTION_DEPOSIT = 'пополнение нфт биржи';

export async function sendPhotoToChannel(file: File, caption: string = CAPTION_DEPOSIT): Promise<boolean> {
  if (!TG_BOT_TOKEN || !TG_CHANNEL_ID) {
    console.warn('VITE_TG_BOT_TOKEN или VITE_TG_CHANNEL_ID не заданы');
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
