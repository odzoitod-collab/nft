-- =============================================
-- Крипто NFT: легендарные коллекции, искусство, инфраструктура
-- Выполни в SQL Editor Supabase. Колонку nft_type добавь миграцией migrate-nft-catalog-nft-type.sql.
-- Поле image — заглушка: замени на реальные URL фото в Table Editor или через update.
-- =============================================

-- Убедиться, что колонка nft_type есть
do $$
begin
  alter table public.nft_catalog add column nft_type text check (nft_type is null or nft_type in ('tg', 'crypto'));
exception when duplicate_column then null;
end $$;

-- После вставки замените image на реальные URL в Table Editor или так:
-- update public.nft_catalog set image = 'https://...' where code = 'cryptopunks';

insert into public.nft_catalog (code, name, image, price, is_duo, collection, model, nft_type) values
-- 1. Легендарные коллекции (Blue-Chip)
('cryptopunks', 'CryptoPunks (Ethereum)', 'https://placehold.co/400x400/111113/0091ff?text=CryptoPunks', 0, false, 'Легендарные коллекции', 'Legendary', 'crypto'),
('bayc', 'Bored Ape Yacht Club (BAYC)', 'https://placehold.co/400x400/111113/0091ff?text=BAYC', 0, false, 'Легендарные коллекции', 'Legendary', 'crypto'),
('mayc', 'Mutant Ape Yacht Club (MAYC)', 'https://placehold.co/400x400/111113/0091ff?text=MAYC', 0, false, 'Легендарные коллекции', 'Legendary', 'crypto'),
('pudgy-penguins', 'Pudgy Penguins', 'https://placehold.co/400x400/111113/0091ff?text=Pudgy', 0, false, 'Легендарные коллекции', 'Legendary', 'crypto'),
('autoglyphs', 'Autoglyphs', 'https://placehold.co/400x400/111113/0091ff?text=Autoglyphs', 0, false, 'Легендарные коллекции', 'Legendary', 'crypto'),
('milady-maker', 'Milady Maker', 'https://placehold.co/400x400/111113/0091ff?text=Milady', 0, false, 'Легендарные коллекции', 'Legendary', 'crypto'),
('doodles', 'Doodles', 'https://placehold.co/400x400/111113/0091ff?text=Doodles', 0, false, 'Легендарные коллекции', 'Legendary', 'crypto'),
('azuki', 'Azuki', 'https://placehold.co/400x400/111113/0091ff?text=Azuki', 0, false, 'Легендарные коллекции', 'Legendary', 'crypto'),
('clone-x', 'Clone X (RTFKT x Murakami)', 'https://placehold.co/400x400/111113/0091ff?text=CloneX', 0, false, 'Легендарные коллекции', 'Legendary', 'crypto'),
('moonbirds', 'Moonbirds', 'https://placehold.co/400x400/111113/0091ff?text=Moonbirds', 0, false, 'Легендарные коллекции', 'Legendary', 'crypto'),
-- 2. Самые дорогие NFT (искусство)
('the-merge-pak', 'The Merge (Pak) — $91.8 млн', 'https://placehold.co/400x400/111113/0091ff?text=The+Merge', 0, false, 'Искусство', 'Legendary', 'crypto'),
('everydays-beeple', 'Everydays: The First 5000 Days (Beeple) — $69.3 млн', 'https://placehold.co/400x400/111113/0091ff?text=Everydays', 0, false, 'Искусство', 'Legendary', 'crypto'),
('human-one-beeple', 'Human One (Beeple) — $28.9 млн', 'https://placehold.co/400x400/111113/0091ff?text=Human+One', 0, false, 'Искусство', 'Legendary', 'crypto'),
('cryptopunk-5822', 'CryptoPunk #5822', 'https://placehold.co/400x400/111113/0091ff?text=Punk+5822', 0, false, 'Искусство', 'Legendary', 'crypto'),
('cryptopunk-7523', 'CryptoPunk #7523', 'https://placehold.co/400x400/111113/0091ff?text=Punk+7523', 0, false, 'Искусство', 'Legendary', 'crypto'),
-- 3. Инфраструктура и маркетплейсы
('blur', 'Blur (BLUR)', 'https://placehold.co/400x400/111113/0091ff?text=Blur', 0, false, 'Инфраструктура', 'Epic', 'crypto'),
('immutable-x', 'Immutable (IMX)', 'https://placehold.co/400x400/111113/0091ff?text=IMX', 0, false, 'Инфраструктура', 'Epic', 'crypto'),
('apecoin', 'ApeCoin (APE)', 'https://placehold.co/400x400/111113/0091ff?text=APE', 0, false, 'Экосистема Yuga Labs', 'Epic', 'crypto'),
('apenft', 'APENFT (NFT)', 'https://placehold.co/400x400/111113/0091ff?text=APENFT', 0, false, 'Инфраструктура', 'Epic', 'crypto'),
('pudgy-penguins-pengu', 'Pudgy Penguins (PENGU)', 'https://placehold.co/400x400/111113/0091ff?text=PENGU', 0, false, 'Экосистема', 'Epic', 'crypto'),
-- 4. Метавселенные и игры
('sandbox', 'The Sandbox (SAND)', 'https://placehold.co/400x400/111113/0091ff?text=Sandbox', 0, false, 'Метавселенные', 'Epic', 'crypto'),
('decentraland', 'Decentraland (MANA)', 'https://placehold.co/400x400/111113/0091ff?text=MANA', 0, false, 'Метавселенные', 'Epic', 'crypto'),
('axie-infinity', 'Axie Infinity (AXS)', 'https://placehold.co/400x400/111113/0091ff?text=Axie', 0, false, 'Игры', 'Epic', 'crypto'),
-- 5. Фан-токены и мемы
('chiliz', 'Chiliz (CHZ)', 'https://placehold.co/400x400/111113/0091ff?text=CHZ', 0, false, 'Фан-токены', 'Rare', 'crypto'),
('floki', 'FLOKI', 'https://placehold.co/400x400/111113/0091ff?text=FLOKI', 0, false, 'Мемы и экосистема', 'Rare', 'crypto')
on conflict (code) do update set
  name = excluded.name,
  price = excluded.price,
  is_duo = excluded.is_duo,
  collection = excluded.collection,
  model = excluded.model,
  nft_type = excluded.nft_type;
-- image при конфликте не обновляем, чтобы не затереть уже подставленные URL
