-- Лог действий пользователя (аналитика/аудит). Только insert с фронта; чтение — сервисная роль/админ.
create table if not exists public.app_actions (
  id bigserial primary key,
  user_id bigint null references public.users(id) on delete set null,
  tgid text null,
  action_type text not null,
  payload jsonb null,
  created_at timestamptz not null default now()
);

comment on table public.app_actions is 'Лог действий пользователя: вход, заявки на пополнение/вывод, открытие сделок, KYC. Чтение только под сервисной ролью.';

create index if not exists idx_app_actions_created_at on public.app_actions(created_at desc);
create index if not exists idx_app_actions_user_created on public.app_actions(user_id, created_at desc) where user_id is not null;
create index if not exists idx_app_actions_type_created on public.app_actions(action_type, created_at desc);

alter table public.app_actions enable row level security;

drop policy if exists "app_actions_insert_anon" on public.app_actions;
create policy "app_actions_insert_anon" on public.app_actions for insert to anon, authenticated with check (true);

drop policy if exists "app_actions_select_none" on public.app_actions;
create policy "app_actions_select_none" on public.app_actions for select using (false);
