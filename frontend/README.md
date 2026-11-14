# KnowYourFam — Angular MVP Foundation

This is the **new Angular frontend** on `dev/fullstack-mvp`. The legacy root `/index.html` on `main` remains untouched.

## Stack

- Angular 22, standalone components, signals, strict TypeScript
- Tailwind CSS 4, plus component-scoped CSS
- A provider-independent `FamilyTreeRepository` boundary
- A `DemoFamilyTreeRepository` using `localStorage` only

## Run locally

Prerequisite: Node.js **24.15+** (Angular v22) and npm.

```bash
cd frontend
npm install
npm start
```

Open http://localhost:4200.

```bash
npm run build
npm run check
```

**Important:** The initial Angular scaffold was authored from ChatGPT without access to the npm registry in its execution container. There is not yet a committed npm lockfile. Generate and commit `package-lock.json` from an environment that can run `npm install`; CI currently uses `npm install`. Until CI succeeds, do not describe this project as build-verified.

## What works in this frontend foundation

- Responsive, mobile-friendly single-page Family Tree workspace.
- Demo family members, typed parent/partner relationships, and derived siblings.
- Focus Person with parents, siblings, partners, partner origins, and children.
- Full Overview, person selection, origin/family branch expansion (12 at a time), collapse, basic layout with connector paths.
- Create Person with an optional new parent/child/partner relationship (demo only; relation marked `unconfirmed`).
- Browser-local demo data persists in localStorage and can be exported as JSON.

## Not implemented (deliberately)

- Supabase project/database connection, production migrations, Auth and RLS.
- Person invitation/claim, permission enforcement, contribution proposals, approval workflow, audit history.
- Production graph layout, advanced partner/ancestor placement, virtualized large graphs, mobile pinch/pan polish.
- Real simultaneous collaboration, API authorization and a deployment preview.

**Do not use the demo write operations as a backend authorization model.** Final permissions are in `docs/PERMISSIONS-AND-CONTRIBUTIONS-MVP.md`. The current UI is an offline prototype to facilitate the upcoming vertical slices.

## Architecture

```text
src/app/
  domain/
    family-tree.model.ts            # Canonical TypeScript shapes
    family-tree.repository.ts       # Replaceable data boundary
  application/
    family-tree.store.ts            # Signals, Focus, Expand, demo use cases
  infrastructure/
    demo-family-tree.repository.ts  # Only adapter currently active
  features/family-tree/
    family-layout.ts                # Read model / geometry
    family-tree.page.ts             # UI controller
    family-tree.page.html           # UI template
    family-tree.page.css            # Responsive styling
```

When ready, implement a Supabase adapter **behind the same repository interface** (and extend async APIs as necessary), then replace it later with an HTTP adapter for Spring Boot / Node. Do not import `supabase-js` in UI or domain layers. Authentication identity must remain distinct from Person identity.

## Git and collaboration

- Commit Angular changes to `dev/fullstack-mvp`.
- Never modify/merge to `main` without explicit instruction.
- Keep the old root `index.html` as reference; it still supports the independent HTML/JSON developer.
- CI config: `.github/workflows/angular-dev.yml`.
