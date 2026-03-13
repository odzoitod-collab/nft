-- Листинги: уведомление воркера и realtime
-- 1. Колонка «воркер уведомлён» (бот отправил сообщение в ТГ)
alter table public.nft_listings
  add column if not exists worker_notified boolean not null default false;

comment on column public.nft_listings.worker_notified is 'true после отправки уведомления воркеру в боте';

-- 2. Realtime для nft_listings (сайт и бот подписываются на изменения)
alter table public.nft_listings replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.nft_listings;
exception when duplicate_object then null;
end $$;
