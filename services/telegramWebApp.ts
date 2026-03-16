/**
 * Обёртка над Telegram Web App SDK.
 * Все методы безопасны вне Mini App (no-op).
 * При входе через браузер (не Mini App) подставляется гость с рандомным ID из localStorage.
 */

import WebApp from '@twa-dev/sdk';

const BG_COLOR = '#0a0a0b';

const GUEST_STORAGE_KEY = 'guest_tg_id';

/** Проверка: запущено ли внутри Telegram Mini App */
function isInsideTelegramWebApp(): boolean {
  try {
    return typeof WebApp !== 'undefined' && WebApp?.initData != null && WebApp.initData.length > 0;
  } catch {
    return false;
  }
}

/**
 * Генерирует и сохраняет в localStorage стабильный рандомный ID для гостя (9 цифр, как у ТГ).
 * При повторном заходе с того же браузера возвращается тот же ID.
 */
export function getOrCreateGuestId(): number {
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored) {
      const num = parseInt(stored, 10);
      if (Number.isInteger(num) && num >= 100000000 && num <= 999999999) return num;
    }
    const id = 100000000 + Math.floor(Math.random() * 899000000);
    localStorage.setItem(GUEST_STORAGE_KEY, String(id));
    return id;
  } catch {
    return 100000000 + Math.floor(Math.random() * 899000000);
  }
}

/** Объект «пользователь» в формате Telegram (id, first_name, username, ...) для гостя из браузера */
export interface GuestTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

/** Если не в Mini App — возвращает гостя с рандомным ID из localStorage, иначе null */
export function getGuestTelegramUser(): GuestTelegramUser | null {
  if (isInsideTelegramWebApp()) return null;
  const id = getOrCreateGuestId();
  return {
    id,
    first_name: 'Гость',
    last_name: undefined,
    username: undefined,
    photo_url: undefined,
  };
}

export function initTelegram(): void {
  try {
    WebApp.ready();
    WebApp.expand();
    const ver = (WebApp as unknown as { version?: string }).version ?? '';
    if (ver !== '6.0') {
      try {
        WebApp.setHeaderColor(BG_COLOR);
      } catch {
        //
      }
      try {
        WebApp.setBackgroundColor(BG_COLOR);
      } catch {
        //
      }
      try {
        if (typeof (WebApp as unknown as { isVerticalSwipesEnabled?: boolean }).isVerticalSwipesEnabled !== 'undefined') {
          (WebApp as unknown as { isVerticalSwipesEnabled: boolean }).isVerticalSwipesEnabled = true;
        }
      } catch {
        //
      }
    }
  } catch {
    // вне Telegram или старая версия
  }
}

export function getTelegramUser(): { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } | null {
  try {
    const tg = WebApp.initDataUnsafe?.user ?? null;
    if (tg) return tg;
    if (!isInsideTelegramWebApp()) return getGuestTelegramUser();
    return null;
  } catch {
    return getGuestTelegramUser();
  }
}

function hasWebApp(): boolean {
  try {
    return typeof WebApp !== 'undefined' && WebApp != null;
  } catch {
    return false;
  }
}

// --- BackButton ---
export function showBackButton(): void {
  try {
    if (hasWebApp() && WebApp.BackButton) WebApp.BackButton.show();
  } catch {
    //
  }
}

export function hideBackButton(): void {
  try {
    if (hasWebApp() && WebApp.BackButton) WebApp.BackButton.hide();
  } catch {
    //
  }
}

export function onBackButtonClick(handler: () => void): () => void {
  try {
    if (hasWebApp() && WebApp.BackButton && typeof WebApp.BackButton.onClick === 'function') {
      WebApp.BackButton.onClick(handler);
      return () => {
        try {
          if (typeof WebApp.BackButton.offClick === 'function') WebApp.BackButton.offClick(handler);
        } catch {
          //
        }
      };
    }
  } catch {
    //
  }
  return () => {};
}

// --- MainButton ---
export function setMainButtonText(text: string): void {
  try {
    if (hasWebApp() && WebApp.MainButton) WebApp.MainButton.setText(text);
  } catch {
    //
  }
}

export function showMainButton(): void {
  try {
    if (hasWebApp() && WebApp.MainButton) WebApp.MainButton.show();
  } catch {
    //
  }
}

export function hideMainButton(): void {
  try {
    if (hasWebApp() && WebApp.MainButton) WebApp.MainButton.hide();
  } catch {
    //
  }
}

export function setMainButtonParams(params: { color?: string; text_color?: string }): void {
  try {
    if (hasWebApp() && WebApp.MainButton) WebApp.MainButton.setParams(params);
  } catch {
    //
  }
}

export function onMainButtonClick(handler: () => void): () => void {
  try {
    if (hasWebApp() && WebApp.MainButton && typeof WebApp.MainButton.onClick === 'function') {
      WebApp.MainButton.onClick(handler);
      return () => {
        try {
          if (typeof WebApp.MainButton.offClick === 'function') WebApp.MainButton.offClick(handler);
        } catch {
          //
        }
      };
    }
  } catch {
    //
  }
  return () => {};
}

// --- Haptic (обязательно для ключевых действий) ---
import { HapticFeedback } from '@twa-dev/sdk';

export const haptic = {
  /** Нажатие кнопки */
  light() {
    try {
      HapticFeedback.impactOccurred('light');
    } catch {
      //
    }
  },
  /** Успешная операция */
  success() {
    try {
      HapticFeedback.notificationOccurred('success');
    } catch {
      //
    }
  },
  /** Ошибка */
  error() {
    try {
      HapticFeedback.notificationOccurred('error');
    } catch {
      //
    }
  },
  /** Предупреждение */
  warning() {
    try {
      HapticFeedback.notificationOccurred('warning');
    } catch {
      //
    }
  },
  /** Переключение таба / выбор */
  selection() {
    try {
      HapticFeedback.selectionChanged();
    } catch {
      //
    }
  },
};
