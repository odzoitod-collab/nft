-- Выполни в SQL Editor Supabase, если nft_catalog создана вручную и записи не отображаются на сайте.
-- RLS без политики блокирует чтение; добавляем политику для anon.

alter table public.nft_catalog enable row level security;

drop policy if exists "nft_catalog_all" on public.nft_catalog;
create policy "nft_catalog_all" on public.nft_catalog
  for all using (true) with check (true);
