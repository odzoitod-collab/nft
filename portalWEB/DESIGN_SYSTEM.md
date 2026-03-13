# Дизайн-система Ethos Gallery

Токены подключены в `public/index.css` (:root) и в `index.html` (Tailwind theme). Используй их везде вместо произвольных цветов и радиусов.

## Цвета (Tailwind классы)

| Токен           | CSS-переменная   | Tailwind классы (примеры)        |
|-----------------|------------------|-----------------------------------|
| Фон приложения  | --bg-primary     | `bg-tg-bg`                        |
| Карточки, шиты  | --bg-card        | `bg-tg-card`                      |
| Приподнятые     | --bg-raised      | `bg-tg-elevated`                  |
| Поля ввода      | --bg-input       | `bg-tg-input`                     |
| Акцент          | --accent         | `bg-tg-button`, `text-tg-button` |
| Акцент hover    | --accent-hover   | `hover:bg-tg-button-hover`        |
| Текст основной  | --text-primary   | `text-white` / `text-tg-text`     |
| Текст вторичный | --text-secondary | `text-tg-hint`                    |
| Текст третичный | --text-tertiary  | `text-tg-tertiary`                |
| Граница тонкая  | --border-subtle  | `border-tg-border-subtle`         |
| Граница обычная | --border-default | `border-tg-border-default`        |
| Граница активная| --border-active  | `border-tg-border-active`         |
| Опасность       | --danger         | `text-tg-danger`, `bg-tg-danger`  |
| Успех           | --success        | `text-tg-success`, `bg-tg-success`|
| Предупреждение  | --warning        | `text-tg-warning`, `bg-tg-warning`|

## Радиусы

| Токен   | Переменная   | Tailwind      | Назначение              |
|---------|--------------|---------------|-------------------------|
| sm      | --radius-sm  | `rounded-sm`  | 8px — инпуты, мелочь     |
| md      | --radius-md  | `rounded-md`  | 12px — карточки NFT, кнопки |
| lg      | --radius-lg  | `rounded-lg`  | 16px — шиты, модалки    |
| xl      | --radius-xl  | `rounded-xl`  | 20px — крупные блоки     |

В Tailwind по умолчанию `rounded` = 4px; для карточек и кнопок используй `rounded-md` (12px), для шитов — `rounded-lg` / `rounded-t-xl`.

## Типографика

- **Шрифт:** `font-sans` (-apple-system, Segoe UI, Roboto, sans-serif).
- **Размеры:** `text-display` (28px), `text-title` (20px), `text-body` (17px), `text-sub` (15px), `text-caption` (13px), `text-micro` (11px).
- **Веса:** `font-bold` (700), `font-semibold` (600), `font-medium` (500), `font-normal` (400).

## Отступы

- Экран по горизонтали: `px-4` (16px) или `px-screen-x` если добавить в theme.
- Между секциями: `mb-section` / `gap-section` (24px) — в theme как `spacing.section`.
- Внутри карточки: `p-card` (12px).
- Между элементами в строке: `gap-2` (8px) или `gap-item-lg` (12px).

В Tailwind уже добавлены: `spacing.screen-x` (16px), `section` (24px), `card` (12px), `item` (8px), `item-lg` (12px). Пример: `px-screen-x`, `mb-section`, `p-card`, `gap-item-lg`.

---

## Лейаут и навигация

### Контейнер приложения

- `max-width: 448px`, `margin: 0 auto` (в коде: `max-w-md mx-auto`).
- `min-height: 100vh` и `min-height: 100dvh` (мобильные браузеры).
- `overflow: hidden`, `background: var(--bg-primary)`.

### Хедер экрана (фиксированный)

- `position: sticky`, `top: 0`, высота **56px** (`h-14`).
- `padding-top: env(safe-area-inset-top)` — класс `pt-safe-top` в `index.css`.
- Фон: `rgba(10,10,11,0.85)`, `backdrop-filter: blur(20px) saturate(180%)`.
- `border-bottom: 1px solid var(--border-subtle)`.
- `z-index: 10`, горизонтальные отступы `16px` (`px-4`).

Компонент: `Header.tsx`.

### Bottom Navigation

- `position: fixed`, `bottom: 0`, `left: 0`, `right: 0`, `max-width: 448px`, `margin: 0 auto`.
- Высота **56px** (`h-14`), `padding-bottom: env(safe-area-inset-bottom)` — класс `pb-safe`.
- Фон: `rgba(10,10,11,0.92)`, `backdrop-filter: blur(20px)`, `border-top: var(--border-subtle)`.
- `z-index: 20`.

**Таб (каждый):** `flex: 1`, `flex-direction: column`, `align-items: center`, `gap: 3px`, `padding: 8px 0`, `cursor: pointer`. Иконка: **22px**, `stroke-width`: 1.5 (неактивный) / 2 (активный). Текст: **10px**, `font-weight: 500`. Неактивный: `color: var(--text-tertiary)`, активный: `color: var(--accent)`, `transform: scale(1.05)`, анимация **200ms** `var(--ease-spring)`.

Компонент: `BottomNav.tsx`.

### Контент экрана

- Обёртка с классом **`.screen-content`** (в `public/index.css`).
- `padding-bottom: calc(56px + env(safe-area-inset-bottom) + 8px)` — под навбар.
- `overflow-y: auto`, `-webkit-overflow-scrolling: touch`.
- На экранах с хедером первым ребёнком внутри `.screen-content` идёт `Header` (sticky).

### Скролл контента

- Скрытие scrollbar: в `.screen-content` заданы `::-webkit-scrollbar { display: none }` и `scrollbar-width: none` (Firefox).
- Нативный swipe-to-scroll не блокировать.

### Z-index слои (строго)

| Слой | Значение | Назначение            |
|------|----------|------------------------|
| Базовый контент | 1   | Контент страницы       |
| Sticky хедер     | 10  | `Header`               |
| Bottom Navigation| 20  | `BottomNav`            |
| Toast            | 30  | `ErrorToast`           |
| Backdrop         | 40  | Подложка шитов/модалок|
| Bottom sheet     | 50  | Панель шита, модалки   |
| Full-screen      | 60  | `FullScreenView`, оверлеи успеха |
| Preloader        | 100 | Заставка загрузки      |

---

## Единая система кнопок

Используй компоненты `Button` и `ButtonPair` из `components/Button.tsx` и `components/ButtonPair.tsx`.

### Варианты Button

| Вариант       | Назначение                    | Высота   | Стиль |
|---------------|--------------------------------|----------|--------|
| **primary**   | Одно основное действие на экран/шит | 52px     | accent, hover accent-hover, loading спиннер слева |
| **secondary** | «Назад», вторичное действие    | 52px     | transparent, border-default, hover bg white/5 |
| **destructive** | Только необратимые действия (продажа, удаление) | 52px | bg danger |
| **ghost**     | «Отмена» в диалогах           | auto, py-2 | text accent, hover opacity 75% |

Правила: один primary на экран/шит; в паре с primary всегда secondary той же высоты (52px); у всех кнопок active: scale(0.97), transition 80ms; disabled: opacity 0.45; при async — показывать loading (спиннер 20px слева от текста).

### Пара кнопок (ButtonPair)

Внизу шита/экрана: `flex row`, `gap 12px`, «Назад» = Secondary `flex: 1`, «Подтвердить» = Primary или Destructive `flex: 2`, `padding-bottom: max(24px, env(safe-area-inset-bottom))`.

Запрещено: разная высота кнопок в паре; разное соотношение ширин на разных экранах; кнопки без hover/active; кнопки без loading при async.

---

## Единый стандарт Bottom Sheet

Используй компонент `BottomSheet` из `components/BottomSheet.tsx` для всех шитов.

### Структура (одинакова для всех)

1. **Backdrop:** fixed inset-0, bg rgba(0,0,0,0.6), backdrop-filter blur(4px), z-index 40, клик → закрытие. Анимация opacity 0→1, 200ms ease-out.
2. **Контейнер:** fixed bottom-0, max-width 448px, margin auto, bg var(--bg-card), border-radius 20px 20px 0 0, border-top var(--border-subtle), z-index 50. Анимация translateY(100%)→0, 380ms cubic-bezier(0.16,1,0.3,1).
3. **Хэндл:** обязателен. 36×4px, bg var(--border-default), border-radius 2px, margin 12px auto 0.
4. **Хедер:** padding 20px 20px 16px, flex space-between. Заголовок 20px, font-weight 700. Кнопка закрытия справа: 32×32px, круг, bg rgba(255,255,255,0.08), иконка X 18px, hover bg 0.12.
5. **Контент:** padding 20px, overflow-y auto, flex 1.
6. **Футер:** padding 16px 20px, padding-bottom max(16px, env(safe-area-inset-bottom)+16px), border-top, bg var(--bg-card), sticky bottom. Сюда передаётся `footer` с кнопками (ButtonPair и т.д.).

### Размеры (prop `size`)

| size   | Высота    | Когда использовать                    |
|--------|-----------|----------------------------------------|
| small  | max-h 40vh | Подтверждение, предупреждение          |
| medium | h 65vh    | Формы, настройки                      |
| large  | h 85vh    | Кошелёк, история                      |
| auto   | max-h 90vh | По контенту, overflow-y auto          |

### Многошаговые шиты

- Заголовок меняется по шагу (`title` по step).
- «Назад» возвращает на предыдущий шаг (не закрывает шит).
- Крестик закрывает шит (при необходимости — confirm при введённых данных).
- Кнопки шага в `footer` (ButtonPair: Назад + Далее/Подтвердить).

---

## Full-screen экраны (NFTDetail и подобные)

Используй компонент `FullScreenView` из `components/FullScreenView.tsx`. Bottom Nav скрыт на full-screen (уже в App при `view === NFT_DETAIL`).

### Контейнер

- position: fixed, inset: 0, z-index: 60 (выше bottom sheet)
- background: var(--bg-primary), overflow-y: auto
- Анимация входа: translateY(24px) scale(0.97) opacity(0) → норма, 350ms cubic-bezier(0.16,1,0.3,1)
- Анимация выхода: норма → translateY(24px) scale(0.97) opacity(0), 250ms (при клике «Назад» вызывается после анимации)

### Sticky хедер

- position: sticky, top: 0, height: 56px
- padding-top: max(0, env(safe-area-inset-top))
- background: rgba(10,10,11,0.85), backdrop-filter: blur(20px) saturate(180%)
- border-bottom: 1px solid var(--border-subtle)
- flex, align-items: center, justify-content: space-between, px: 16px

Кнопка «Назад» (всегда слева): flex, gap 6px, h 36px, padding 0 12px, bg rgba(255,255,255,0.08), border-radius var(--radius-sm), иконка ChevronLeft 18px + текст «Назад» 15px font-weight 500, hover bg 0.12, active scale 0.96.

Баланс TON (справа, опционально): pill — bg rgba(0,145,255,0.15), border 1px solid rgba(0,145,255,0.3), border-radius 20px, padding 6px 12px, текст 15px font-weight 600 color accent. При передаче `onBalanceClick` pill кликабелен (например, открыть кошелёк).

### Footer full-screen

- position: sticky, bottom: 0
- padding: 16px, padding-bottom: max(16px, env(safe-area-inset-bottom) + 16px)
- background: rgba(10,10,11,0.9), backdrop-filter: blur(20px)
- border-top: 1px solid var(--border-subtle)
- Сюда передаётся `footer` с кнопками действий.

---

## Единая система анимаций

Токены в `:root` (index.css). Не используй анимации > 400ms.

### Кривые (easing)

| Переменная     | Значение                    | Назначение                    |
|----------------|-----------------------------|-------------------------------|
| --ease-spring  | cubic-bezier(0.16,1,0.3,1)  | основные UI переходы          |
| --ease-out     | cubic-bezier(0.25,0,0,1)   | выезд шитов                   |
| --ease-snap    | cubic-bezier(0.34,1.56,0.64,1) | кнопки, иконки (с отскоком) |

### Длительности (CSS-переменные)

- --duration-tap: 50ms — нажатие
- --duration-hover: 150ms — hover
- --duration-backdrop: 200ms — появление backdrop
- --duration-sheet-close: 250ms — закрытие шита/экрана
- --duration-sheet-open: 380ms — открытие шита
- --duration-fullscreen: 350ms — вход full-screen
- --duration-content: 400ms — смена контента внутри шита

### По типам

- **Кнопки:** класс `btn-transition` — active scale(0.97) 80ms, release 200ms --ease-spring.
- **Карточка NFT:** класс `nft-card-hover` — на десктопе hover: border --border-default 150ms, translateY(-2px) 200ms --ease-spring.
- **Bottom sheet:** открытие `.sheet-panel` — slideUp 380ms --ease-out; закрытие `.sheet-panel--closing` — slideDown 250ms ease-in, затем onClose (реализовано в компоненте BottomSheet).
- **Backdrop:** `.sheet-backdrop` — fadeIn 200ms ease-out.
- **Full-screen:** `.fullscreen-view` — screenIn 350ms --ease-spring; выход `.fullscreen-view--exiting` — 250ms ease-in.
- **Успех (покупка/продажа):** `.success-checkmark-circle` scale 0→1 300ms --ease-spring; галочка stroke 400ms delay 200ms; текст `.success-overlay-text` 300ms delay 400ms. Закрытие через 2000ms.
- **Табы (индикатор):** transform translateX, 250ms --ease-spring.
- **BottomNav смена вкладок:** только смена цвета 150ms, контент без анимации.
- **Спиннер:** класс `.animate-spin-slow` — круг 20×20px, border 2px, spin 0.8s linear infinite.
- **Скелетон:** класс `.skeleton` — shimmer 1.5s ease-in-out infinite (градиент по --bg-raised).

### Запрещено

- Анимации дольше 400ms (ощущается медленно).
- Тяжёлые анимации без `will-change: transform` где нужно.
- Одновременная анимация opacity и transform без GPU-слоя (добавляй `will-change: transform`).
- Резкое появление/исчезновение без transition.

---

## Состояния загрузки — единый стандарт

### 1. Preloader (первый запуск)

- Полноэкранный: `position: fixed`, `inset: 0`, `z-index: 100`, `background: var(--bg-primary)`.
- В центре: логотип Ethos (E в квадрате) + пульсирующий акцент (opacity 0.6→1, 1s infinite alternate).
- Под лого: прогресс-бар 120×2px, цвет accent, анимация 0→100%.
- Скрытие: класс `preloader-is-hidden` (opacity 0, 300ms), затем unmount через 500ms после `window.load`.

Компонент: `Preloader` (props: `visible`, `hiding`). В `index.tsx`: по `load` выставляется `hiding`, через 800ms — unmount.

### 2. Скелетоны

- Вместо карточек: те же сетка и размеры, блоки с классом `.skeleton` (shimmer).
- Маркет: `NFTSkeletonGrid` — 6 карточек (2×3).
- История: `HistorySkeletonList` — 4 строки.
- Цвета: `var(--bg-raised)` + highlight `rgba(255,255,255,0.04)` (в `.skeleton`).

Компоненты: `Skeleton.tsx` — `SkeletonBlock`, `SkeletonCard`, `NFTSkeletonGrid`, `SkeletonHistoryRow`, `HistorySkeletonList`.

### 3. Инлайн-спиннер (кнопки)

- В кнопке при `isLoading`: текст заменён на спиннер + текст.
- Спиннер: 20×20px, border 2px, `border-top: #fff`, остальное `rgba(255,255,255,0.2)`, `spin` 0.8s linear infinite.
- Кнопка: `disabled`, opacity не снижаем (оставляем 100% по стандарту).

Класс: `.animate-spin-slow`. В `Button` при loading добавляется `opacity-100`, чтобы не применять `disabled:opacity-45`.

### 4. Загрузка в шитах (курс, реквизиты)

- Строка: иконка загрузки (мини-спиннер 14px) + текст «Загрузка...».
- Цвет: `var(--text-secondary)`, размер 13px.

Компонент: `LoadingRow` (props: `text?`, `className?`). Класс спиннера: `.loading-spinner-inline`.

### 5. Пустые состояния

- Контейнер: `flex`, `flex-col`, `items-center`, `gap: 12px`, `padding: 48px 24px`.
- Иконка: 48px, `color: var(--text-tertiary)`, `opacity: 0.5`.
- Заголовок: 17px, font-weight 600, `color: var(--text-secondary)`.
- Подзаголовок: 15px, `color: var(--text-tertiary)`.
- CTA (если есть): Secondary, `width: auto`, `margin-top: 8px`.

Компонент: `EmptyState` (props: `icon`, `title`, `subtitle?`, `ctaLabel?`, `onCtaClick?`).

### 6. Ошибки (Toast)

- Не `alert`, а тост снизу: `position: fixed`, `bottom: 96px` (над навбаром), `left/right: 16px`.
- Стиль: `background: rgba(255,59,48,0.15)`, `border: 1px solid rgba(255,59,48,0.3)`, `border-radius: var(--radius-md)`, `padding: 12px 16px`.
- Иконка «!» + текст. Автоскрытие через 3500ms, анимация выезда вниз 250ms.

Компонент: `ErrorToast` (props: `isVisible`, `message`, `onHide`). Родитель управляет видимостью и текстом.

---

## Карточки NFT и UI-компоненты

### NFTCard (грид маркета/портфеля)

- Класс **`.nft-card`** в `index.css`: `border-radius: var(--radius-md)`, `background: var(--bg-card)`, `border: 1px solid var(--border-subtle)`, `overflow: hidden`, `cursor: pointer`, `transition: border-color 150ms, transform 200ms`.
- Hover (только не-touch): `@media (hover: hover)` — `border-color: var(--border-default)`, `transform: translateY(-2px)`.
- Active (тап): `transform: scale(0.97)`, `transition: 80ms`.
- Изображение: `aspect-ratio: 1/1`, `width: 100%`, `object-fit: cover`, фон пока загрузки `var(--bg-raised)`.
- Инфо-блок: `padding: 10px 12px`. Название: 14px, font-weight 600, `var(--text-primary)`, truncate. Коллекция: 12px, `var(--text-secondary)`, truncate. Цена: 15px, font-weight 700, `var(--text-primary)`. «TON»: 13px, `var(--accent)`.
- Бейдж «Владелец» (в портфеле): prop `showOwnerBadge`, позиция `top 8px, left 8px`, `background: rgba(0,145,255,0.85)`, `border-radius: 6px`, `padding: 2px 8px`, 11px font-weight 600, цвет #fff.

Компонент: `NFTCard` (props: `nft`, `onClick`, `showOwnerBadge?`).

### Сетка NFT

- `display: grid`, `grid-template-columns: 1fr 1fr`, `gap: 12px`, `padding: 16px` (классы `grid grid-cols-2 gap-3 p-4`).

### Input / Поле ввода

- Высота 52px, `background: var(--bg-input)`, `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-md)`, `padding: 0 16px`, шрифт 17px, цвет `var(--text-primary)`, placeholder `var(--text-tertiary)`.
- Focus: `border-color: var(--accent)`, `outline: none`, `box-shadow: 0 0 0 3px rgba(0,145,255,0.15)`, transition 150ms.
- Суффикс (например «TON»): prop `suffix`, позиция absolute right 16px, цвет `var(--text-secondary)`.

Компонент: `Input` (props как у `<input>`, плюс `suffix?`, `className?`).

### Toggle / Переключатель

- Размер 51×31px, фон `var(--border-default)` → при checked `var(--accent)`, `border-radius: 16px`.
- Thumb: круг 27px, фон #fff, `translateX(0 → 20px)` при checked, transition 200ms `var(--ease-spring)`.

Компонент: `Toggle` (props: `checked`, `onChange`, `disabled?`, `aria-label?`).

### Pill / Таб-переключатель (TG NFT / Крипто NFT)

- Контейнер: `background: var(--bg-raised)`, `border-radius: var(--radius-lg)`, `padding: 4px`.
- Таб: `border-radius: var(--radius-md)`, `padding: 8px 16px`, шрифт 15px, font-weight 500.
- Активный: `background: var(--bg-card)`, `color: var(--text-primary)`, `box-shadow: 0 1px 3px rgba(0,0,0,0.3)`.
- Неактивный: `color: var(--text-secondary)`.
- Анимация переключения: 200ms `var(--ease-spring)`.

### Блок баланса TON (хедер, профиль)

- `background: rgba(0,145,255,0.1)`, `border: 1px solid rgba(0,145,255,0.2)`, `border-radius: 20px`, `padding: 6px 14px`, шрифт 15px, font-weight 600, цвет `var(--accent)`, иконка слева 16px.

---

## Оптимизация под Telegram Mini App

Инициализация и обёртки: `services/telegramWebApp.ts`, старт в `index.tsx`.

### Инициализация TG SDK

- `WebApp.ready()`, `WebApp.expand()`, `WebApp.setHeaderColor('#0a0a0b')`, `WebApp.setBackgroundColor('#0a0a0b')`.
- `WebApp.isVerticalSwipesEnabled = true` (разрешить свайп вниз для закрытия).
- Пользователь: `getTelegramUser()` из `initDataUnsafe.user`.

### Safe Area

- Всегда использовать `env(safe-area-inset-top/bottom/left/right)`.
- Не хардкодить отступы под вырезы и домашнюю полоску.
- Viewport: `viewport-fit=cover` в meta (уже в `index.html`).

### BackButton TG

- На full-screen (NFTDetail): `showBackButton()`, при возврате — `hideBackButton()`.
- Обработчик: `onBackButtonClick(() => navigateBack())`.
- Нашу кнопку «Назад» в UI не заменять, дублировать.

### MainButton TG (опционально)

- Главный CTA на экране детали NFT: `setMainButtonText('Купить за X TON')`, `showMainButton()` / `hideMainButton()`, `setMainButtonParams({ color: '#0091ff', text_color: '#ffffff' })`.

### Haptic Feedback (обязательно)

- Импорт: `haptic` из `services/telegramWebApp`.
- Нажатие кнопки: `haptic.light()`.
- Успех: `haptic.success()` (например в SuccessOverlay).
- Ошибка: `haptic.error()` (в ErrorToast).
- Предупреждение: `haptic.warning()`.
- Переключение таба: `haptic.selection()` (в BottomNav).

### Производительность

- Все изображения: `loading="lazy"`, `decoding="async"`.
- Карточки NFT: `React.memo(NFTCard)`.
- Картинки NFT: `object-fit: cover`, `aspect-ratio: 1/1` (или класс `aspect-square`).
- Длинные списки (>50 элементов): рассмотреть виртуализацию (react-virtual).
- Не вызывать layout thrashing: читать DOM только в `useEffect`.
- `will-change: transform` только на анимируемых элементах, не глобально.

### Касания (touch)

- Минимальный target: **44×44px** — класс `min-touch` в `index.css`.
- Touch-feedback: `-webkit-tap-highlight-color: transparent` на кнопках (задано глобально для `button`, `[role="button"]`).
- Не блокировать вертикальный скролл контента.

### Ориентация

- Поддержка только **portrait**. При landscape — заглушка `LandscapeStub` (z-index 100).
- Компонент: `LandscapeStub.tsx`. В App при `matchMedia('(orientation: landscape)')` показывается поверх приложения.

---

## Строгие запреты — нельзя нарушать

### Структура

- ❌ Использовать разные стили кнопок «Назад» на разных экранах.
- ❌ Хедер шита без кнопки закрытия (X) справа вверху.
- ❌ Кнопки «Назад» и «Подтвердить» разной высоты в паре.
- ❌ Закрытие шита при нажатии «Назад» внутри многошагового флоу (Назад — предыдущий шаг).
- ❌ Показывать Bottom Nav на full-screen экране (NFTDetail и аналогах).
- ❌ Хардкодить отступы под safe area (только `env(safe-area-inset-*)`).
- ❌ Разные border-radius у одного типа элемента на разных экранах.

### Визуал

- ❌ Цвета не из дизайн-системы (никаких #fff, #000, серые не из палитры).
- ❌ Градиенты на кнопках, карточках, фоне (допустимы только в NFT-изображениях как есть).
- ❌ Тени (box-shadow), кроме: focus-ring на инпутах, карточка в pill-switcher.
- ❌ Цвет текста #ffffff напрямую — только через `var(--text-primary)`.
- ❌ Разные font-weight для одного типа текста.

### Анимации

- ❌ Анимация смены основных вкладок (Маркет↔Портфель) — только цвет таба.
- ❌ Длительность transition > 400ms.
- ❌ Анимировать backdrop-filter (кроме начального появления blur).
- ❌ CSS transitions на scroll-событиях (только transform/opacity).
- ❌ Убирать анимацию шита без onAnimationEnd перед unmount (будет мигание).

### Производительность

- ❌ Загружать все NFT сразу без lazy.
- ❌ Ставить `will-change: transform` на все элементы подряд.
- ❌ Использовать `filter: blur()` на анимируемых элементах (GPU killer).
- ❌ Вызывать DOM reflow в рендер-цикле.

### TG Mini App

- ❌ Блокировать нативный вертикальный свайп контента.
- ❌ Использовать `window.alert`, `confirm`, `prompt` (нет в TG WebApp) — только ErrorToast / SuccessOverlay.
- ❌ Хардкодить высоту viewport (100vh) без учёта dvh и TG safe areas.
- ❌ Игнорировать WebApp.BackButton — всегда синхронизировать с UI-навигацией.
