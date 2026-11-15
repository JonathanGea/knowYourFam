# KnowYourFam — Relationship Explorer (MVP)

## Purpose

Clicking a Person in the family tree opens a relationship-focused inspector.
The inspector answers who the person is and which actual relatives are recorded
without duplicating the full profile page. It does not mutate Supabase data.

## Interaction invariants

1. **Selected Person** (inspected) is distinct from **Focus Person** (tree root).
   Clicking an inspector relative changes only selection, with the same Focus Person.
2. **Visible Persons** are a canvas projection, not the complete family graph.
   The four relationship groups must read `FamilyTreeStore.relationsFor(id)` and
   use actual Person names even if those nodes are hidden.
3. Clicking a visible relative moves the canvas to that node. For a hidden
   relative the inspector tries to expand its reachable branch. If the branch
   cannot be reached from the current focus, it offers an explicit change of
   focus. Never change focus silently.
4. The history arrow navigates inspected persons, not focus history.
5. Branch controls display **hidden** members only; no misleading "+0" badges.
   "Belum tercatat" describes missing data, not the existence of real people.
6. Relationship lists show three entries initially, with per-group expansion.
   Birth order is compared when both ranks are recorded; dates are compared
   when both are known. Otherwise preserve input order, without inventing ages.
7. Clicking empty canvas space closes the inspector. Drag/pinch/zoom do not
   silently change focus. The inspector has accessible close/back controls.

## Layout and breakpoints

- **Desktop >=901px:** inspector is a dedicated right-hand CSS Grid column;
  the canvas occupies the left column and re-centers the inspected node and
  partner cluster without covering tree cards. The inspector deliberately
  avoids legacy Quick Panel position classes.
- **Tablet 651–900px:** overlay inspector anchored to the right; navigation
  centers people in the visible region to the left of the overlay.
- **Mobile <=650px:** bottom sheet, grab to expand/collapse or dismiss;
  moving to a relative shows the compact state to expose the canvas.
- Respect `prefers-reduced-motion`, the browser safe area, keyboard focus
  visibility and text wrapping for long family names.

## Developer entry points

- `frontend/src/app/features/family-tree/family-tree.page.ts` — inspector
  UI state, history, reveal logic and viewport navigation.
- `frontend/src/app/features/family-tree/family-tree.page.html` — relationship
  groups, action controls and responsive sheet.
- `frontend/src/main-parity.css` — global styles kept outside the Angular
  component size budget.
- `frontend/src/app/application/family-tree.store.ts` — existing graph,
  focus and branch APIs, unchanged.
- `frontend/scripts/relationship-explorer.test.mjs` — regression checks.

The original Main/Angular parity tests are retained for shared canvas
geometry and onboarding interactions.

## Layout regression

The GitHub Actions Playwright stage executes `scripts/browser-explorer-layout.mjs`
using the actual CSS and asserts canvas/panel bounding rectangles at 1440px,
1024px, 768px and 390px. This catches inadvertent left docking,
canvas overlap and sheet placement without requiring user account access.
