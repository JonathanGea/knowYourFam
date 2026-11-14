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
- Identical **fictional 31-person sample** from `main/index.html`, typed parent/partner relationships and derived siblings (separate v2 localStorage key).
- Focus Person following current `main` rules (parents, grandparents, parental siblings, focal siblings, partners and children); spouse-origin branches are expandable separately.
- Full Overview including Overview Lineage Spine V2 for 6+ generations; source-migrated family-group layout and orthogonal family buses; four directional on-canvas expansion buttons (`up/side/down/pair`), independent collapse and 12-person manual paging; anchored pan, zoom, mobile pinch, Fit All and fullscreen.
- Basic quick panel on node click (siblings, branch actions, focus, add), focus back history and reset branches.
- Read-only `/developer` page with all 15 developer chapters transcribed from the latest `main`.
- Create Person with optional new parent/child/partner relationship (demo only; relation marked `unconfirmed`).
- Browser-local demo data persists in localStorage and can be exported as JSON.

## Source-parity canvas implementation

The main-branch `index.html` has a mature 33k-character layout engine. Rather than rebuilding its geometry from scratch, the Angular canvas now reuses that core algorithm inside isolated modules. The extracted code is temporarily marked `// @ts-nocheck`; the public `LayoutNode` / `LayoutEdge` interfaces stay typed.

Read `docs/CANVAS-MAIN-ANGULAR-MIGRATION.md` for source hash, layout rules, current parity coverage, and known gaps. Source-faithful developer documentation is in `docs/DEVELOPER-CANVAS-MAIN-REFERENCE.md` and accessible via `/developer`.

Run canvas regression checks without an npm install:

```bash
node --experimental-strip-types --test scripts/canvas-parity.test.mjs
```

For full Angular build, install dependencies and run `npm run build`. The GitHub Action performs both the canvas smoke tests and build.

## Not implemented (deliberately)

- Supabase project/database connection, production migrations, Auth and RLS.
- Person invitation/claim, permission enforcement, contribution proposals, approval workflow, audit history.
- Production verification of graph layout on large/multi-partner families, virtualized large graphs, complete mobile gesture QA, and full UI parity with the legacy prototype.
- Real simultaneous collaboration, API authorization, the legacy rich profile editor, import/export parity and interactive tutorial.

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
    family-layout.ts                # Typed canvas facade
    main-layout-engine.ts           # Direct geometry port from main
    main-connector-engine.ts        # Parent buses / corridor SVG port from main
  scripts/
    canvas-parity.test.mjs          # Node-only layout regression tests
    family-tree.page.ts             # UI controller
    family-tree.page.html           # UI template
    family-tree.page.css            # Responsive styling
  features/developer/
    developer.page.ts               # Read-only reference page
    developer-reference.data.ts     # Source snapshot of 15 chapters
  infrastructure/
    main-sample.data.ts             # Fictional dataset from main
```

When ready, implement a Supabase adapter **behind the same repository interface** (and extend async APIs as necessary), then replace it later with an HTTP adapter for Spring Boot / Node. Do not import `supabase-js` in UI or domain layers. Authentication identity must remain distinct from Person identity.

## Git and collaboration

- Commit Angular changes to `dev/fullstack-mvp`.
- Never modify/merge to `main` without explicit instruction.
- Keep the old root `index.html` as reference; it still supports the independent HTML/JSON developer.
- CI config: `.github/workflows/angular-dev.yml`.
