# 013 Products list

**Phase:** C. Products · **Depends on:** 010, 012 · **Spec:** P1, Empty states (Products), Global UI rules (Touch, toast with Undo), refinement 12 · **Design:** [screens.md](../design/screens.md) ProductsScreen; [components.md](../design/components.md) ProductRow, ToggleGroup, Chip, Skeleton, EmptyState, Fab, Checkbox

## Goal

The Products tab: a fast, filterable list of active products with expiry status, built from task 012's hooks.

## Scope

In: `src/features/products/screens/ProductListScreen.tsx`, `components/ProductRow.tsx`, `components/ProductTile.tsx`, `components/ProductFiltersSheet.tsx`.

- **Top:** title "Products" with the header word Select, segmented `ToggleGroup` My products / Shopping (Shopping shows the to-buy count; until task 034 the Shopping segment shows a placeholder), search `Input` (filters as you type, debounced 150 ms), list / shelf view button (`list` / `layout-grid`), and filter button (shows how many filters are on). No + in the header. Segments: sliding indicator and 200 ms cross-fade of the content; the header and toggle never move.
- **Add product** is the `Fab` (task 008) at the bottom right, above the tab bar. The list keeps 96 pt of space at its end so the last row scrolls clear of it.
- **ProductRow** (72 pt min height): `ProductThumb`, name (`body-strong`, wraps), meta "Brand · Category", the date line ("Expires 15 Oct"), `AreaTag`, and a status `Badge` (never shrinks) **only when the status needs attention**: "Expired 2 Oct", "Expiring soon", "Not opened", "No date". An OK product has no badge, and the date is never written twice in a row. Red Avoid badge when `avoid` is true. Rows in a flush card with inset separators. Tap: push P2.
- **Shelf view** (`layout-grid`): two columns of `ProductTile`s (photo, or the category glyph on the area's soft colour; name, date and the status badge), for finding a bottle by sight. List view (`list`) is the default. The choice is remembered (spec P1); note under Decisions where it is kept.
- **Select** (header word): rows get square `Checkbox`es, the header word becomes Done, and a bar above the tab bar offers Mark finished and Buy again for all selected (task 012 `useMarkFinishedMany`; toast with Undo). The `Fab` hides while the bar is open. Buy again follows the same feature check as the row action.
- **Row actions** on swipe (left) and long press (DropdownMenu): Mark as opened (only if not opened), Mark finished, Buy again, Duplicate. Mark finished removes the row with fade and height collapse (200 ms) and shows the toast "Vitamin C serum moved to Archive" with Undo (Undo restores it in place). Buy again calls task 034's action when it exists; until then it is hidden behind a feature check so this task doesn't depend on 034.
- **Filters sheet:** Area (All, Skin, Hair), Category (multi chips), Status (OK, Expiring soon, Expired, Not opened, No date), "Avoid badge only" switch; Sort: Soonest expiry (default), Name, Recently added; "Reset filters" ghost and "Show N products" primary in the pinned footer (N updates live). Filters persist in `uiStore` for the session, not across restarts.
- **Footer link:** "Archive (N)" pushes P5; hidden when N is 0.
- **Loading:** if the query isn't cached on the first frame, five 72 pt skeleton rows, replaced in place with a 150 ms fade. Refiltering keeps the previous list visible (`keepPreviousData`).
- **Empty states:** no products at all → spec copy "No products yet" / "Add the one you use most. Jx Care tracks when it expires." / Add product. Filters that match nothing → "No products match" with "Reset filters" (not the first-run empty state).
- The `Fab` and the empty state's Add product both open Add product, the short form (task 014, `/product-form` without `id`), for every new product, not only the first.

Out:

- Shopping segment content: 034. Archive screen: 015. Expiry reminders: 021.

## Acceptance criteria

- [ ] List, search, every filter and every sort work against real data (render tests with a seeded test database through the hooks, or with mocked hooks plus repository tests from 012).
- [ ] Mark finished shows the toast and Undo restores the product (test).
- [ ] An OK product shows the date line and no badge; other statuses show one badge ("Expired 2 Oct", "Expiring soon", "Not opened", "No date") and the date is not repeated.
- [ ] Select marks several products finished at once, and Undo restores them; the Fab hides while the selection bar is open.
- [ ] Shelf and list views both work and the choice is remembered.
- [ ] No layout shift: badges keep their min width; switching segments or views doesn't move the header; loading uses skeletons at final size; the last row scrolls clear of the Fab.
- [ ] Empty state for no products and for no matches, in LT and EN.
- [ ] Light, dark, 360 pt and Lithuanian checked.
- [ ] `npm run check` passes.

## Decisions

- **File name:** the screen stays `screens/ProductsScreen.tsx` (the name task 010's route already imports) instead of `ProductListScreen.tsx`.
- **List or shelf is remembered in the settings row**, new column `settings.product_view` (`'list' | 'shelf'`, migration `0001`), so it survives restarts. Filters live in `productListStore` (`src/features/products/listState.ts`, TanStack Store) for the session only.
- **ScrollView, not FlatList:** a person has tens of products, and a ScrollView keeps the flush Card (shadow, inset separators) and Reanimated layout animations simple. Switch to FlashList if lists ever get long.
- **Date line vs badge:** the third line is "Expires 15 Oct" for OK, Expiring soon and Not opened. Expired puts the date in the badge ("Expired 2 Oct"), so its third line says "Opened 1 Mar" when known, else nothing; No date does the same. Helpers in `statusText.ts` (`statusBadge`, `dateLine`, `metaLine`) for reuse on Today and P2.
- **Row actions:** swipe left shows buttons (80 pt each, Mark finished in accent). Long press opens the same actions in the DropdownMenu, anchored by an invisible Trigger in the row. Screen readers get them as accessibility actions (`markOpened`, `markFinished`, `buyAgain`, `duplicate`). Duplicate shows the toast "Copy of Mask added" and stays on the list.
- **Shelf view long press** starts Select with that tile ticked (tiles have no swipe).
- **Buy again** goes through `useBuyAgain()` in `src/features/shopping/buyAgain.ts`; it returns null until task 034 registers its hook, so every Buy again button is hidden for now.
- **Filters sheet** edits a draft; "Show N products" applies it, N is a live query of the draft. "Reset filters" keeps the sort. The filter button shows a count bubble (area, each category, each status and avoid-only count as one; search and sort don't).
- **Search** is debounced 150 ms; search text is part of the session filters.
- **Shopping segment** shows a placeholder empty state until task 034; the count badge comes with it. The Fab and Select only show on My products.
- `Input` gained `leadingIcon`; `more-menu.tsx` exports `MenuPortal` for menus opened without the ellipsis trigger. Jest's Reanimated mock gained `LayoutAnimationConfig`.
- **Device checks needed:** swipe feel and that a swipe doesn't fight the tab's vertical scroll; long-press menu position near the bottom of the screen; row removal (fade and collapse) inside the card; shelf tiles at 360 pt in Lithuanian; the selection bar above the tab bar with the toast; light and dark.
