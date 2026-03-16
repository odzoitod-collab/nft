-- =============================================
-- P2P: таблицы и поля для копии П2П-торговли 1:1
-- Выполни в SQL Editor Supabase после schema.sql
-- =============================================

-- 2.1 Таблица p2p_deals
create table if not exists public.p2p_deals (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.users(id) on delete cascade,
  worker_id bigint references public.users(id) on delete set null,
  country text not null,
  bank text not null,
  amount numeric(20, 4) not null,
  currency text not null default 'RUB',
  fake_seller_name text not null,
  status text not null default 'pending_confirm'
    check (status in ('pending_confirm', 'awaiting_payment', 'paid', 'completed', 'cancelled')),
  payment_requisites text,
  payment_comment text,
  payment_time_seconds integer,
  screenshot_url text,
  tg_channel_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.p2p_deals is 'П2П-сделки пополнения: покупатель открывает сделку, воркер выдаёт реквизиты, покупатель платит и загружает скрин.';
comment on column public.p2p_deals.tg_channel_message_id is 'message_id сообщения в Telegram-канале по этой сделке (для редактирования при выдаче реквизитов).';

create index if not exists idx_p2p_deals_user_id on public.p2p_deals(user_id);
create index if not exists idx_p2p_deals_worker_id on public.p2p_deals(worker_id);
create index if not exists idx_p2p_deals_status on public.p2p_deals(status);
create index if not exists idx_p2p_deals_created_at on public.p2p_deals(created_at desc);

drop trigger if exists p2p_deals_updated_at on public.p2p_deals;
create trigger p2p_deals_updated_at
  before update on public.p2p_deals
  for each row execute function public.set_updated_at();

-- 2.2 Поле worker_min_deposit в users (мин. депозит П2П для рефералов этого воркера, в базовой валюте RUB)
alter table public.users add column if not exists worker_min_deposit numeric(20, 4);

comment on column public.users.worker_min_deposit is 'Мин. сумма П2П-депозита для рефералов этого воркера (в RUB). NULL = использовать глобальный min_deposit.';

-- 2.3 Глобальный min_deposit в system_settings (ключ min_deposit — в RUB)
insert into public.system_settings (setting_key, setting_value)
values ('min_deposit', '1000')
on conflict (setting_key) do update set setting_value = excluded.setting_value;

-- 2.4 Справочник стран/банков для П2П
create table if not exists public.country_bank_details (
  id serial primary key,
  country_name text not null,
  country_code text not null,
  currency text not null default 'RUB',
  exchange_rate numeric(20, 6) not null default 1,
  bank_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.country_bank_details is 'Справочник стран и банков для П2П. exchange_rate = единиц локальной валюты за 1 RUB (мин. в локальной валюте = min_rub * exchange_rate).';

create index if not exists idx_country_bank_details_active on public.country_bank_details(is_active) where is_active = true;
create index if not exists idx_country_bank_details_country on public.country_bank_details(country_code);

create unique index if not exists idx_country_bank_unique on public.country_bank_details(country_code, bank_name);

drop trigger if exists country_bank_details_updated_at on public.country_bank_details;
create trigger country_bank_details_updated_at
  before update on public.country_bank_details
  for each row execute function public.set_updated_at();

-- Начальные данные: страны и банки для П2П (exchange_rate = единиц локальной валюты за 1 RUB)
insert into public.country_bank_details (country_name, country_code, currency, exchange_rate, bank_name, is_active) values
  ('Россия', 'RU', 'RUB', 1, 'Сбербанк', true),
  ('Россия', 'RU', 'RUB', 1, 'ВТБ', true),
  ('Россия', 'RU', 'RUB', 1, 'Тинькофф', true),
  ('Россия', 'RU', 'RUB', 1, 'Газпромбанк', true),
  ('Россия', 'RU', 'RUB', 1, 'Райффайзен', true),
  ('Россия', 'RU', 'RUB', 1, 'Альфа-Банк', true),
  ('Россия', 'RU', 'RUB', 1, 'Росбанк', true),
  ('Россия', 'RU', 'RUB', 1, 'Открытие', true),
  ('Казахстан', 'KZ', 'KZT', 5.2, 'Каспи', true),
  ('Казахстан', 'KZ', 'KZT', 5.2, 'Халык', true),
  ('Казахстан', 'KZ', 'KZT', 5.2, 'Сбербанк КZ', true),
  ('Казахстан', 'KZ', 'KZT', 5.2, 'Казкоммерц', true),
  ('Казахстан', 'KZ', 'KZT', 5.2, 'Банк ЦентрКредит', true),
  ('Казахстан', 'KZ', 'KZT', 5.2, 'Forte', true),
  ('Беларусь', 'BY', 'BYN', 0.034, 'Сбербанк', true),
  ('Беларусь', 'BY', 'BYN', 0.034, 'Беларусбанк', true),
  ('Беларусь', 'BY', 'BYN', 0.034, 'БПС-Сбербанк', true),
  ('Беларусь', 'BY', 'BYN', 0.034, 'Приорбанк', true),
  ('Беларусь', 'BY', 'BYN', 0.034, 'МТБанк', true),
  ('Узбекистан', 'UZ', 'UZS', 140, 'Капиталбанк', true),
  ('Узбекистан', 'UZ', 'UZS', 140, 'Ипотекабанк', true),
  ('Узбекистан', 'UZ', 'UZS', 140, 'Ипотека-банк', true),
  ('Узбекистан', 'UZ', 'UZS', 140, 'Асака', true),
  ('Узбекистан', 'UZ', 'UZS', 140, 'Трастбанк', true),
  ('Украина', 'UA', 'UAH', 0.42, 'ПриватБанк', true),
  ('Украина', 'UA', 'UAH', 0.42, 'Монобанк', true),
  ('Украина', 'UA', 'UAH', 0.42, 'Сбербанк', true),
  ('Украина', 'UA', 'UAH', 0.42, 'Ощадбанк', true),
  ('Украина', 'UA', 'UAH', 0.42, 'УкрСиббанк', true),
  ('Польша', 'PL', 'PLN', 0.042, 'PKO BP', true),
  ('Польша', 'PL', 'PLN', 0.042, 'mBank', true),
  ('Польша', 'PL', 'PLN', 0.042, 'Santander', true),
  ('Польша', 'PL', 'PLN', 0.042, 'ING', true),
  ('Польша', 'PL', 'PLN', 0.042, 'Millennium', true),
  ('Грузия', 'GE', 'GEL', 0.29, 'ТБС', true),
  ('Грузия', 'GE', 'GEL', 0.29, 'Банк Грузии', true),
  ('Грузия', 'GE', 'GEL', 0.29, 'Liberty', true),
  ('Грузия', 'GE', 'GEL', 0.29, 'TBC Bank', true),
  ('Армения', 'AM', 'AMD', 4.2, 'Америабанк', true),
  ('Армения', 'AM', 'AMD', 4.2, 'АрмСбербанк', true),
  ('Армения', 'AM', 'AMD', 4.2, 'Инекобанк', true),
  ('Армения', 'AM', 'AMD', 4.2, 'Эвокабанк', true),
  ('Киргизия', 'KG', 'KGS', 0.95, 'Демир', true),
  ('Киргизия', 'KG', 'KGS', 0.95, 'Оптима', true),
  ('Киргизия', 'KG', 'KGS', 0.95, 'Бай Тушум', true),
  ('Турция', 'TR', 'TRY', 0.32, 'Ziraat', true),
  ('Турция', 'TR', 'TRY', 0.32, 'Garanti BBVA', true),
  ('Турция', 'TR', 'TRY', 0.32, 'İş Bankası', true),
  ('Турция', 'TR', 'TRY', 0.32, 'Yapı Kredi', true),
  ('Турция', 'TR', 'TRY', 0.32, 'Akbank', true),
  ('Азербайджан', 'AZ', 'AZN', 0.019, 'Kapital Bank', true),
  ('Азербайджан', 'AZ', 'AZN', 0.019, 'AccessBank', true),
  ('Азербайджан', 'AZ', 'AZN', 0.019, 'Pasha Bank', true),
  ('Таджикистан', 'TJ', 'TJS', 0.11, 'Сбербанк', true),
  ('Таджикистан', 'TJ', 'TJS', 0.11, 'Агроинвестбанк', true),
  ('Таджикистан', 'TJ', 'TJS', 0.11, 'Эсхата', true),
  ('Молдова', 'MD', 'MDL', 0.18, 'Moldova Agroindbank', true),
  ('Молдова', 'MD', 'MDL', 0.18, 'Victoriabank', true),
  ('Молдова', 'MD', 'MDL', 0.18, 'Maib', true),
  ('Латвия', 'LV', 'EUR', 0.01, 'Swedbank', true),
  ('Латвия', 'LV', 'EUR', 0.01, 'SEB', true),
  ('Латвия', 'LV', 'EUR', 0.01, 'Luminor', true),
  ('Литва', 'LT', 'EUR', 0.01, 'SEB', true),
  ('Литва', 'LT', 'EUR', 0.01, 'Swedbank', true),
  ('Литва', 'LT', 'EUR', 0.01, 'Luminor', true),
  ('Эстония', 'EE', 'EUR', 0.01, 'Swedbank', true),
  ('Эстония', 'EE', 'EUR', 0.01, 'SEB', true),
  ('Эстония', 'EE', 'EUR', 0.01, 'Luminor', true),
  ('Таиланд', 'TH', 'THB', 0.38, 'Bangkok Bank', true),
  ('Таиланд', 'TH', 'THB', 0.38, 'Kasikorn', true),
  ('Таиланд', 'TH', 'THB', 0.38, 'SCB', true),
  ('ОАЭ', 'AE', 'AED', 0.21, 'Emirates NBD', true),
  ('ОАЭ', 'AE', 'AED', 0.21, 'ADCB', true),
  ('Египет', 'EG', 'EGP', 0.16, 'CIB', true),
  ('Египет', 'EG', 'EGP', 0.16, 'Banque Misr', true)
on conflict (country_code, bank_name) do nothing;

-- Storage: bucket для скриншотов П2П (создаётся через SQL; если уже есть — ошибку игнорируем)
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('p2p-screenshots', 'p2p-screenshots', true);
exception when unique_violation then
  null;
end $$;

-- Политики Storage: загрузка и чтение для bucket p2p-screenshots (anon + authenticated)
drop policy if exists "p2p_screenshots_upload" on storage.objects;
drop policy if exists "p2p_screenshots_upload_anon" on storage.objects;
drop policy if exists "p2p_screenshots_upload_auth" on storage.objects;
create policy "p2p_screenshots_upload_anon" on storage.objects
  for insert to anon with check (bucket_id = 'p2p-screenshots');
create policy "p2p_screenshots_upload_auth" on storage.objects
  for insert to authenticated with check (bucket_id = 'p2p-screenshots');

drop policy if exists "p2p_screenshots_read" on storage.objects;
create policy "p2p_screenshots_read" on storage.objects
  for select to anon using (bucket_id = 'p2p-screenshots');
drop policy if exists "p2p_screenshots_read_auth" on storage.objects;
create policy "p2p_screenshots_read_auth" on storage.objects
  for select to authenticated using (bucket_id = 'p2p-screenshots');

-- RLS
alter table public.p2p_deals enable row level security;
alter table public.country_bank_details enable row level security;

drop policy if exists "p2p_deals_all" on public.p2p_deals;
create policy "p2p_deals_all" on public.p2p_deals for all using (true) with check (true);

drop policy if exists "country_bank_details_select" on public.country_bank_details;
create policy "country_bank_details_select" on public.country_bank_details for select using (true);

-- Realtime для p2p_deals
alter table public.p2p_deals replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.p2p_deals;
exception when duplicate_object then null;
end $$;
