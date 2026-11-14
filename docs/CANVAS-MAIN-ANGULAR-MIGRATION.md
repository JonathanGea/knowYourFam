# KnowYourFam — Main Canvas → Angular Migration

**Status:** Stage 2 implemented — source engine, interactive canvas, matching demo, Developer Guide. Browser visual QA and Angular build still require verification.  
**Target:** `dev/fullstack-mvp`, `frontend/` only  
**Source:** `main/index.html` captured at Git blob `1d52703f6572639c4b64b1e476fe7a0eba201a72` (14 Nov 2026).  
**Rule:** `main` is the living HTML/JSON reference; Angular is an independent implementation, **never auto-merge main into dev**.

## Why simple git merge does not work

`main` contains a monolithic HTML file with DOM event handlers, CSS and embedded vanilla JavaScript. Angular is a TypeScript standalone app with separate components, signals and DI. Merging the Git branches would copy files, **not translate canvas algorithms**. The migration intentionally extracts pure geometry code, adapts its data contract, then connects it to Angular UI.

## Implemented in Angular (Stage 1)

| Rule/function in main | Angular implementation | Notes |
|---|---|---|
| `makeLayout()` | `features/family-tree/main-layout-engine.ts` | Original sophisticated grouping + balancing logic extracted into pure module, source hash pinned |
| Family bus, connector routing & hidden-parent sibling brackets | `main-connector-engine.ts` | Extracts SVG paths as data (no legacy HTML injection) |
| Graph/position adapter | `family-layout.ts` | Typed public output: node positions, edge paths, generations, warnings |
| `focusDefaultBranchKeys()` / `focusFamilyMembers()` | `application/family-tree.store.ts` | Direct parents, grandparents, parent siblings, focal siblings, partners & children per current main source |
| `up`, `side`, `down`, `pair` | `store.branchKeys`, `branchMembers`, `branchOptions` | Independent collapse/open on every eligible Person |
| Birth-order sibling ranking | `Person.birthOrder`, `Person.birthDate` | Known order/date first; no inference from gender or name |
| Spouse grouping, separate birth families | Extracted layout engine | No duplicate Person cards; all groups are visual only |
| Family balance / nonoverlap / sibling order | Extracted layout engine | Reused original row packing and optimization |
| Canvas panning & mouse wheel/trackpad/pinch zoom | `family-tree.page.ts` | PointerEvents, pointer capture, anchored zoom |
| Keep anchor on Expand/Collapse | `keepAnchor()` | Attempts stable screen position of expanded Person |
| Fit view, generation lanes | Angular page and scoped CSS | Main-style Fit All (minimum .004), canvas transform, dynamic generations |
| Node-level expand buttons | `family-tree.page.html` / `branchControls` | Up / side / down / pair positioned around visible Person cards |
| Quick person actions and sibling shortcuts | `family-tree.page.ts/html` | Demo quick panel; not the full profile page yet |
| Focus history, branch reset and fullscreen | `family-tree.store.ts` / page | History back, reset and fullscreen fit |
| Main sample demo 31 Persons | `infrastructure/main-sample.data.ts` | Fictional sample from main, independent v2 localStorage key |
| Read-only Developer Guide route | `/developer`, `developer-reference.data.ts` | 15 source chapters from main, explicitly labeled as main documentation |
| Overview Lineage Spine V2 | `main-layout-engine.ts` | Latest source port, only applied for Overview of 6+ generations |
| Add parent/child/partner demo | Angular demo modal + store | localStorage only; provisional relationships, NO real permission/auth |

**Compatibility boundary:** The extracted `makeLayout()` and connector bodies are initially quarantined under `// @ts-nocheck`. Their **public interfaces are typed**. This preserves the complex working geometry while subsequent work introduces strict internal typing without changing outputs. Do not add unrelated features to these transitional files.

## Source documentation and UI

- Markdown transcription of all 15 original developer chapters: `docs/DEVELOPER-CANVAS-MAIN-REFERENCE.md`
- Read-only Angular route: `/developer`
- Source snapshot data: `frontend/src/app/features/developer/developer-reference.data.ts`
- Every chapter still describes **main**. Only this migration ledger describes Angular's achieved parity.
- Frozen source blob for current port: `1d52703f6572639c4b64b1e476fe7a0eba201a72`. Re-check on every new main change.

## Non-negotiable geometry invariants

1. No visual duplicate of a Person within one canvas. Position keyed by Person UUID/id.
2. Couple/partner cards stay together on one generation; male-left/female-right when both explicitly known; otherwise preserve recorded order. **Do not infer sibling age from gender.**
3. Each spouse's birth family is a separate ancestral branch; marriage does not create parent-child edges.
4. Siblings from the same recorded parents are on the same generation and grouped; known `birthOrder` or birth date orders elder left to younger right. Unknown dates are not fabricated.
5. Parent-child is a directed relation and must be visible in correct generation direction. Adding an ancestor can introduce 4th/5th/6th+ generations.
6. Parent/child buses are based on parent set; a bus cannot be shared by unrelated families. Orthogonal corridors should avoid routing through cards.
7. Hidden parents may still establish a dashed sibling bracket among visible children without making the hidden parents visible.
8. Focus controls *initial visibility*, never permanently locks expansion. Expand/Collapse does not delete people or relationships.
9. One click opens only the specified directional branch; no recursive explosion. Manual expansions load at most 12 new members per page.
10. Re-centering changes visual focus; data and authorization stay unchanged.

## Same-tree visual comparison (important)

`main` currently loads its own `githubSeed` by default (or user data from localStorage), whereas the Angular demo initially loads the **fictional `sample`** (31 Persons) included in `main/index.html`. The two initial trees are therefore not necessarily identical even when both layouts obey the same rules.

To compare **the exact same family graph**:

1. Open the running `main` prototype and click **Ekspor JSON**.
2. Open Angular `dev/fullstack-mvp` and click **Impor JSON**.
3. Review the replacement confirmation (browser-local demo only).
4. Compare Focus Person, Full Overview, sibling order, partner spacing, parent-child buses, and branch actions at the same person.

The Angular demo importer accepts both `main` `people/parent/partner/sibling` JSON and the Angular `people/relationships` format. It validates duplicate IDs, missing endpoints and parent cycles. **Do not use this client-side importer as a substitute for backend permissions.** The imported JSON is kept in localStorage, not sent to a server.

The source SVG router additionally renders main-style parent junction and partnership circles, instead of dropping the circle elements.

## What remains to reach full feature parity

Stage 2 does **not** claim that all `main` UI features were copied:

- Full legacy Quick Actions parity (Angular has a basic quick panel), rich editable profile page, multiple photo fields, and local import controls.
- User guide and isolated interactive tutorials from `main`. Developer Guide is now available at `/developer`.
- Accessibility / keyboard navigation checks, refined collision avoidance for massive graphs and multi-partner arrangements.
- Perfect rendering equivalence of SVG connector decorations (dots/circles), lane labels and all responsive toolbar details.
- UX parity for modal confirmation, delete-relation, editable sibling facts, relationship date fields, local history.
- Auth, invitations, permission review, Supabase adapter / custom backend are separate **later stages**, not included in this canvas migration.

## Required verification

Automated Node-only tests (no database required):

```bash
cd frontend
node --experimental-strip-types --test scripts/canvas-parity.test.mjs
```

Checks include:
- Exact 31-person fictional sample from main and 15 documentation chapters.
- Ten-generation Overview with Overview Lineage Spine V2 and collision tests.
- Partner groups, elder sibling left, child generation below parent.
- Non-overlapping cards on the same generation.
- Family bus + partner connectors built successfully.
- Hidden-parent siblings drawn as siblings.
- Adding fifth ancestor generation grows layout.

Angular CI (`.github/workflows/angular-dev.yml`) runs these checks before `npm install` and `npm run build`. Browser/Playwright mobile and visual regression tests are a recommended next task, not represented as completed.

## Safe workflow for future changes in main

1. Record the latest `main/index.html` blob SHA and compare to the pinned source SHA in the engine.
2. Inspect new changes in geometry, branching, pointer behavior, data and related developer documentation in main.
3. Migrate only the affected logic into the typed Angular modules. **Do not copy/overwrite Angular app files with the monolithic HTML.**
4. Add or update a focused parity test for the new behavior.
5. Run Node canvas tests, Angular build, and browser visual tests when available.
6. Commit the changes to `dev/fullstack-mvp`, give the user a commit SHA and list of features / known gaps.
7. Do not modify or merge `main` unless explicitly asked.

## Data and backend portability

The canvas engine consumes standard `Person` and `FamilyRelationship` read models, independent of Supabase/Auth. Core genealogy is plain PostgreSQL (ADR-001); Angular talks to `FamilyTreeRepository`. A future Supabase or custom Spring Boot API only changes the data adapter, not layout rules. UI interactions are not authorization; follow `PERMISSIONS-AND-CONTRIBUTIONS-MVP.md` for real writes.
