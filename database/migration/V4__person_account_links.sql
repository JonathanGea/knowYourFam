-- KnowYourFam: explicit mapping from authenticated account to one Person.
-- A single account can claim one Person, and one Person cannot be claimed twice.
-- This deliberately does NOT modify persons.claimed_by, which is protected by
-- persons_guard against direct changes.
create table if not exists public.person_account_links (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  person_id uuid not null unique references public.persons(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint person_account_links_person_not_null check (person_id is not null)
);
alter table public.person_account_links enable row level security;
revoke all on public.person_account_links from anon;
grant select, insert, delete on public.person_account_links to authenticated;
create policy person_account_links_read_self on public.person_account_links
  for select to authenticated
  using (auth_user_id = (select auth.uid()));
create policy person_account_links_claim_own_tree on public.person_account_links
  for insert to authenticated
  with check (
    auth_user_id = (select auth.uid()) and
    exists (
      select 1 from public.persons p
      join public.family_trees t on t.id = p.tree_id
      where p.id = person_account_links.person_id
        and p.deleted_at is null
        and p.created_by = (select auth.uid())
        and p.claimed_by is null
        and t.owner_id = (select auth.uid())
    )
  );
create policy person_account_links_unlink_self on public.person_account_links
  for delete to authenticated
  using (auth_user_id = (select auth.uid()));
