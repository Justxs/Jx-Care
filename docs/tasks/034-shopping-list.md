# 034 Shopping list

**Phase:** J. Shopping · **Depends on:** 014, 015 · **Spec:** P6, P7, T1 (Expiring soon, Shopping list row), Words and copy (Buy again, success toasts), Empty states (Shopping), feature plan 9, sequence 7 · **Design:** [components.md](../design/components.md) Fab; [screens.md](../design/screens.md) ShoppingScreen, ShoppingItemSheet, TodayScreen

## Goal

One shopping list inside the Products tab: Buy again from any product, suggestions for finished and expiring products, ticking items in the shop, and turning a bought item back into a product.

## Scope

In: `src/features/shopping/repo.ts`, `repo.test.ts`, `api.ts`, `screens/ShoppingScreen.tsx`, `components/ShoppingItemSheet.tsx`, `components/ShoppingRow.tsx`, `buyAgain.ts`.

### Data (`repo.ts`)

| Function | Does |
| --- | --- |
| `listShopping(db, area)` | Sections To buy and Want to try (not bought) and Bought; linked items carry the product's last price, size + unit, rating and "would buy again" |
| `addBuyAgain(db, productId)` | Adds a linked To buy item, unless one is already open for that product (returns the existing one) |
| `addItem(db, input)` | New free-text item: name (required), brand, area, list, note |
| `updateItem` / `deleteItem` / `moveToList(db, id, list)` | "Move to To buy" for Want to try items |
| `setBought(db, id, at \| null)` | Tick and untick |
| `clearBought(db)` | Returns the cleared rows for Undo |
| `restoreItems(db, rows)` | Undo for Clear bought |
| `purgeOldBought(db, now)` | Deletes bought rows older than 30 days; run on app open |
| `suggestions(db, today, warnDays)` | Archived (finished) or expiring/expired active products **not** already open on the list, not dismissed, and not marked "Would buy again: No" (task 039) |
| `dismissSuggestion(db, productId)` | |
| `toBuyCount(db)` | For the segment badge and Today's Shopping list row |
| `prefillFromItem(db, id, today)` | Name, brand, category, area, size, unit, ingredients and purchase date today for the inline Add on a bought item (expiry and opened dates left empty) |
| `shareText(db, t)` | Plain text list grouped by To buy / Want to try: "• Body lotion (Nivea), 400 ml" |

### P6 Shopping (the Shopping segment of P1)

- **Suggested** (top, collapsible, remembered for the session): finished or expiring products with + (Buy again) and dismiss (x, spoken "Dismiss suggestion"); each shows why ("Finished 2 Oct", "Expires in 9 days").
- **To buy:** filter chips All / Skin / Hair; `ShoppingRow`: `Checkbox`, name, brand, `AreaTag`, last price and size for linked items ("€12.50 · 200 ml"), note.
- **Want to try:** same rows, plus "Move to To buy".
- **Bought:** ticked items with name in `ink-muted` and strike-through (no opacity), "Bought 4 Oct · leaves the list after 30 days"; "Clear bought" (toast with Undo).
- Header word Share (`share-2`, `Share.share` with `shareText`). Add item is the `Fab` (task 008), at the bottom right; the list keeps 96 pt at its end so the last row scrolls clear of it.
- Rows added or removed fade with height (200 ms); ticking moves the row to Bought with a layout transition.
- **A bought item that is not yet a product** shows an inline line under it, "Add it to your products to track when it expires.", with an Add button (no toast, so it never times out). It stays until the item leaves the list. Add opens Add product (the short form, task 014) pre-filled from `prefillFromItem` (task 014 `prefill` param).
- **Empty:** "Nothing to buy" / "Finished and expiring products show up here as suggestions." / Add item.

### P7 Shopping item (sheet)

Opened by the Add item Fab. `ToggleGroup` Buy again / New item. Buy again: the product picker (task 024, any area, archived products included). New item: name (required), brand, area, list (To buy / Want to try), note. Title "Add to shopping list", footer "Add item".

### Buy again everywhere (`buyAgain.ts`, `useBuyAgain()`)

One action used by: P1 row actions (013), P2 actions bar (015), P5 archive rows (015), the T2 problem step card (026), Today's Expiring soon rows (long press), the expiry-warning notification action (021), and the Mark finished toast (secondary action "Buy again"). It adds the item and shows the toast "Vitamin C serum added to your shopping list" with Undo. Un-hide the Buy again buttons those tasks hid.

### Today Shopping list row

Fill task 025's "Shopping list · 3 to buy" row at the foot of the Expiring soon card (hidden at 0), opening the Shopping segment. Add `toBuyCount` to `prefetchToday`.

Out:

- Rating and "would buy again" fields: 039 (this task already reads them).

## Acceptance criteria

- [ ] Repository tests: Buy again doesn't duplicate an open item; suggestions exclude listed, dismissed and "would buy again: No" products; clear and undo; purge after 30 days; prefill copies the right fields; share text.
- [ ] A bought item that is not yet a product shows the inline "Add it to your products…" line, and Add opens Add product pre-filled with today's purchase date.
- [ ] Buy again works from every place listed and the Today Shopping list row shows the count.
- [ ] Add item is the Fab and Share is a header word; no + in the header.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

Data (`repo.ts`, tested in `repo.test.ts`):

- **No schema change.** "Not yet a product" is worked out, not stored: a bought item needs the inline Add line when it has no product, or its product was created before the tick. Saving Add product from the item (`/product-form?prefill=…&fromShoppingItem=<id>`) relinks the item to the new product (`linkItemToProduct`), so the line goes. Unticking and ticking again later brings the line back (rare; fine).
- **Linked rows** keep their own name and brand (copied at Buy again, editable) and read area, category, last price, size + unit, rating and "would buy again" live from the product.
- **Buy again** reuses an open (not bought) item for the product in either list and adds nothing; the toast then says "X is already on your shopping list" without Undo. Undo removes only the items that call created.
- **Suggested:** expired and expiring active products (soonest first), then products finished in the last **90 days** (newest first), so years of archive don't pile up. Left out: products with any item on the list (open or bought), dismissed ones, and `wouldRebuy = false`. **Ticking a linked item also dismisses its product**, so a finished product you bought again doesn't come back once the bought row leaves the list. Dismissals are permanent; there is no Undo for dismiss (the spec has none).
- **Area chips** (All / Skin / Hair) filter To buy only, as in the spec; Skin and Hair include Both; items without an area show under All only.
- **Order:** To buy and Want to try in the order added; Bought newest first. Bought rows are purged 30 days after the tick by `purgeOldBought`, called from `bootstrapAfterMigrations` (app open).
- **Prefill** (`prefillFromItem`): name, brand, category, area, size (as typed, "400,5"), unit, ingredients (one per line), purchase date today; opened, printed expiry and period after opening empty, so the short form opens on "Not yet". Price is not copied (spec list).
- **Share text:** "To buy" and "Want to try" headings, "• Body lotion (Nivea), 400 ml", a note on an indented second line; bought items left out; Share is disabled while both lists are empty.
- `pickerProducts` (P7) lists every product, active A–Z then finished A–Z, searched by name or brand ignoring accents.

Screens:

- `ShoppingScreen` is the Shopping segment of `ProductsScreen`; the header word Share (`ShoppingShareButton`, `share-2`) takes the place of Select on that segment, and the segment shows the open To buy count (hidden at 0). The segment now lives in `productsSegmentStore` (`products/listState.ts`) so other screens can open it; `openShoppingList()` (`shopping/viewState.ts`) sets it and navigates to `/products`.
- The Suggested open/closed state and the To buy chip are kept for the session in `shoppingViewStore`.
- **ShoppingRow:** the whole row ticks (role checkbox, light haptic on tick); the `Checkbox` only shows the state. Bought rows: name `ink-muted` + strike-through, "Bought 4 Oct · leaves the list after 30 days". Want to try rows have a ghost "Move to To buy" button. Long press opens a sheet with Edit, Move to Want to try / Move to To buy and Delete (Delete shows "X removed" with Undo); screen readers get the same as accessibility actions. Ticked rows fade out of their section and into Bought (separate cards, so it is fade + glide, not a shared-element move).
- **P7 sheet** (`ShoppingItemSheet`): starts on Buy again with a search field and a `RadioList` of products (finished ones say "Finished"); footer "Add item" is enabled once one is picked. Task 024's ProductPickerSheet doesn't exist yet, so the picker is inline; swap it in later if wanted. New item: name (required), brand, Used on (optional, no default), list (To buy default), note (max 200, hint "Size, shade or where to buy it."). The same sheet edits an item ("Edit item", "Save changes"). Submitting re-runs validation first so an old error on a still-focused field doesn't block the save.
- The Fab "Add item" hides while a sheet is open. The empty state also has Add item, like the Products empty state.
- **Mark finished toast** gets "Buy again" as a second action (toast host gained `secondaryLabel` / `onSecondary`) on the Products row action, the select bar and product detail.
- Product mutations now also invalidate `qk.shopping.all` (linked rows show price and size; Suggested depends on products).

Buy again everywhere: Products rows and select bar, product detail and the archive sheet appear through `registerBuyAgain` (registered in `shopping/api.ts`, imported for its side effect in `app/_layout.tsx`). Not done here because those screens are other tasks still being built:

- **Today (025):** render `ShoppingListRow` (`shopping/components/ShoppingListRow.tsx`) at the foot of the Expiring soon card (it hides itself at 0 and opens the Shopping segment); add `await prefetchShopping(queryClient)` (`shopping/api.ts`) to `prefetchToday`; long press on an Expiring soon row calls `useBuyAgain()`.
- **Routine player (026):** the problem step card's Buy again calls `useBuyAgain()`.
- **Expiry-warning notification action (021):** call `addToShoppingList(queryClient, [productId])` from `shopping/api.ts` (no React needed).

Check on a real device:

- Shopping segment in light and dark, at 360 pt in Lithuanian: To buy heading with the three chips (they wrap under the heading when tight), "Išvalyti nupirktus" next to "Nupirkta", the inline Add line, long names and notes.
- The toast with both "Pirkti dar kartą" and "Anuliuoti" at 360 pt (the message wraps).
- Ticking: haptic, the row fading into Bought; Clear bought collapse; Suggested opening and closing (height animation) and rows leaving it.
- The P7 sheet with the keyboard open (search field, New item fields, footer button above the keyboard); long product lists scroll inside the sheet.
- Share sheet text on iOS and Android.
- The Fab clear of the tab bar and the last row clear of the Fab.
