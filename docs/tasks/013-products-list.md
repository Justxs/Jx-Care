# 013 Products list

**Phase:** C. Products · **Depends on:** 010, 012 · **Spec:** P1, Empty states (Products), Global UI rules (toast with Undo) · **Design:** [screens.md](../design/screens.md) ProductsScreen; [components.md](../design/components.md) ProductRow, ToggleGroup, Chip, Skeleton, EmptyState

## Goal

The Products tab: a fast, filterable list of active products with expiry status, built from task 012's hooks.

## Scope

In: `src/features/products/screens/ProductListScreen.tsx`, `components/ProductRow.tsx`, `components/ProductFiltersSheet.tsx`.

- **Top:** title "Products", segmented `ToggleGroup` My products / Shopping (Shopping shows the to-buy count; until task 034 the Shopping segment shows a placeholder), search `Input` (filters as you type, debounced 150 ms), filter button (shows how many filters are on), and the + button (soft accent icon button, spoken label "Add product"). Segments: sliding indicator and 200 ms cross-fade of the content; the header and toggle never move.
- **ProductRow** (72 pt min height): `ProductThumb`, name (`body-strong`, wraps), meta "Brand · Category", expiry line ("Expires in 12 days · 15 Oct", "Expired 3 days ago", "Not opened"), `AreaTag`, status `Badge` (never shrinks), red Avoid badge when `avoid` is true. Rows in a flush card with inset separators. Tap: push P2.
- **Row actions** on swipe (left) and long press (DropdownMenu): Mark as opened (only if not opened), Mark finished, Buy again, Duplicate. Mark finished removes the row with fade and height collapse (200 ms) and shows the toast "Vitamin C serum moved to Archive" with Undo (Undo restores it in place). Buy again calls task 034's action when it exists; until then it is hidden behind a feature check so this task doesn't depend on 034.
- **Filters sheet:** Area (All, Skin, Hair), Category (multi chips), Status (OK, Expiring soon, Expired, Not opened, No date), "Avoid badge only" switch; Sort: Soonest expiry (default), Name, Recently added; "Reset filters" ghost and "Show N products" primary in the pinned footer (N updates live). Filters persist in `uiStore` for the session, not across restarts.
- **Footer link:** "Archive (N)" pushes P5; hidden when N is 0.
- **Loading:** if the query isn't cached on the first frame, five 72 pt skeleton rows, replaced in place with a 150 ms fade. Refiltering keeps the previous list visible (`keepPreviousData`).
- **Empty states:** no products at all → spec copy "No products yet" / "Add the one you use most. Jx-Care tracks when it expires." / Add product, which opens P3 **quick mode** (`/product-form?mode=quick`). Filters that match nothing → "No products match" with "Reset filters" (not the first-run empty state).
- The + button opens quick mode while `hasAnyProduct` is false, otherwise the full form.

Out:

- Shopping segment content: 034. Archive screen: 015. Expiry reminders: 021.

## Acceptance criteria

- [ ] List, search, every filter and every sort work against real data (render tests with a seeded test database through the hooks, or with mocked hooks plus repository tests from 012).
- [ ] Mark finished shows the toast and Undo restores the product (test).
- [ ] No layout shift: badge widths stay fixed from "9 days" to "10 days"; switching segments doesn't move the header; loading uses skeletons at final size.
- [ ] Empty state for no products and for no matches, in LT and EN.
- [ ] Light, dark, 360 pt and Lithuanian checked.
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
