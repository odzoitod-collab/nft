/**
 * Обёртка над Telegram Web App SDK.
 * Все методы безопасны вне Mini App (no-op).
 */

import WebApp from '@twa-dev/sdk';

const BG_COLOR = '#0a0a0b';

export function initTelegram(): void {
  try {
    WebApp.ready();
    WebApp.expand();
    WebApp.setHeaderColor(BG_COLOR);
    WebApp.setBackgroundColor(BG_COLOR);
    if (typeof WebApp.isVerticalSwipesEnabled !== 'undefined') {
      WebApp.isVerticalSwipesEnabled = true;
    }
  } catch {
    // вне Telegram или старая версия
  }
}

export function getTelegramUser(): { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } | null {
  try {
    return WebApp.initDataUnsafe?.user ?? null;
  } catch {
    return null;
  }
}

// --- BackButton ---
export function showBackButton(): void {
  try {
    WebApp.BackButton.show();
  } catch {
    //
  }
}

export function hideBackButton(): void {
  try {
    WebApp.BackButton.hide();
  } catch {
    //
  }
}

export function onBackButtonClick(handler: () => void): () => void {
  try {
    WebApp.BackButton.onClick(handler);
    return () => {
      try {
        WebApp.BackButton.offClick(handler);
      } catch {
        //
      }
    };
  } catch {
    return () => {};
  }
}

// --- MainButton ---
export function setMainButtonText(text: string): void {
  try {
    WebApp.MainButton.setText(text);
  } catch {
    //
  }
}

export function showMainButton(): void {
  try {
    WebApp.MainButton.show();
  } catch {
    //
  }
}

export function hideMainButton(): void {
  try {
    WebApp.MainButton.hide();
  } catch {
    //
  }
}

export function setMainButtonParams(params: { color?: string; text_color?: string }): void {
  try {
    WebApp.MainButton.setParams(params);
  } catch {
    //
  }
}

export function onMainButtonClick(handler: () => void): () => void {
  try {
    WebApp.MainButton.onClick(handler);
    return () => {
      try {
        WebApp.MainButton.offClick(handler);
      } catch {
        //
      }
    };
  } catch {
    return () => {};
  }
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
