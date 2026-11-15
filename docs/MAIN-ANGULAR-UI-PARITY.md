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
- Angular now includes six learning courses, action-validated steps, isolated training graph and resume states. The tutorial's profile step now renders the source-shaped full profile view on desktop, preserving the lesson panel and returning to the same training graph. Mobile Quick Actions opens a bottom sheet as in main; the sheet also offers full profile.
- Guide, Rules, Members, Developer and Profile pages now use the main-style global shell; individual illustrations, help interactions and long-document states still need visual screenshot comparisons.
- Mobile drawer swipe-to-expand/dismiss was added. Device-level gestures, edge-case popovers, complex relationships and pixel-diff still need verification.
- Data changes remain local demo operations; backend permissions/claims are not implemented.

**Policy:** Treat \`main\` as source of visual/behavior truth. No branch merge, no
copying main JavaScript into Angular components, and **1 feature task = 1 commit**.

## Continued behavior parity: tutorial and profile sheet

- Source course titles and steps come from main/index.html LEARNING_COURSES.
- Angular definitions: frontend/src/app/features/family-tree/tutorial-content.data.ts.
- Lesson progress advances on matching events only; no unconditional Next button.
- Local browser key knowyourfam_learning_v1 stores isolated lesson snapshots and progress. The real family key is never modified during training.
- Training graph mirrors main teachingSeed() with 7 / 5 / 1 people by module, omitting a dangling edge referencing nonexistent persons.
- Exiting training restores original tree, focus, branch state and zoom; adding a Person no longer replaces the existing focus.
- The guide now includes six modules, progress statuses, source illustration pattern and FAQ.
- Mobile drawer supports grab bar swipe, expanded and collapsed states.

The browser parity checks and source contract tests must pass before claiming parity. Passing tests cover the tested behavior, not every edge case.

## Profile behavior alignment

- Desktop tutorial Profile step swaps the canvas for an inline source-shaped full Person profile, with Biodata/Keluarga/Kenangan tabs.
- Source-shaped person detail drawer now has header, photo, birth/death details, directional navigation, direct vs inferred relationship labels and couple-based child actions.
- Couple-based creation uses a single immutable graph update to add the Person and two parent edges; it never silently adds a partner relation.
- On mobile, Quick Actions opens the bottom sheet; the explicit Profil lengkap button opens the full profile route.

## Mobile sheet real-gesture parity (15 Nov 2026)

The Angular grab zone now captures its active pointer so a swipe completes even if the finger leaves the narrow handle. A swipe suppresses the subsequent browser-generated button click for 420 ms, matching the HTML reference and preventing accidental expand/collapse reversal. Pointer cancellation clears only the pending gesture, not the panel's current expanded state. Chromium parity now uses real pointer drags for the Angular sheet in addition to source HTML event tests. Device touch QA is still recommended.

A follow-up to the real-gesture QA check also routes a pending mobile grab swipe through the document-level pointer-up fallback if the release happens outside the sheet; the shade click is ignored during the same post-swipe suppression window. This prevents the browser backdrop from dismissing an upward-swipe sheet.

The mobile drag handler also commits an expansion/collapse as soon as the pointer crosses the swipe threshold (↑36 px, ↓65 px), once per gesture; pointer-up remains a fallback for synthetic events. This prevents missed release events and avoids repeated toggles while the sheet animates. The browser test waits for the height transition before starting another gesture.
