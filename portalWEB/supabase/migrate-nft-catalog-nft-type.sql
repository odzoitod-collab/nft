-- Категория NFT для маркета: tg (TG NFT) или crypto (Крипто NFT).
-- Все текущие записи без nft_type считаются TG NFT. Крипто NFT добавляйте позже с nft_type = 'crypto'.
-- Выполни в SQL Editor Supabase один раз (если нужна колонка для будущих крипто-NFT).

do $$
begin
  alter table public.nft_catalog add column nft_type text check (nft_type is null or nft_type in ('tg', 'crypto'));
exception when duplicate_column then null;
end $$;

-- Пример: пометить NFT как крипто (когда будете добавлять):
-- update public.nft_catalog set nft_type = 'crypto' where code in ('...');
