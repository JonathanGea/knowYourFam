-- KnowYourFam: user-owned tutorial and onboarding progress lives in PostgreSQL.
-- Tutorial snapshots are isolated practice data, never the real Family Tree.
create table if not exists public.user_learning_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dismissed boolean not null default false,
  completed text[] not null default '{}',
  progress jsonb not null default '{}'::jsonb,
  snapshots jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_learning_progress_object check (jsonb_typeof(progress) = 'object'),
  constraint user_learning_snapshots_object check (jsonb_typeof(snapshots) = 'object')
);
alter table public.user_learning_states enable row level security;
revoke all on public.user_learning_states from anon;
grant select, insert, update on public.user_learning_states to authenticated;
create policy "learning_read_own" on public.user_learning_states
  for select to authenticated using (user_id = (select auth.uid()));
create policy "learning_create_own" on public.user_learning_states
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "learning_update_own" on public.user_learning_states
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
