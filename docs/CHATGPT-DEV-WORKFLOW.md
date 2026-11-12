# KnowYourFam — ChatGPT Full-stack MVP Development Workflow

**Status:** Agreed working proposal, 2026-11-13  
**Repository:** `JonathanGea/knowYourFam`  
**Development branch:** `dev/fullstack-mvp`  
**Protected working boundary:** Do not modify or merge into `main` unless expressly requested.

## Goal

Build the KnowYourFam MVP through ChatGPT conversations, commit verified changes directly to `dev/fullstack-mvp`, and keep the legacy root `index.html` + JSON workflow on `main` independent.

## Stack

- Frontend: Angular + TypeScript + Tailwind CSS.
- **Temporary backend adapter:** Supabase (PostgreSQL, Supabase Auth, RLS, limited RPC). It is replaceable by an own backend later.
- **Durable database core:** plain PostgreSQL domain tables with app-owned UUIDs, migration files, and isolated Supabase security/auth integrations. See `docs/ADR-001-BACKEND-PORTABILITY.md`.
- CI: GitHub Actions on `dev/fullstack-mvp`; build and test are required before calling a change working.
- Optional cloud preview: a hosting provider configured to build the development branch.
- Additional business logic: SQL functions / Edge Functions only when required; no Spring Boot service initially.

## Repository conventions

```
/
├── index.html                    # Existing legacy HTML prototype. Leave untouched.
├── docs/
│   ├── DATABASE-DESIGN.md        # Existing design
│   └── CHATGPT-DEV-WORKFLOW.md   # This workflow, new branch only
├── database/migration/           # Earlier Flyway-oriented schema: reference only
├── frontend/                     # NEW Angular workspace (not generated yet)
│   └── ...
├── supabase/
│   ├── migrations/               # NEW Supabase-compatible migrations
│   ├── seed.sql                  # Synthetic, never real family data
│   ├── tests/                    # Database / RLS tests
│   └── config.toml
└── .github/workflows/            # Angular and database quality checks
```

Do not run `database/migration/V1__family_tree_core.sql` unchanged: it is a **draft** with an auth-coupled `users.password_hash`. Keep domain `users`/`app_users` independent of Supabase `auth.users`, add an `auth_identities` mapping, and isolate Supabase-specific RLS/grants and login subject resolution into adapter migrations. See `docs/ADR-001-BACKEND-PORTABILITY.md`. No duplicate authoritative migration histories.

## Scope for first vertical slices

1. Angular shell and responsive family tree layout, including a provider-neutral repository interface. Preserve root `index.html`.
2. Portable PostgreSQL core adaptation with app-user identities, separate Supabase Auth/RLS bindings, synthetic seed data and tested migrations.
3. Read-only family tree using Supabase; same family relationships as current JSON prototype.
4. Person CRUD and relationship create/remove, no accidental person deletion.
5. Focus Person (parent generation, focal peers, partners and their origin parents/siblings, children).
6. Expand/Collapse exactly one explicit family unit per action. Batch at most 12 additional people per expansion; no recursion through the whole graph.
7. Search, recenter, fit view, touch zoom/pan and safe mobile behavior.

## Workflow for each ChatGPT task

1. State feature and acceptance criteria in chat (example: “Add parent of Rudi, verify ancestor appears”).
2. Read latest files from `dev/fullstack-mvp`, not `main`; inspect schema and existing tests.
3. Make the smallest implementation that completes the task; prefer focused commits.
4. Run available automated checks (format, types, test, Angular build, database migrations and RLS test). If a check cannot run in the chat runtime, explicitly report it and rely on configured CI.
5. Commit/push to `dev/fullstack-mvp`, not `main`; return commit SHA, changed paths, validation results and a preview link if configured.
6. Do not merge to `main` without explicit approval. The independent HTML/JSON workflow remains functional.
7. When starting a new chat, re-read this file and current development branch before editing.

## Required safeguards

- Keep schema changes versioned and repeatable. Do not edit DB schema only in a dashboard. Core database definitions must apply to ordinary PostgreSQL without Supabase's `auth` schema.
- Use Supabase publishable/anon key in browser only with tested RLS policies. Never commit a secret/service_role key. Never import the Supabase SDK directly into Angular feature UI or domain/application layers.
- Authenticate every operation; enforce same-tree foreign keys and membership/roles.
- Parent-child edge direction is explicit; reject ancestry cycles in a transaction.
- A shared child does not prove a marriage; partner relations are explicit.
- Use soft delete for relationships; deleting a relation never deletes a person.
- Branch expansion and camera/zoom are UI state, never family facts.
- Never use real private family data as test seed. Use synthetic examples.
- Do not mutate a hosted database without a known project/environment, confirmation for destructive actions, and a backup plan.
- Keep all commands, migrations and CI results auditable in GitHub.
- Code branch separation does not imply database environment separation. Use a dedicated development Supabase project.
- Changes made by the HTML/JSON developer on `main` do not automatically appear on this branch. Review and cherry-pick/merge selectively if requested.

## Known constraints

- GitHub connector can edit/commit files but does not itself run the complete Angular app or deploy a site.
- ChatGPT execution environments are temporary. They are not an always-on dev server.
- Dependency installation and UI/browser tests can depend on runtime/tool availability.
- GitHub Actions is the reliable, reproducible place for the complete build/test checks.
- A preview URL requires a separately configured hosting provider; it is not created automatically by a GitHub branch.
- Supabase remote database changes require a connected Supabase integration or separate authenticated deployment pipeline.
- Migrating to a self-hosted backend still requires an auth migration, authorization checks, API implementation, and potentially media-storage migration. Database portability is not a zero-work migration.
- Supabase project/database branching is a separate feature from GitHub branching; do not assume it is included.
- Main-branch and development-branch changes can diverge and require deliberate integration.

## Ready-for-review definition

A task is DONE only when requested behavior works, relevant tests pass (or blockers are plainly stated), the branch includes the committed code, and the assistant gives the user a precise summary and commit link.

## Suggested next task

Set up `frontend/` as a minimal Angular TypeScript workspace in `dev/fullstack-mvp` with Tailwind and a placeholder shell. Add a GitHub Actions build workflow. Do not yet connect any real family data.
