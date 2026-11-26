-- QuestBoard schema
--
-- Security model
--   • Every table has Row Level Security enabled.
--   • Users can only see and change their own profile and quests.
--   • Public numbers (leaderboard, global stats) come from SECURITY DEFINER
--     functions that return aggregates only, so no service-role key is
--     ever needed by the app.

-- ─── Types & helpers ────────────────────────────────────────────────────

create type public.difficulty as enum ('easy', 'medium', 'epic');

create function public.difficulty_xp(d public.difficulty)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case d when 'easy' then 10 when 'medium' then 25 else 100 end
$$;

-- ─── Profiles ───────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (display_name ~ '^[[:alnum:] _-]{2,24}$'),
  created_at timestamptz not null default now()
);

create unique index profiles_display_name_key
  on public.profiles (lower(display_name));

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Profiles are created by the trigger below, never directly by clients.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form say "name taken" before creating the auth user.
create function public.display_name_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where lower(display_name) = lower(name)
  )
$$;

-- ─── Quests ─────────────────────────────────────────────────────────────

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  notes text not null default '' check (char_length(notes) <= 500),
  difficulty public.difficulty not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index quests_owner_created_idx
  on public.quests (owner_id, created_at desc);

alter table public.quests enable row level security;

create policy "Users can read their own quests"
  on public.quests for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own quests"
  on public.quests for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own quests"
  on public.quests for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own quests"
  on public.quests for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- ─── Public aggregates ──────────────────────────────────────────────────

create function public.leaderboard(max_rows integer default 10)
returns table (display_name text, xp bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.display_name,
    coalesce(
      sum(public.difficulty_xp(q.difficulty))
        filter (where q.completed_at is not null),
      0
    )::bigint as xp
  from public.profiles p
  left join public.quests q on q.owner_id = p.id
  group by p.id
  order by xp desc, p.created_at asc
  limit least(greatest(max_rows, 1), 50)
$$;

create function public.global_stats()
returns table (
  adventurers bigint,
  quests_created bigint,
  quests_completed bigint,
  xp_earned bigint,
  epic_slain bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.profiles),
    count(q.id),
    count(q.completed_at),
    coalesce(sum(public.difficulty_xp(q.difficulty))
      filter (where q.completed_at is not null), 0)::bigint,
    count(*) filter (where q.completed_at is not null and q.difficulty = 'epic')
  from public.quests q
$$;

-- ─── Grants ─────────────────────────────────────────────────────────────
-- Explicit grants so the Data API works even where tables aren't exposed
-- by default. RLS policies above still decide which rows are visible.

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.quests to authenticated;

revoke execute on function public.leaderboard(integer) from public;
revoke execute on function public.global_stats() from public;
revoke execute on function public.display_name_available(text) from public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.leaderboard(integer) to anon, authenticated;
grant execute on function public.global_stats() to anon, authenticated;
grant execute on function public.display_name_available(text) to anon, authenticated;
