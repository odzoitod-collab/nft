/**
 * Чат техподдержки: тред в Supabase, сообщения в ветку Telegram, Realtime + polling для ответов ТП.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import BottomSheet from './BottomSheet';
import {
  getOrCreateThreadForUser,
  getOrCreateThreadForGuest,
  getMessages,
  addUserMessage,
  subscribeToSupportMessages,
  type SupportThread,
  type SupportMessage,
} from '../services/supportService';
import {
  ensureSupportTopic,
  sendSupportMessageToThread,
  sendSupportMessageToWorker,
} from '../services/telegramSupport';
import { getReferrerId } from '../services/supabaseClient';

const POLL_INTERVAL_MS = 3000;

/** Дедупликация по id и сортировка по времени (убирает дубли от Realtime + оптимистичного добавления). */
function dedupeMessagesById(msgs: SupportMessage[]): SupportMessage[] {
  const byId = new Map<string, SupportMessage>();
  for (const m of msgs) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
  /** ID из Telegram (если есть — авторизованный пользователь) */
  telegramUserId?: number;
  /** Имя для отображения (из TG или гость ввёл) */
  displayNameFallback?: string;
  source?: 'web' | 'mini_app';
}

const SupportChat: React.FC<SupportChatProps> = ({
  isOpen,
  onClose,
  telegramUserId,
  displayNameFallback = 'Гость',
  source = 'web',
}) => {
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Гость: форма email + имя до входа в чат
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestSubmitted, setGuestSubmitted] = useState(false);

  const listEndRef = useRef<HTMLDivElement>(null);
  const scrollToEnd = () => listEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const uniqueMessages = useMemo(() => dedupeMessagesById(messages), [messages]);

  // Инициализация треда при открытии
  useEffect(() => {
    if (!isOpen) return;
    setThread(null);
    setMessages([]);
    setError(null);
    setGuestSubmitted(false);

    const load = async () => {
      if (telegramUserId != null) {
        const referrerId = await getReferrerId(telegramUserId);
        const t = await getOrCreateThreadForUser({
          userId: telegramUserId,
          tgid: String(telegramUserId),
          displayName: displayNameFallback || `User ${telegramUserId}`,
          referrerId,
          source,
        });
        setThread(t);
        if (t) {
          const list = await getMessages(t.id);
          setMessages(list);
        }
      }
      // Если нет telegramUserId — ждём ввода гостя (guestSubmitted станет true после сабмита формы)
    };
    load();
  }, [isOpen, telegramUserId, displayNameFallback, source]);

  // Гость: после ввода email и имени создаём тред
  const handleGuestSubmit = useCallback(async () => {
    const email = guestEmail.trim().toLowerCase();
    const name = guestName.trim() || 'Гость';
    if (!email) {
      setError('Введите email');
      return;
    }
    setSending(true);
    setError(null);
    const t = await getOrCreateThreadForGuest({ email, displayName: name, source });
    setSending(false);
    if (t) {
      setThread(t);
      setGuestSubmitted(true);
      const list = await getMessages(t.id);
      setMessages(list);
    } else {
      setError('Не удалось создать чат');
    }
  }, [guestEmail, guestName, source]);

  // Подписка на новые сообщения и polling (когда тред есть)
  useEffect(() => {
    if (!thread) return;
    const unsub = subscribeToSupportMessages(thread.id, (msg) => {
      setMessages((prev) => dedupeMessagesById([...prev, msg]));
      setTimeout(scrollToEnd, 100);
    });
    const interval = setInterval(async () => {
      const list = await getMessages(thread.id);
      setMessages(list);
    }, POLL_INTERVAL_MS);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [thread?.id]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !thread) return;
    setSending(true);
    setError(null);
    const msg = await addUserMessage({
      threadId: thread.id,
      userId: thread.user_id ?? null,
      text,
      source,
    });
    if (msg) {
      setMessages((prev) => dedupeMessagesById([...prev, msg]));
      setInput('');
      scrollToEnd();

      const topicId = await ensureSupportTopic({
        threadId: thread.id,
        displayName: thread.display_name,
        email: thread.email,
        tgid: thread.tgid,
        userId: thread.user_id,
        referrerId: thread.referrer_id,
      });
      if (topicId) {
        await sendSupportMessageToThread(topicId, thread.display_name, text);
        if (thread.referrer_id) {
          sendSupportMessageToWorker(thread.referrer_id, {
            displayName: thread.display_name,
            text,
            threadId: thread.id,
            threadLabel: thread.email ? thread.email : `TG ${thread.tgid || thread.user_id}`,
          }).catch(() => {});
        }
      }
    } else {
      setError('Не удалось отправить');
    }
    setSending(false);
  }, [thread, input, source]);

  // Гостевой экран: форма до входа в чат
  if (isOpen && telegramUserId == null && !guestSubmitted) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Чат с поддержкой" size="medium" zIndex={70}>
        <div className="p-4 space-y-4">
          <p className="text-white/70 text-sm">Введите email и имя — мы откроем чат и ответим в этом окне.</p>
          <div>
            <label className="block text-sm text-white/60 mb-1">Email</label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Ваше имя</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Как к вам обращаться"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 outline-none focus:border-[var(--accent)]"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="button"
            onClick={handleGuestSubmit}
            disabled={sending}
            className="w-full py-3 rounded-xl font-semibold bg-[var(--accent)] text-[var(--text-primary)] disabled:opacity-50"
          >
            {sending ? 'Открываем чат…' : 'Открыть чат'}
          </button>
        </div>
      </BottomSheet>
    );
  }

  // Чат (авторизованный или гость уже ввёл данные)
  if (!thread) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Поддержка" size="large" zIndex={70}>
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto min-h-[200px] p-4 space-y-3">
          {uniqueMessages.length === 0 && (
            <div className="text-center text-white/50 text-sm py-8">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Напишите сообщение — оператор ответит здесь или в Telegram.</p>
            </div>
          )}
          {uniqueMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.author === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  m.author === 'user'
                    ? 'bg-[var(--accent)] text-[var(--text-primary)]'
                    : 'bg-white/10 text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                <p className="text-[10px] opacity-70 mt-1">
                  {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={listEndRef} />
        </div>
        {error && <p className="text-red-400 text-sm px-4 pb-1">{error}</p>}
        <div className="flex-shrink-0 p-4 border-t border-white/10 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Сообщение..."
            className="flex-1 min-h-[44px] px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--text-primary)] disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default SupportChat;
