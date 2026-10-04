-- Lexoria: player saves + AI usage quota.
-- Every table is private to its owner via RLS; the Edge Functions use the service role only for ai_usage.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  class text not null check (class in ('scholar', 'bard', 'ranger', 'sage')),
  exam text not null check (exam in ('ielts', 'toeic')),
  target numeric not null,
  exam_date date,
  created_at timestamptz not null default now()
);

create table public.player_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  level int not null default 1 check (level >= 1),
  xp int not null default 0 check (xp >= 0),
  hp int not null check (hp >= 0),
  streak_count int not null default 0,
  streak_last_day date,
  flags jsonb not null default '{}'::jsonb,
  weapons jsonb not null default '[]'::jsonb,
  equipped_weapon_id text,
  mistakes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- One row per (player, word). `card` is the FSRS state; `due` is denormalised for "what to review" queries.
create table public.vocab_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  word_id text not null,
  card jsonb not null,
  due timestamptz not null,
  primary key (user_id, word_id)
);
create index vocab_cards_due_idx on public.vocab_cards (user_id, due);

create table public.quest_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  quests jsonb not null,
  primary key (user_id, day)
);

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

alter table public.profiles enable row level security;
alter table public.player_stats enable row level security;
alter table public.vocab_cards enable row level security;
alter table public.quest_progress enable row level security;
alter table public.ai_usage enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own stats" on public.player_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cards" on public.vocab_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own quests" on public.quest_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Players may read their quota but never write it
create policy "read own ai usage" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Atomically consume one AI call from today's quota. Returns false when the quota is exhausted.
create function public.consume_ai_quota(p_user uuid, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  used int;
begin
  insert into ai_usage (user_id, day, count)
  values (p_user, current_date, 1)
  on conflict (user_id, day) do update
    set count = ai_usage.count + 1
    where ai_usage.count < p_limit
  returning count into used;
  return used is not null;
end;
$$;

revoke execute on function public.consume_ai_quota(uuid, int) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, int) to service_role;
