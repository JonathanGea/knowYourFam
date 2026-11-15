# KnowYourFam — Family Explorer Workspace v1.0

**Scope:** Angular family-tree page. **Base:** `dev/fullstack-mvp`.  
**Data:** Supabase remains source of truth; branch/camera/pin state are UI-only.

## Product decision

Use one interactive family tree with progressive disclosure. The initial tree displays the focused Person and nearby family; a secondary **Peta keluarga** command temporarily displays the complete graph. Avoid returning to two equal Focus/Overview tabs.

## Workspace architecture

1. **Global Header** — brand, current family, search, add Person, account. Do not repeat database success state or tree metrics.
2. **Navigation Rail** — fixed compact application navigation on desktop/tablet landscape.
3. **Explorer Panel** — on-demand search, family-origin and branch actions, exploration history, and tree settings. On narrower/touch screens it overlays rather than shrinking the canvas.
4. **Canvas** — one persistent coordinate system for all visible cards and SVG links; viewport pan and zoom are independent from graph data. Main toolbar contains context, map access, zoom, fit, and fullscreen.
5. **Person Inspector** — right-hand dock on wide desktop, side sheet on landscape tablet/coarse pointer, bottom sheet on phone. Card previews must not reposition the camera.

Keep “Semua anggota” as the complete directory, not a second list of 204 members in the canvas rail. Developer documentation is accessible under Explorer settings.

## Branch semantics

- Existing family graph, persons and relationships are never mutated by visual branch collapse.
- Expansion is paginated using the existing store's `BRANCH_PAGE_SIZE`.
- Explicitly opened ancestor/sibling branches are retained when switching the active origin (user ↔ partner).
- **Pinned** branches are UI-local and excluded from conservative automated collapse.
- Conservative collapse is triggered only during a user branch expansion, when **all** of these guardrails hold: focus mode, at least 85 visible persons, and layout width at least seven viewport widths. Under pressure, collapse at most one older, unpinned manual branch, excluding the active focus and just-opened branch.
- An automatic collapse has a visible Undo restoring pre-collapse expanded/collapsed states.
- Zooming, panning, selecting a Person, and opening the Identity Card do not trigger automatic collapse.

### Stable anchor

When a branch is opened, first record the anchor Person's screen-space center, compute the new layout, and adjust camera translation to preserve that screen-space center. No automatic fit after branch expansion.

The canvas never changes its zoom just to make the entire family fit. Fit is explicit.

### Graph/layout invariants

The layout engine under `main-layout-engine.ts` and connectors under `main-connector-engine.ts` remain the source of truth. Preserve generation levels, sibling birth order, partner proximity, and the same Person ID in a single node. Do not duplicate Person cards or alter relationship semantics to shorten edges.

## Responsive contract

| Device | Workspace | Identity card |
|---|---|---|
| Wide desktop ≥1280px with mouse | Rail + dockable Explorer, full canvas | Right inspector |
| Landscape tablet / touch desktop | Rail; Explorer overlays canvas | Right side sheet |
| Tablet portrait | No persistent rail, bottom navigation | Overlay sheet |
| Phone ≤650px | Compact header, full canvas, bottom navigation | Bottom sheet |

Use touch-friendly interaction targets and keep pan/pinch behavior. At far zoom, visually simplify rendered cards rather than removing people or changing branch state.

## QA and regression gates

- `npm run test:canvas` verifies graph, tree visibility and UI contracts.
- `npm run build` compiles Angular production output.
- `node scripts/browser-explorer-layout.mjs` verifies desktop/tablet/mobile Person Inspector geometry.
- `npm run test:serve` checks static SPA server.
- `node scripts/browser-auth.mjs` verifies guest/auth boundaries.

### Required manual scenarios

1. Open both the user's siblings and the partner's siblings; both must coexist, with correct birth ordering.
2. Expand branches repeatedly; do not automatically shrink unless a conservative guard condition is met.
3. Pin a branch; expanded state remains protected from automated collapse.
4. Tap a Person; only preview opens, with no change in camera position. Use **Jelajahi keluarganya** to recenter.
5. Open Explorer and close it; camera zoom and branch state remain intact.
6. Open family map, return to the current Person, and use **Ke diri saya** without resetting the graph.

## Limitations / subsequent improvements

The new conservative guard is a first-stage heuristic using person count and world width; it is not yet a measured connector-crossing/layout-pressure score. Pin state lives only in component memory and is not synchronized across accounts/sessions. Runtime layout remains based on the current engine; complex multi-partner and historical graph cases require dedicated interactive regression scenarios.

The original `docs/MAIN-ANGULAR-UI-PARITY.md` and legacy developer chapters are source-parity reference material, **not** the current workspace UX contract.
