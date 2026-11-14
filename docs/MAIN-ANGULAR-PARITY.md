# KnowYourFam — Main → Angular Feature & Behavior Parity

**Source of truth:** `main/index.html`, Git blob `1d52703f6572639c4b64b1e476fe7a0eba201a72`.  
**Implementation target:** `dev/fullstack-mvp/frontend` (Angular standalone).  
**Status:** substantial functional migration completed; **NOT 100% UI/behavior parity**.  
**No changes to `main`.** Backend permissions are a separate vertical slice.

## Why the Angular demo previously looked so different

The Angular frontend started with a new design and a 31-person **fictional** sample, while the actual `main` page loads a separate `githubSeed` of **124 Persons** (135 parent edges, 45 partner edges, 18 direct sibling edges). The browser screenshot showing **125** reflects a distinct local saved version, not the static GitHub seed. Angular now defaults to the main `githubSeed` on a **fresh Angular localStorage**, but never replaces data already stored under its v2 key. Users can import the exported 125-Person JSON explicitly.

## Feature crosswalk

| Main source function / UI | Angular implementation | Status |
|---|---|---|
| `githubSeed` and `sample` | `infrastructure/main-reference.data.ts`, `main-sample.data.ts` | Seed parity (124), tutorial sample (31) |
| `makeLayout()`, family grouping, Overview Spine V2 | `features/family-tree/main-layout-engine.ts` | Ported; source snapshot pinned |
| `drawTree()` family bus/corridor connectors | `main-connector-engine.ts`, `family-layout.ts` | Core geometry ported; style not pixel-identical |
| `visibleFamilyGraph`, `focusDefaultBranchKeys`, `branchMembers`, `toggleBranch` | `application/family-tree.store.ts` | Main directional Focus/Overview and branch graph; parity tests ongoing |
| `renderKeepingAnchor`, `zoomAt`, pan/pinch/fit | `family-tree.page.ts` | Available; mobile visual QA pending |
| Sidebar navigation and member search | Angular Family Tree left navigation and `/members` | Available; styling still differs from main |
| `renderDrawer`, `showQuickActions` | quick person actions and contextual inspector | Functional subset; exact layout/actions not yet 1:1 |
| `renderProfilePage`, `savePerson`, photo/date/birth-order fields | full Person edit modal, `application/family-graph.ts` | Main data fields & validation implemented |
| `addRelation`, `isCyclic` | pure `addRelation` and cycle guard in `family-graph.ts` | Implemented with unit tests |
| `linkChildToCouple` | `family-graph.ts` + pair-child modal | Atomic relationship addition and cycle tests |
| Direct relationship delete and Person delete | unlink edge, soft-archive Person + affected relationship count | Functional demo; NOT collaborative permission enforcement |
| `renderRulesPage` | `/rules` read-only main reference | Source content ported; old inline UI remapped to links |
| `renderGuidePage`, `LEARNING_GROUPS`, `LEARNING_ARTICLES` | `/guide` and `/guide/:id` | 6 categories and 14 source articles |
| `startTutorial`, isolated teaching data | disposable 31-Person learning tree, guided banner | Isolation implemented; step-by-step auto actions still partial |
| `renderDeveloperPage` | `/developer` | 15 chapters already ported |
| `exportJSON`, `importJSON` | Angular backup export + main-compatible export and importer | Supported; legacy JSON cannot retain confirmation statuses |
| `renameTree` | Angular rename tree modal | Implemented |
| Real identity claim, Owner/Editor/Contributor/Viewer rights | `docs/PERMISSIONS-AND-CONTRIBUTIONS-MVP.md` | **Design only**, no Auth or backend enforcement |

### What "ported" means

No claim of visual pixel equivalence is made unless a Playwright comparison has passed for the **same JSON** and the same viewport. The original source remains the reference when there is a disagreement. Pure engine logic and functional UI can pass tests without looking exactly the same as the HTML prototype.

## Acceptance scenarios for this vertical slice

- A freshly cleared Angular localStorage loads the same 124-Person `githubSeed` as current `main`. Existing saved Angular data remains unchanged.
- A user can export their 125-Person tree from main and **import** it in Angular, preserving Persons, direct relationship directions, names, known birth order, safe photos and notes.
- Child, parent and direct sibling links have correct directions and are visible on Focus and Overview. Creating an ancestor of the earliest generation increases canvas depth.
- Parent cycles and duplicate links are rejected **before** browser-local persistence.
- Connecting a child to a known couple is transactional: either all missing parent edges are added or none are added.
- Editing a Person preserves its id and existing family links; deleting a direct edge keeps both Person profiles.
- Archiving a Person soft-deletes that Person plus its incident edges; unrelated Persons remain.
- Focus, Zoom, Expand/Collapse and Fit do not alter stored family data.
- Opening a tutorial uses disposable practice data, and editing that sample never writes to browser storage; closing or changing route restores the actual family tree.
- Routes `/members`, `/guide`, `/rules` and `/developer` are usable. Developer Docs remains manually removable, not environment-gated.

## Test commands

```bash
cd frontend
npm install
npm run test:canvas
npm run build
npm run test:serve
npm run dev
```

GitHub Actions executes the canvas & functional Node tests, Angular production build, and static server SPA routes. Successful CI is **build / smoke verification**, not automatically screenshot parity.

## Remaining parity work

1. **Pixel/interaction comparison:** desktop and mobile screenshots of `main` and Angular with the same JSON (focus, overview, 10+ generations, wide sibling groups, multi-partner cases), detect/correct connector bends and node alignment.
2. **Complete guided tutorial:** convert the main tutorial's action-driven prompts and overlay/learning progress to Angular state transitions; the current safe isolated tour is not all of main's tutorial.
3. **UI details:** mirror the exact topbar, cards, profile drawer, contextual menus, draggable/scrollable lists, and toolbar density.
4. **Advanced editor parity:** show all relationship variants and source-specific controls, feedback toasts, explicit conflict resolution and upload behavior on every device.
5. **Production authorization:** add Auth/Person Claim, role-based permissions, proposal/approval, audit history and Supabase/PostgreSQL persistence. Client demo operations are not permission enforcement.

## Development rules

- Do not replace Angular files with `main/index.html`, or merge the prototype branch wholesale.
- Source of truth for behavior is `main`, but **authorization** follows the final permission ADR.
- Keep `main` untouched and implement in `dev/fullstack-mvp`; **one feature task = one commit** with tests and documentation.
- Prefer pure graph operations and typed adapters; avoid further `// @ts-nocheck` in new code.
- Protect local family data on every seed change, tutorial, import, and soft-delete. Import prompts for explicit replacement.
