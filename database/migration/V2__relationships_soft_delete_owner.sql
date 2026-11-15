-- Minimal permission for one-owner MVP: allow soft archive of own links.
-- No broad UPDATE on relationships; only deletion metadata may change.
grant update (deleted_at, deleted_by) on table public.relationships to authenticated;
create policy relationships_archive_own on public.relationships
  for update to authenticated
  using (
    deleted_at is null
    and created_by = (select auth.uid())
    and exists (
      select 1 from public.family_trees t
      where t.id = relationships.tree_id and t.owner_id = (select auth.uid())
    )
  )
  with check (
    deleted_at is not null
    and deleted_by = (select auth.uid())
    and created_by = (select auth.uid())
    and exists (
      select 1 from public.family_trees t
      where t.id = relationships.tree_id and t.owner_id = (select auth.uid())
    )
  );
