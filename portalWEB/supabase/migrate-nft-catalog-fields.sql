-- Добавить Модель, Коллекция, Фон в nft_catalog (если таблица уже создана без них)
-- Выполни в SQL Editor Supabase один раз.

do $$
begin
  alter table public.nft_catalog add column collection text;
exception when duplicate_column then null;
end $$;
do $$
begin
  alter table public.nft_catalog add column model text;
exception when duplicate_column then null;
end $$;
do $$
begin
  alter table public.nft_catalog add column backdrop text;
exception when duplicate_column then null;
end $$;
