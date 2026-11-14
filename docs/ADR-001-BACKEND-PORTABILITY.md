# ADR-001: Backend portability and temporary Supabase scope

Status: ACCEPTED FOR THE MVP ARCHITECTURE (implementation not yet migrated)  
Date: 2026-11-13  
Branch: `dev/fullstack-mvp` only. Do not change `main` without explicit approval.

## Decision

Supabase (PostgreSQL, Supabase Auth, RLS, optional RPC) is a **temporary implementation adapter** for the personal MVP, not the long-term domain model. The schema must remain **vanilla PostgreSQL-compatible**. The future backend could be Spring Boot, Node.js, or another service using that same relational family model.

This ADR controls new development and supersedes conflicting recommendations in the initial draft SQL or workflow. Do **not** deploy the initial `database/migration/V1__family_tree_core.sql` unchanged to Supabase.

## Invariants that survive a backend swap

1. `persons`, `family_trees`, `tree_members`, and parent/partner/sibling relationship tables use application-owned UUID identities and ordinary PostgreSQL constraints and indexes. `Person` is not an auth account.
2. Relationships are normalized: parent -> child is directed; partner and explicit sibling pairs are canonical unordered pairs; one shared child never creates a marriage automatically; deleting a relationship never deletes the people.
3. Parent ancestry cycles are rejected transactionally; all relationship endpoints validate that both people belong to the same tree.
4. `FamilyUnit`, Focus Person, family/origin expand, and generation numbers are **derived/read models**, not stored biological facts. Per-user view state may be persisted separately.
5. Use standard PostgreSQL DDL/types (UUID, DATE, TIMESTAMPTZ, TEXT, JSONB where appropriate), migration files, FK/index/unique/check constraints. No Supabase-specific auth type or `auth.users` foreign key in the **core domain tables**.
6. Photos are stored as paths or URLs in data; binary assets are in a storage provider behind a storage adapter.
7. Keep a stable data transfer contract for reading relatives, adding people, creating/removing relationships, and getting focus/branch projections. Angular components must not directly import `supabase-js`.

## Identity: required change before first deployment

The *draft* SQL currently defines `users.password_hash`, which mixes domain identity and authentication. Before generating/applying the first real Supabase migration:

- Keep `users` (or rename to `app_users` consistently **before** the initial deployment) as an application-owned profile with its own UUID, display name, and timestamps. No password hash needed there for the Supabase MVP.
- Add `auth_identities` as a separate mapping: `id`, `user_id` (FK to domain user), `provider` (e.g. `supabase`, later `local`), `provider_subject` (external auth subject), `created_at`, unique(`provider`, `provider_subject`). The domain `user_id` must **not** depend on matching the Supabase Auth UUID.
- Supabase Auth credentials stay in the provider-controlled `auth` schema. Later own-backend credentials can live in an explicitly separate auth module/schema with appropriate hashing and session controls.
- Keep Supabase-specific identity mapping, `auth.uid()`, grants and RLS in **platform-specific access-control migrations/functions**, not business entity definitions.
- Any internal API must resolve the logged-in provider subject to the application user and enforce tree membership. Never trust a user-provided `user_id` as an authorization decision.

These are **design commitments**. The existing V1 draft migration remains unchanged until the schema-implementation task, to avoid silently modifying a migration without database testing.

## Layering in Angular

```
frontend/src/app/
  domain/            # Person, FamilyTree, Relationship; pure TypeScript rules
  application/       # Use cases, validation contracts and data interfaces
  infrastructure/
    supabase/        # MVP implementation of interfaces
    http/            # Later implementation backed by own REST API
  features/          # UI; calls application services, not provider SDK
```

A provider-agnostic data contract could contain `getFocusedFamily(treeId, personId, options)`, `expandFamilyBranch(treeId, key, cursor)`, `createPerson`, `addParentChild`, `addPartner`, and `removeRelationship`. The exact DTOs must be finalized when the corresponding vertical slice is implemented; do not couple the UI to raw PostgREST response shapes.

## Transactions and permissions

- Multi-table operations (especially parent-child edits, duplicate prevention, tree membership) require transactional database functions or a secure server boundary; never pretend multiple unrelated browser requests are atomic.
- On Supabase MVP, enforce per-tree authorization in RLS and grants, backed by tests for authenticated Owner/Editor/Contributor/Viewer and unauthorized users, including Person-specific and proposal permissions.
- On an own backend, enforce the same logical tree membership rules in the service (possibly retaining database RLS as defense in depth).
- Never expose a `service_role` key to the frontend.
- SQL functions handling writes should explicitly check the authenticated app user and use least privilege; do not use unrestricted `SECURITY DEFINER` as a shortcut.

## Migration strategy

- **One deployable migration history per database/environment.** During Supabase MVP, keep executable migrations in `supabase/migrations/` and include portable DDL plus isolated provider-specific security/auth SQL. The earlier `database/migration/V1__family_tree_core.sql` is a DESIGN DRAFT / reference, not an additional concurrently deployed migration stream.
- When moving to an owned backend: export/restore PostgreSQL data, create a validated baseline migration for the new deployment system (Flyway etc.), migrate external auth identities/credentials separately, and replace only infrastructure adapters. No blind replay of both migration histories onto one database.
- Test that essential schema and relationship writes work against ordinary PostgreSQL without Supabase's `auth` schema. Also run Supabase-specific RLS checks in the Supabase environment.
- Plan a zero-downtime or controlled-cutover strategy and verify row counts, referential integrity, identity mapping, and media URLs during any future switch.

## Scope explicitly deferred

No custom Java/Spring Boot/Node server for now; no production hosting promise, microservices, Redis, multi-Family-Space federation, governance workflows, data verification, or production-level operational hardening. Only design the core schema and interfaces so later additions do not force a rewrite.

## Portability acceptance tests (before calling schema ready)

- Core domain DDL applies on plain PostgreSQL without Supabase `auth` dependency.
- `auth_identities` can map a Supabase subject and a future local subject to the same stable app-user UUID.
- Access rules deny users who are not tree members; write permissions are role- and impact-scoped (Owner, Editor, Contributor, Viewer) as specified by `docs/PERMISSIONS-AND-CONTRIBUTIONS-MVP.md`. Never use Family Tree kinship distance to grant edit permission.
- Relationships cannot link persons across trees, cannot loop parenthood, and can be soft deleted without deleting profiles.
- Angular domain/application imports contain **no** Supabase SDK dependencies; swapping the data adapter doesn't change feature component signatures.
- Migrations, test results, and eventual data-transfer plan remain in GitHub.

## Future backend migration checklist

1. Stand up the new backend with the same PostgreSQL model.
2. Implement the existing application-facing API/data contracts.
3. Map login identities; migrate users without assuming Supabase password hashes can be exported.
4. Reimplement/revalidate authorization and transactional relationship invariants.
5. Point Angular to the HTTP adapter, run integration tests, then cut over storage and hosted DB when ready.

**Bottom line:** fast Supabase MVP; durable PostgreSQL domain schema; explicit authentication and data-access boundaries; no permanent vendor lock-in in the core family graph.
