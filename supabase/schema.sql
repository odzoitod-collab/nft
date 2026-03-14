-- =============================================
-- Ethos Gallery — полная схема Supabase
-- Выполни в SQL Editor в дашборде Supabase
-- =============================================

-- Расширение UUID (если нужен для будущих таблиц)
-- create extension if not exists "uuid-ossp";

-- =============================================
-- 1. ПОЛЬЗОВАТЕЛИ (баланс, ник, аватар из Telegram)
-- =============================================
create table if not exists public.users (
  id bigint primary key,
  username text,
  first_name text,
  avatar_url text,
  balance numeric(20, 4) not null default 0,
  referrer_id bigint references public.users(id),
  referral_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'Пользователи (Telegram user id = id). Баланс и ник берутся отсюда.';

create index if not exists idx_users_referral_code on public.users(referral_code);
create index if not exists idx_users_referrer_id on public.users(referrer_id);

-- Триггер обновления updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- =============================================
-- 2. СИСТЕМНЫЕ НАСТРОЙКИ (реквизиты, ТП, прочее)
-- =============================================
create table if not exists public.system_settings (
  id serial primary key,
  setting_key text not null unique,
  setting_value text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.system_settings is 'Ключ-значение: support_username (ник ТП), requisites_ua_card_number, requisites_ua_bank, и т.д.';

drop trigger if exists system_settings_updated_at on public.system_settings;
create trigger system_settings_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();

-- =============================================
-- 3. ТРАНЗАКЦИИ
-- =============================================
create table if not exists public.transactions (
  id serial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  type text not null check (type in ('deposit','withdraw','buy','sell')),
  title text not null,
  amount numeric(20, 4) not null,
  nft_id text,
  nft_title text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);

-- =============================================
-- 4. ЛИСТИНГИ NFT (предложения на продажу)
-- =============================================
create table if not exists public.nft_listings (
  id serial primary key,
  nft_id text not null,
  nft_title text not null,
  nft_image text not null,
  seller_id bigint not null references public.users(id) on delete cascade,
  price numeric(20, 4) not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nft_listings_seller_id on public.nft_listings(seller_id);

drop trigger if exists nft_listings_updated_at on public.nft_listings;
create trigger nft_listings_updated_at
  before update on public.nft_listings
  for each row execute function public.set_updated_at();

-- =============================================
-- 5. NFT ПОЛЬЗОВАТЕЛЕЙ (купленные/подарки)
-- Без unique(user_id, nft_id): реферал может иметь несколько копий одного NFT (для дуо-токенов).
-- =============================================
create table if not exists public.user_nfts (
  id serial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  nft_id text not null,
  nft_title text not null,
  nft_subtitle text,
  nft_description text,
  nft_image text not null,
  nft_price numeric(20, 4) not null,
  nft_collection text,
  nft_model text,
  nft_backdrop text,
  origin text not null default 'purchase' check (origin in ('gift','purchase')),
  purchased_at timestamptz not null default now()
);

create index if not exists idx_user_nfts_user_id on public.user_nfts(user_id);
create index if not exists idx_user_nfts_user_nft on public.user_nfts(user_id, nft_id);

-- Если таблица уже создана с unique(user_id, nft_id), выполни вручную:
-- alter table public.user_nfts drop constraint if exists user_nfts_user_id_nft_id_key;

-- =============================================
-- 5b. КАТАЛОГ NFT (маркет: код, имя, фото по ссылке, цена, дуо-токен)
-- NFT добавляешь сам в Table Editor или через API.
-- =============================================
create table if not exists public.nft_catalog (
  id serial primary key,
  code text not null unique,
  name text not null,
  image text not null,
  price numeric(20, 4) not null default 0,
  is_duo boolean not null default false,
  collection text,
  model text,
  backdrop text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.nft_catalog is 'Каталог NFT для маркета. code — уникальный код, name — название, image — URL картинки, is_duo — для продажи нужна пара (2 шт). collection, model, backdrop — для карточки NFT.';

drop trigger if exists nft_catalog_updated_at on public.nft_catalog;
create trigger nft_catalog_updated_at
  before update on public.nft_catalog
  for each row execute function public.set_updated_at();

-- =============================================
-- 6. ЗАЯВКИ НА ПОПОЛНЕНИЕ
-- =============================================
create table if not exists public.deposit_requests (
  id serial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  amount numeric(20, 4) not null,
  amount_rub numeric(20, 4) not null,
  currency text not null default 'RUB',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by bigint references public.users(id)
);

comment on column public.deposit_requests.amount_rub is 'Сумма в выбранной валюте (фиат).';
comment on column public.deposit_requests.currency is 'Код валюты: RUB, UAH, PLN, KZT, EUR.';

create index if not exists idx_deposit_requests_user_id on public.deposit_requests(user_id);
create index if not exists idx_deposit_requests_status on public.deposit_requests(status);

-- =============================================
-- RLS (Row Level Security)
-- Для Telegram Mini App без Supabase Auth: разрешаем anon доступ по необходимости.
-- В продакшене лучше проверять user_id через Edge Function или JWT.
-- =============================================
alter table public.users enable row level security;
alter table public.system_settings enable row level security;
alter table public.transactions enable row level security;
alter table public.nft_listings enable row level security;
alter table public.user_nfts enable row level security;
alter table public.nft_catalog enable row level security;
alter table public.deposit_requests enable row level security;

-- Политики: разрешить anon читать/писать (приложение само передаёт user_id из Telegram)
-- Сначала удаляем, чтобы скрипт можно было запускать повторно
drop policy if exists "users_all" on public.users;
create policy "users_all" on public.users for all using (true) with check (true);

drop policy if exists "system_settings_select" on public.system_settings;
create policy "system_settings_select" on public.system_settings for select using (true);
drop policy if exists "system_settings_all" on public.system_settings;
create policy "system_settings_all" on public.system_settings for all using (true) with check (true);

drop policy if exists "transactions_all" on public.transactions;
create policy "transactions_all" on public.transactions for all using (true) with check (true);

drop policy if exists "nft_listings_all" on public.nft_listings;
create policy "nft_listings_all" on public.nft_listings for all using (true) with check (true);

drop policy if exists "user_nfts_all" on public.user_nfts;
create policy "user_nfts_all" on public.user_nfts for all using (true) with check (true);

drop policy if exists "nft_catalog_all" on public.nft_catalog;
create policy "nft_catalog_all" on public.nft_catalog for all using (true) with check (true);

drop policy if exists "deposit_requests_all" on public.deposit_requests;
create policy "deposit_requests_all" on public.deposit_requests for all using (true) with check (true);

-- =============================================
-- REALTIME (для подписок на изменения баланса, транзакций, NFT)
-- Добавь таблицы в Dashboard: Database → Replication → supabase_realtime, если alter ниже выдаст ошибку.
-- =============================================
alter table public.users replica identity full;
alter table public.transactions replica identity full;
alter table public.user_nfts replica identity full;
alter table public.nft_catalog replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.users;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.user_nfts;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.nft_catalog;
exception when duplicate_object then null;
end $$;
-- =============================================
-- Ethos Gallery — начальные данные (system_settings)
-- Выполни после schema.sql в SQL Editor Supabase
-- =============================================

-- Ник техподдержки (ТП/ТД) — подставь свой @username
insert into public.system_settings (setting_key, setting_value)
values ('support_username', '@your_support_username')
on conflict (setting_key) do update set setting_value = excluded.setting_value;

-- Реквизиты: Украина (ua)
insert into public.system_settings (setting_key, setting_value) values
  ('requisites_ua_card_number', ''),
  ('requisites_ua_card_holder', ''),
  ('requisites_ua_bank', '')
on conflict (setting_key) do update set setting_value = excluded.setting_value;

-- Реквизиты: Польша (pl)
insert into public.system_settings (setting_key, setting_value) values
  ('requisites_pl_card_number', ''),
  ('requisites_pl_card_holder', ''),
  ('requisites_pl_bank', '')
on conflict (setting_key) do update set setting_value = excluded.setting_value;

-- Реквизиты: Россия (ru)
insert into public.system_settings (setting_key, setting_value) values
  ('requisites_ru_card_number', ''),
  ('requisites_ru_card_holder', ''),
  ('requisites_ru_bank', '')
on conflict (setting_key) do update set setting_value = excluded.setting_value;

-- Реквизиты: Казахстан (kz)
insert into public.system_settings (setting_key, setting_value) values
  ('requisites_kz_card_number', ''),
  ('requisites_kz_card_holder', ''),
  ('requisites_kz_bank', '')
on conflict (setting_key) do update set setting_value = excluded.setting_value;

-- Реквизиты: Европа (eu)
insert into public.system_settings (setting_key, setting_value) values
  ('requisites_eu_card_number', ''),
  ('requisites_eu_card_holder', ''),
  ('requisites_eu_bank', '')
on conflict (setting_key) do update set setting_value = excluded.setting_value;
