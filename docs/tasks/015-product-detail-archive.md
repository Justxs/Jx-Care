# 015 Product detail and archive

**Phase:** C. Products · **Depends on:** 010, 012 · **Spec:** P2, P5, refinement 10, Empty states (Archive) · **Design:** [screens.md](../design/screens.md) ProductDetailScreen, ArchiveScreen

## Goal

The product detail screen with expiry, details, ingredients and actions, and the archive of finished products with cost per day.

## Scope

In: `src/features/products/screens/ProductDetailScreen.tsx`, `ArchiveScreen.tsx`.

### P2 Product detail

- Push from the list, Today, or an expiry notification (`/products/[id]`). `ScreenHeader` with back and the "More actions" menu (`DropdownMenu`): Mark as opened (only if not opened), Duplicate, and Delete (only for archived products).
- **Photo** in a reserved 1:1 box with placeholder colour (tap opens a full-screen viewer with pinch zoom); no photo → large category glyph on `subtle`.
- Name (`title-m`), brand, `AreaTag`, category.
- **Expiry block:** status `Badge` with days, `Progress` from opened date to effective expiry (scaleX), dates listed: Purchased, Opened, Printed expiry, Period after opening ("12M"). Missing values read "Not set".
- **Details:** size + unit, price with currency, ingredient chips (avoided red; conflict link icon once task 029/030 data exists), "Edit list" opens P4 for this product directly, notes.
- **Used in:** routines and hair tasks that use it, each tappable (from `usedIn`; empty until 022/031 extend it, then the section hides when empty).
- **My rating** and **Notes timeline:** leave marked slots that task 039 fills; hide them until then.
- **Cost per day** once finished: "€0.21 a day over 142 days".
- **Actions bar** (pinned at the bottom), three actions so "Pažymėti baigtu" fits on one line at 360 pt: Edit (opens Edit product, the full P3 form), Mark finished (primary; toast "Vitamin C serum moved to Archive" with Undo, then back to the list), Buy again (secondary; task 034, hidden until it exists). No More in the bar; it is in the header. An archived product's bar shows Restore and Buy again instead of Mark finished.
- Deleted or missing product id (e.g. an old notification) → a plain "This product was deleted" state with Back.

### P5 Archive

- Push from "Archive (N)". Finished products, newest first, each row with finished date and cost per day ("€0.21 a day"); sort toggle Date / Cost per day.
- A row's More button (spoken label "More actions") opens an action sheet over a scrim, never drawn inline in the list: Restore to Products (toast "Clay mask restored to Products" with Undo), Buy again (034), Delete: AlertDialog "Delete Vitamin C serum? Its notes and dates are deleted for good. This can't be undone." with Delete as the destructive action. Removed rows collapse (200 ms).
- Empty: "Nothing finished yet" / "Products you mark finished move here with their cost per day." (no action).

Out:

- Rating, would buy again, notes: 039. Buy again: 034. Conflict marks on ingredients: 030.

## Acceptance criteria

- [ ] Detail shows every block for a product with all fields, and degrades cleanly for a product with only a name and area.
- [ ] Mark finished, Undo, Restore (with its toast and Undo), Duplicate, Mark as opened and Delete (archived only, with the dialog) all work and update the list and Today (query invalidation).
- [ ] The detail action bar has three actions and the rest sit in the header's More menu; Archive row actions open in a sheet.
- [ ] Archive sorts by date and by cost per day; products without a cost sort last.
- [ ] The photo box never resizes when the image loads; numbers use tabular figures.
- [ ] Light, dark, 360 pt and Lithuanian checked.
- [ ] `npm run check` passes.

## Decisions

Detail (P2):

- The header title is "Product"; the product name is the `title-m` heading in the body, with brand, `AreaTag`, category and the Avoid badge under it.
- With a photo, the box is full width at 1:1 (`aspect-square`, `subtle` placeholder, expo-image fades in). Without a photo, the box is a 160 pt square, centred, with a 64 pt category glyph, so a product without a photo doesn't open on a large empty block. Tapping the photo opens `PhotoViewer`: an RN `Modal` on `camera-bg` with pinch zoom (1 to 4 times), drag while zoomed and double tap to reset.
- The expiry block always shows the status word in the badge (OK included, unlike the list) with the days next to it: "Expires in 145 days · 1 Mar 2027". A finished product shows a neutral "Finished" badge, no days and no progress bar, and adds a Finished row to the dates. The bar uses `expiryProgress` from `src/lib/expiry` (opened date, or the purchase date when not opened).
- Period after opening reads "6M" in both languages (the open-jar symbol). Units have their own labels under `products.detail.units` (LT "vnt.").
- Notes show only when there are some (no "Not set" row). Ingredient chips are red when the ingredient or its group is on the avoid list (`avoidMatches` per ingredient). Conflict marks are left for 030 (TODO in the code).
- "Edit list" opens the P4 `IngredientEntrySheet` on the detail screen and saves with `useUpdateProduct`, the product's other fields unchanged.
- Cost per day shows in its own card once finished; when the price or the opened date is missing, the card says what to add instead of hiding.
- My rating and the notes timeline are `TODO(039)` comments in place, nothing rendered.
- More menu: Mark as opened only for an active product that is not opened; Duplicate shows "Copy of X added" and opens the copy (its dates usually need editing next); Delete only when archived, with the AlertDialog, then goes back.
- Action bar: Edit (secondary), Mark finished (primary) and Buy again (secondary, hidden until 034), without icons so the labels fit; the primary button gets a 1.4 share of the width. Its label is `products.detail.markFinished`, "Pažymėti baigtu" in LT as the design asks (the shared `common.markFinished` reads "Pažymėti kaip baigtą"). An archived product's bar is Edit, Restore (primary) and Buy again. Restore stays on the screen and shows "X restored to Products" with Undo; Mark finished shows its toast and goes back.
- The bar is a plain row, not `BottomBar`: the tab bar sits under pushed product screens, so `BottomBar`'s safe-area padding and keyboard handling don't apply. While the screen is focused it raises `toastInset` by the bar's height so toasts float above the bar, and puts it back on blur.
- A missing or malformed id (an old notification) shows "This product was deleted" with a Back button.

Archive (P5):

- The sort (Date / Cost per day) is a `ToggleGroup`, not remembered, and hidden on the empty state.
- Each row: thumbnail, name, "Finished 27 Sep", and "€0.15 a day" when the cost is known. Tapping the row opens the product's detail; the More button (spoken "More actions") opens a bottom `Sheet` titled with the product name holding Restore to Products, Buy again (034) and Delete. Phones only, so no `DropdownMenu` variant for tablets.
- Delete opens the AlertDialog from the spec; deleted and restored rows fade out while the others slide up (`rowExiting` / `rowLayout`).

Tests: `src/features/products/screens/__tests__/detail.test.tsx` covers both screens. The dropdown menu's portal waits for a trigger measurement that never happens in Jest, so that test file draws the open menu in place.

Check on a real device:

- Detail at 360 pt in LT: "Pažymėti baigtu" on one line in the bar, also with Buy again once 034 lands; long names and brands wrap.
- The photo box doesn't move when the image loads; the viewer pinches, drags, double-taps back and closes (Android back button too).
- Toasts on the detail screen sit above the action bar, and back at the tab bar after leaving.
- More menu position under the header button; Delete dialog over the menu closing.
- Archive action sheet opens over a scrim and closes before the delete dialog; row collapse looks smooth.
- Light and dark for both screens.
