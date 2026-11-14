# Main HTML → Angular: Visual & Interaction Alignment

Source of truth: \`main/index.html\`, Git blob \`1d52703f6572639c4b64b1e476fe7a0eba201a72\`.
Implementation: \`dev/fullstack-mvp/frontend\`.

## Visual parity implementation

The Angular Family Tree now includes a **direct copy of main's 50 KB CSS source** in
\`frontend/src/main-parity.css\` (loaded after Tailwind) and rebuilds the visible
Angular template using **the same markup class hierarchy**.

| Main UI element | Angular counterpart |
|---|---|
| \`.app > .header\` | Header + brand + family workspace + saved indicator |
| \`.body > .side\` | 226 px sidebar, tree navigation, person list, new tree, import |
| \`.main > .heading\`, \`.stats\` | Heading actions and three source-style count badges |
| \`.canvas-shell > .canvas-top\` | Focus Person / Entire Tree + zoom + fit + fullscreen |
| \`.focus-toolbar\` | Focus identity, visible count, back and reset |
| \`.viewport > .scene\` | Absolute canvas with generation lanes and pan/zoom |
| \`.node\` | 185 × 113 px horizontal card, photo/initials, name, years, connection count |
| \`.branch-toggle\` | Source directional near-node controls |
| \`.connections\` SVG | Parent/partner/sibling lines and **protected card mask** |
| \`.quick-panel\`, \`.tree-help-panel\` | Click Person, sibling navigation, branch actions, help legend |
| \`.shade + .drawer\` | Overlay person detail, not a permanently visible third column |
| \`.mobile-nav\` | Bottom navigation on narrow screens |

Angular-specific overrides remain component-scoped. Shared source styles are
**CSS**, not a reused Vanilla JS runtime; all data/UI actions are Angular state.

## Functional parity now present

- Source \`githubSeed\` of 124 people on first load; saved browser data is never replaced automatically.
- Typed parent, child, sibling and partner links; verified direction and cycle checks in pure graph functions.
- Edit/rename/create/link/soft-delete/unlink demo Person/relations, manual browser confirmation.
- Expand, collapse, back focus, reset focus branches, pan, pinch zoom, Fit All and fullscreen.
- Main test members (\`uji-\` IDs) can be merged without wiping the user's family.
- New tree is explicitly confirmed, resets focus and keeps the backup/export path available.
- Import main JSON and export main-compatible JSON.
- Main rules/developer/guide data are on Angular routes.
- Tutorial uses a disposable graph and never writes to browser storage.

## Critical acceptance checks

\`\`\`bash
cd frontend
npm run test:canvas
npm run build
npm run test:serve
\`\`\`

Node tests verify the source CSS hash, markup structure, node dimensions,
SVG safety mask, directional actions, main seed, and non-destructive merge logic.
GitHub Actions runs the tests + production Angular build + route smoke checks.

**Not yet evidence of exact screenshot equivalence:** These static/build tests do not
prove that Chrome on a tablet renders every coordinate, panel and responsive state
identically to HTML. Formal Playwright screenshot diff tests are still needed across
same-data, same-viewport states.

## Remaining differences not to conceal

- Full standalone Person Profile page and all nested rich actions in \`main\` still exceed the Angular drawer experience.
- Advanced tutorial engine from main includes action-driven guided overlays and progression; Angular currently provides simpler isolated steps.
- Guide, Rules, Members, Developer and Profile pages now use the main-style global shell; individual illustrations, help interactions and long-document states still need visual screenshot comparisons.
- Mobile drawer swipe-to-expand/dismiss, edge-case quick popovers, multi-partner geometry and complex connector visual diff need browser testing.
- Data changes remain local demo operations; backend permissions/claims are not implemented.

**Policy:** Treat \`main\` as source of visual/behavior truth. No branch merge, no
copying main JavaScript into Angular components, and **1 feature task = 1 commit**.
