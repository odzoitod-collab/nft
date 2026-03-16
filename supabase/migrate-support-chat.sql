-- =============================================
-- Чат техподдержки: треды и сообщения, привязка к веткам Telegram (forum topics)
-- Выполни в SQL Editor Supabase после schema.sql
-- =============================================

-- 1. Таблица support_threads (один тред = один диалог с пользователем/гостем)
create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id bigint references public.users(id) on delete set null,
  tgid text,
  email text,
  display_name text not null,
  referrer_id bigint references public.users(id) on delete set null,
  tg_topic_id integer,
  status text not null default 'open' check (status in ('open', 'closed')),
  source text not null default 'web' check (source in ('web', 'mini_app', 'tg')),
  last_message_text text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.support_threads is 'Треды чата поддержки: один тред на пользователя/гостя, привязка к ветке TG через tg_topic_id.';

create index if not exists idx_support_threads_user_id on public.support_threads(user_id);
create index if not exists idx_support_threads_email on public.support_threads(email) where email is not null;
create index if not exists idx_support_threads_tg_topic_id on public.support_threads(tg_topic_id) where tg_topic_id is not null;
create index if not exists idx_support_threads_created_at on public.support_threads(created_at desc);

drop trigger if exists support_threads_updated_at on public.support_threads;
create trigger support_threads_updated_at
  before update on public.support_threads
  for each row execute function public.set_updated_at();

-- 2. Таблица support_messages
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  user_id bigint references public.users(id) on delete set null,
  author text not null check (author in ('user', 'agent')),
  text text not null,
  source text not null default 'web' check (source in ('web', 'mini_app', 'tg')),
  tg_message_id bigint,
  created_at timestamptz not null default now()
);

comment on table public.support_messages is 'Сообщения в чате поддержки. author=user — от клиента, author=agent — от ТП (из Telegram).';

create index if not exists idx_support_messages_thread_id on public.support_messages(thread_id);
create index if not exists idx_support_messages_thread_created on public.support_messages(thread_id, created_at);

-- RLS
alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "support_threads_all" on public.support_threads;
create policy "support_threads_all" on public.support_threads for all using (true) with check (true);

drop policy if exists "support_messages_all" on public.support_messages;
create policy "support_messages_all" on public.support_messages for all using (true) with check (true);

-- Realtime для поддержки ответов ТП на сайте
alter table public.support_messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.support_messages;
exception when duplicate_object then null;
end $$;
