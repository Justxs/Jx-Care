# 015 Product detail and archive

**Phase:** C. Products · **Depends on:** 010, 012 · **Spec:** P2, P5, refinement 10, Empty states (Archive) · **Design:** [screens.md](../design/screens.md) ProductDetailScreen, ArchiveScreen

## Goal

The product detail screen with expiry, details, ingredients and actions, and the archive of finished products with cost per day.

## Scope

In: `src/features/products/screens/ProductDetailScreen.tsx`, `ArchiveScreen.tsx`.

### P2 Product detail

- Push from the list, Today, or an expiry notification (`/products/[id]`). `ScreenHeader` with back and the "More actions" overflow.
- **Photo** in a reserved 1:1 box with placeholder colour (tap opens a full-screen viewer with pinch zoom); no photo → large category glyph on `subtle`.
- Name (`title-m`), brand, `AreaTag`, category.
- **Expiry block:** status `Badge` with days, `Progress` from opened date to effective expiry (scaleX), dates listed: Purchased, Opened, Printed expiry, Period after opening ("12M"). Missing values read "Not set".
- **Details:** size + unit, price with currency, ingredient chips (avoided red; conflict link icon once task 029/030 data exists), "Edit list" opens P4 for this product directly, notes.
- **Used in:** routines and hair tasks that use it, each tappable (from `usedIn`; empty until 022/031 extend it, then the section hides when empty).
- **My rating** and **Notes timeline:** leave marked slots that task 039 fills; hide them until then.
- **Cost per day** once finished: "€0.21 a day over 142 days".
- **Actions bar** (pinned at the bottom): Edit (opens P3), Mark finished (primary; toast "Vitamin C serum moved to Archive" with Undo, then back to the list), Buy again (secondary; task 034, hidden until it exists), More: Mark as opened, Duplicate, Delete (only for archived products). An archived product's bar shows Restore and Buy again instead of Mark finished.
- Deleted or missing product id (e.g. an old notification) → a plain "This product was deleted" state with Back.

### P5 Archive

- Push from "Archive (N)". Finished products, newest first, each row with finished date and cost per day ("€0.21 a day"); sort toggle Date / Cost per day.
- Row actions: Restore (toast with Undo), Buy again (034), Delete: AlertDialog "Delete Vitamin C serum? Its notes and dates are deleted for good. This can't be undone." with Delete as the destructive action. Removed rows collapse (200 ms).
- Empty: "Nothing finished yet" / "Products you mark finished move here with their cost per day." (no action).

Out:

- Rating, would buy again, notes: 039. Buy again: 034. Conflict marks on ingredients: 030.

## Acceptance criteria

- [ ] Detail shows every block for a product with all fields, and degrades cleanly for a product with only a name and area.
- [ ] Mark finished, Undo, Restore, Duplicate, Mark as opened and Delete (archived only, with the dialog) all work and update the list and Today (query invalidation).
- [ ] Archive sorts by date and by cost per day; products without a cost sort last.
- [ ] The photo box never resizes when the image loads; numbers use tabular figures.
- [ ] Light, dark, 360 pt and Lithuanian checked.
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
