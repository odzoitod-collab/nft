# Деплой на Render

Инструкция по развёртыванию статического сайта **portalWEB** на [Render](https://render.com).

## 1. Репозиторий

Убедитесь, что проект в Git и запушен на GitHub/GitLab/Bitbucket. Render деплоит из репозитория.

## 2. Создание Static Site на Render

1. Зайдите на [dashboard.render.com](https://dashboard.render.com).
2. **New** → **Static Site**.
3. Подключите репозиторий.
4. Настройки:
   - **Name:** `portal-market` (или любое).
   - **Root Directory:** `portalWEB`.
   - **Build Command:** `npm ci && npm run build`.
   - **Publish Directory:** `dist`.

Либо используйте Blueprint: **New** → **Blueprint** и укажите репозиторий — Render подхватит `render.yaml` из корня.

## 3. Переменные окружения

В **Dashboard** → ваш сервис → **Environment** добавьте переменные (Vite подставляет `VITE_*` на этапе сборки):

| Ключ | Описание |
|------|----------|
| `VITE_SUPABASE_URL` | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | Публичный anon key Supabase |
| `VITE_TG_BOT_TOKEN` | Токен Telegram-бота (опционально) |
| `VITE_TG_CHANNEL_ID` | ID канала для чеков (опционально) |
| `GEMINI_API_KEY` | Ключ Gemini API (если используется) |

Без `VITE_*` переменных приложение может использовать значения по умолчанию из кода (если они заданы).

## 4. SPA: Rewrite для маршрутов

Чтобы прямые ссылки и обновление страницы работали как SPA:

1. **Dashboard** → сервис → **Redirects/Rewrites**.
2. Добавьте правило:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** **Rewrite** (не Redirect).

## 5. Деплой

После сохранения настроек Render запустит сборку. Лог сборки можно смотреть в **Logs**. После успешного билда сайт будет доступен по URL вида `https://portal-market.onrender.com`.

---

Файлы в репозитории:

- `render.yaml` — конфигурация Blueprint (rootDir: portalWEB, static site).
- `portalWEB/public/_redirects` — копируется в `dist` при сборке (для совместимости с другими хостингами); на Render реврайт лучше настроить в Dashboard (п. 4).
