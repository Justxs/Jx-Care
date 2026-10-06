# 034 Shopping list

**Phase:** J. Shopping · **Depends on:** 014, 015 · **Spec:** P6, P7, Words and copy (Buy again, success toasts), Empty states (Shopping), feature plan 9, sequence 7 · **Design:** [screens.md](../design/screens.md) ShoppingScreen, ShoppingItemSheet

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
| `toBuyCount(db)` | For the segment badge and Today's chip |
| `prefillFromItem(db, id, today)` | Name, brand, category, area, size, unit, ingredients and purchase date today for "Add as new product" (expiry and opened dates left empty) |
| `shareText(db, t)` | Plain text list grouped by To buy / Want to try: "• Body lotion (Nivea), 400 ml" |

### P6 Shopping (the Shopping segment of P1)

- **Suggested** (top, collapsible, remembered for the session): finished or expiring products with + (Buy again) and dismiss (x, spoken "Dismiss suggestion"); each shows why ("Finished 2 Oct", "Expires in 9 days").
- **To buy:** filter chips All / Skin / Hair; `ShoppingRow`: `Checkbox`, name, brand, `AreaTag`, last price and size for linked items ("€12.50 · 200 ml"), note.
- **Want to try:** same rows, plus "Move to To buy".
- **Bought:** ticked items with name in `ink-muted` and strike-through (no opacity), "Bought 4 Oct · leaves the list after 30 days"; "Clear bought" (toast with Undo).
- Top bar: "+ Add item" and Share (`Share.share` with `shareText`).
- Rows added or removed fade with height (200 ms); ticking moves the row to Bought with a layout transition.
- **Ticking a linked item** shows the toast "Body lotion bought. Add it to your products?" with Add, which opens the product form pre-filled from `prefillFromItem` (task 014 `prefill` param).
- **Empty:** "Nothing to buy" / "Finished and expiring products show up here as suggestions." / Add item.

### P7 Shopping item (sheet)

`ToggleGroup` Buy again / New item. Buy again: the product picker (task 024, any area, archived products included). New item: name (required), brand, area, list (To buy / Want to try), note. Footer "Add to list".

### Buy again everywhere (`buyAgain.ts`, `useBuyAgain()`)

One action used by: P1 row actions (013), P2 actions bar (015), P5 archive rows (015), the T2 problem step card (026), Today's Expiring soon rows (long press), the expiry-warning notification action (021), and the Mark finished toast (secondary action "Buy again"). It adds the item and shows the toast "Vitamin C serum added to your shopping list" with Undo. Un-hide the Buy again buttons those tasks hid.

### Today chip

Fill task 025's "3 to buy" chip (hidden at 0), opening the Shopping segment. Add `toBuyCount` to `prefetchToday`.

Out:

- Rating and "would buy again" fields: 039 (this task already reads them).

## Acceptance criteria

- [ ] Repository tests: Buy again doesn't duplicate an open item; suggestions exclude listed, dismissed and "would buy again: No" products; clear and undo; purge after 30 days; prefill copies the right fields; share text.
- [ ] Ticking a linked item and tapping Add opens the product form pre-filled with today's purchase date.
- [ ] Buy again works from every place listed and the Today chip shows the count.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
