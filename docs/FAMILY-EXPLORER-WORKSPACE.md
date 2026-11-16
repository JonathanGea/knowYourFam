# KnowYourFam — Family Explorer Workspace v2.0

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

## Visual language — anti AI slop redesign

- The family graph is a reading surface, **not a SaaS KPI dashboard**. Canvas uses a quiet warm-neutral background and one restrained accent (`#365c46`), not decorative cards on cards.
- A Person Card prioritizes **name, lifetime and optional account marker**. The repeated “Lihat anggota” footer was removed because the card itself is interactive. The 185 × 113 px geometry is unchanged so existing connector/anchor calculations remain valid.
- Monochrome icons use the self-hosted `public/icons.svg` sprite. Do not reintroduce Unicode symbols as primary app navigation icons; avoid provider-specific emoji and unrelated icon vocabularies.
- Navigation rail, header, contextual Explorer and Profile share typography, spacing, color and border decisions via existing `family-explorer-workspace.css` and `family-workspace-pages.css`. **Do not add another override stylesheet.**
- Relationship stroke colors remain meaningful (parent/child, partner, sibling), while avatar backgrounds are neutral rather than gender-coded.
- Only the current user and selected/focus states receive distinct visual attention; don't add a permanent badge to every node.
- Responsive labels should not shrink to 9 px. Prefer shortening or hiding redundant text while preserving text alternatives and 40+ px action targets.
- Auth, data storage, birth order, branch expansion, camera and layout semantics are outside the visual-only change.
- QA requires testing actual graph readability with a realistically large family after deployment. A green build validates code, **not** subjective visual quality.

## Compact Person cards at far zoom

Below 42%, project **mini Person cards** (initials/photo, two-line name, white
surface, focus outline) in screen coordinates from the same family graph
positions. This corrects the earlier floating text-only names. On 15% zoom
the cards remain legible, but crowding prevention may hide some: zoom in or
pan to see the others. Above 42% the existing full Person Card and branch
controls continue unchanged. No relationship data or family ordering changes.

## Branch semantics

- Existing family graph, persons and relationships are never mutated by visual branch collapse.
- Expansion is paginated using the existing store's `BRANCH_PAGE_SIZE`.
- Explicitly opened ancestor/sibling branches are retained when switching the active origin (user ↔ partner).
- **Pinned** branches are UI-local and excluded from conservative automated collapse.
- Conservative collapse is evaluated only after explicit branch expansion. A wide-but-readable canvas never triggers collapse. It measures card crowding, tries older unpinned branches, and only retains a reduction if collisions decrease without hiding a pinned branch or its visible relatives.
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

## Visual QA scenarios

1. **Desktop 1440px:** primary canvas reaches both edges of content; header, rail and toolbar do not stack redundant boxes. Node names readable at 100% zoom.
2. **Tablet landscape 1024px:** rail remains visible, search/branches overlays, inspector opens to the right without reducing the world scale or altering branch state.
3. **Tablet portrait 768px:** navigation moves to bottom; the tree remains pannable and the Explorer overlays.
4. **Phone 390px:** no horizontal page scrolling, header actions retain accessible labels, and Person inspector appears as a bottom sheet.
5. **Large tree:** opening siblings of user and spouse preserves birth ordering and connector relationships; no automatic collapse just because the graph is wide.
6. **Icon runtime:** `/icons.svg` must return `image/svg+xml` from the production server.

## Limitations / subsequent improvements

Conservative auto-collapse now measures card crowding rather than person count or width; it does not yet score connector congestion and route crossings. Pin state lives only in component memory and is not synchronized across accounts/sessions. Runtime layout remains based on the current engine; complex multi-partner and historical graph cases require dedicated interactive regression scenarios.

The original `docs/MAIN-ANGULAR-UI-PARITY.md` and legacy developer chapters are source-parity reference material, **not** the current workspace UX contract.
