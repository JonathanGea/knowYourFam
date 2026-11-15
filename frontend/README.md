# KnowYourFam — Angular MVP, Supabase database-only

The runnable application lives in `frontend/` on `dev/fullstack-mvp`.
The root `index.html` on `main` is a **separate historical HTML prototype**, not the
running Angular application. The Angular frontend no longer has browser-local
Family Tree storage or a guest/demo data repository.

## Stack and behavior

- Angular 22 standalone components + TypeScript + Tailwind
- Supabase Auth email/password login, registration, email confirmation and password reset
- Supabase PostgreSQL for `family_trees`, `persons`, `relationships`
- `user_learning_states` for onboarding and guided tutorial progress/snapshots
- RLS restricts data by authenticated tree owner and memberships
- No offline write queue or demo fallback. Network errors are visible to users.
- A tutorial uses **temporary in-memory practice data** while active (not the real
  family); its progress is saved to PostgreSQL and the real tree is restored on exit.
- Auth tokens are temporarily stored in `sessionStorage` to maintain the authenticated
  login and survive reloads within a tab. Family Tree data is **never** stored there.
  Closing the tab may require signing in again.

## Install / run

```bash
cd frontend
npm install
npm run dev
```

In Supabase `knowyourfam`, run `database/migration/V3__user_learning_states.sql`
(the migration is already applied to the configured cloud project). Under
Authentication → URL Configuration, allow `http://localhost:4200/login`
and your deployed `https://YOUR_DOMAIN/login` redirect origin. Set the Site URL
to the deployed application URL. Open `/register` to register and confirm your email. Sign in at `/login` using your email and password. Use `/forgot-password` and `/reset-password` for account recovery. Routes such as `/`, `/members` and `/person/:id` redirect
unauthenticated visitors to `/login`.

On first login the API creates an empty "Keluarga Saya" tree, not fictitious
sample Persons. Add Persons and relationships through the existing Angular
canvas. Refresh or open the application on another device with the same email
to read the same database records. Edits and soft deletions go to Supabase.

Existing JSON Import adds a **new** tree to PostgreSQL by explicit user action.
Export JSON is a manual backup download; it is not browser-local app persistence.
If you have meaningful data in an older browser-only build, export it **before
switching deployments** and import it after login. No automatic transfer is
performed, to avoid uploading mock data or overriding private trees.

## Deployment on Railway

Use `dev/fullstack-mvp`, Root Directory `/frontend`.
The `railway.json` build command installs packages and builds Angular.
Start command is `npm start` (the `server.mjs` static server).
Use Railway → Deployments → deploy the latest commit manually if auto deploy
is disabled.

## Validation

```bash
npm run test:canvas
npm run build
npm run test:serve
```

CI also launches a real Chromium browser and confirms protected routes never
render private data before login. Historical pixel-by-pixel parity tests against
the public HTML demo cannot run against a live authenticated database without
an isolated test account; source-level graph/canvas parity unit tests remain.
Do not claim database write E2E coverage without testing a real signed-in user.

## Architecture and limitations

```text
src/app/
  application/family-tree.store.ts          # canonical graph state, no storage
  application/require-cloud-auth.guard.ts   # protect all data routes
  domain/family-tree.repository.ts          # provider-independent interface
  infrastructure/supabase-family-tree.repository.ts
  infrastructure/supabase-connection.service.ts
  infrastructure/learning-progress.service.ts
  features/auth/login-login.page.ts
```

Both tree and tutorial changes require a valid Supabase session. The browser
contains **only a publishable API key**; never expose secret/service_role keys,
database passwords or JWT signing secrets.

Tree saving currently issues multiple API requests, not a single database
transaction. Simultaneous editors and partial failure recovery need transactional
RPC/backend work before collaborative editing. Profile photos are currently
limited compressed data URLs stored in the existing text column; migrate to
private Storage for production scale. Permission/collaboration workflows are
out of scope for the current Person-focused MVP.

## Auth user experience

- `/login`: email and password sign-in; after login return to the protected URL.
- `/register`: email + password + confirmation, then follow the Supabase verification email (if confirmation is enabled).
- `/forgot-password`: request a password reset email.
- `/reset-password`: set a new password through the Supabase recovery link.
- `/account`: view the current email, return to tree, and securely sign out.

Allow `http://localhost:4200/login`, `http://localhost:4200/reset-password`,
`https://YOUR_DOMAIN/login`, and `https://YOUR_DOMAIN/reset-password` in
Supabase Authentication -> URL Configuration. Configure production Site URL.
No password is stored in frontend localStorage, the database, or the application logs.
