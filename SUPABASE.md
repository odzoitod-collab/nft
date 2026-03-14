# Supabase: Ethos Gallery

Реквизиты, баланс, ник пользователя и ник техподдержки берутся из Supabase.

## Шаги

1. **Создай проект** на [supabase.com](https://supabase.com) → New Project.

2. **Схема и RLS**  
   В дашборде: **SQL Editor** → New query.  
   Скопируй содержимое файла `supabase/schema.sql` (таблицы `users`, `system_settings`, `transactions`, `nft_listings`, `user_nfts`, `nft_catalog`, `deposit_requests`, RLS, Realtime).

3. **Каталог NFT**  
   Маркет берёт NFT из таблицы **nft_catalog**. Добавь записи вручную (Table Editor или API): поля `code` (уникальный код), `name`, `image` (URL картинки), `price` (в TON), `is_duo` (false по умолчанию; если true — для продажи нужна пара из 2 таких NFT).

4. **Начальные настройки**  
   В том же SQL Editor выполни `supabase/seed.sql`.  
   Затем в таблице **Table Editor → system_settings** задай:
   - `support_username` — ник техподдержки (например `@support_bot`).
   - Реквизиты по странам: `requisites_ua_card_number`, `requisites_ua_bank`, `requisites_ua_card_holder` и аналогично для `pl`, `ru`, `kz`, `eu`.

5. **Переменные окружения**  
   Скопируй `portalWEB/.env.example` в `.env` и подставь:
   - **VITE_SUPABASE_URL** — из Supabase: Settings → API → Project URL.
   - **VITE_SUPABASE_ANON_KEY** — из Settings → API → anon public.

## Откуда что берётся

| Данные              | Источник                                      |
|---------------------|-----------------------------------------------|
| Баланс, ник юзера   | Таблица `users` (поля `balance`, `username`, `first_name`) |
| Ник техподдержки    | `system_settings.setting_key = 'support_username'`         |
| Реквизиты по стране | `system_settings`: ключи `requisites_{ua|pl|ru|kz|eu}_card_number`, `_bank`, `_card_holder` |
| Каталог NFT (маркет) | Таблица `nft_catalog`: `code`, `name`, `image`, `price`, `is_duo`. Сайт и бот читают/обновляют; Realtime обновляет маркет в реальном времени. |

В таблице `user_nfts` снято ограничение «один NFT одного типа на пользователя»: реферал может иметь несколько копий одного NFT (для дуо-токенов).

Ключи реквизитов задаёт `getRequisitesKeys(countryId)` в `services/tonRates.ts`. Загрузка настроек — `getAllSettings()` и `getSupportUsername()` в `services/supabaseClient.ts`.

## Realtime

Подписки на обновления баланса, транзакций, NFT и **каталога NFT** работают через Supabase Realtime (таблицы `users`, `transactions`, `user_nfts`, `nft_catalog`). Если после выполнения `schema.sql` подписки не срабатывают, проверь **Database → Replication**: в публикации `supabase_realtime` должны быть эти таблицы.
