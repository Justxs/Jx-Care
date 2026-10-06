# 012 Products data

**Phase:** C. Products · **Depends on:** 005, 006 · **Spec:** P1 (filters, sort, status), P2 (detail, used in, cost per day), P3 (fields, rules), P4 (ingredients), P5 (archive), refinement 10 (archive vs delete)

## Goal

Everything the product screens need from the database, as tested repository functions and TanStack Query hooks. No UI in this task.

## Scope

In: `src/features/products/repo.ts`, `repo.test.ts`, `api.ts`, `types.ts`, `schema.ts` (zod).

### Types

- `ProductFilters = { area: 'all' | 'skin' | 'hair'; categories: Category[]; statuses: ExpiryStatus[]; avoidOnly: boolean; search: string; sort: 'expiry' | 'name' | 'recent' }`. Default: all areas, no category or status filter, `sort: 'expiry'`.
- `ProductListItem`: the product row plus computed `status`, `daysLeft`, `effectiveExpiry` (task 006) and `avoid: boolean` (task 007 `avoidMatches`; `false` until task 029/030 add avoid items, but wire it now).
- `ProductDetail`: the product, its ingredients in order (`{ id, name, groupId }`), computed expiry fields, `costPerDay` when archived (task 006), and `usedIn` (routine steps and hair tasks that reference it; return `[]` until tasks 022 and 031 add those tables' queries, through a function they can extend).

### Repository functions (all take `db` first)

| Function | Does |
| --- | --- |
| `listProducts(db, filters, today, warnDays)` | Active products (`archivedAt` null) filtered and sorted. Search matches name or brand, case- and accent-insensitive (`normalizeName`). Area "skin" includes `both`; "hair" includes `both`. Status filter uses the computed status. Sort `expiry` uses `sortBySoonestExpiry`, `name` is locale-aware A–Z, `recent` is newest `createdAt` first |
| `countArchived(db)` | For the "Archive (N)" footer link |
| `getProduct(db, id, today, warnDays)` | `ProductDetail` or `null` |
| `createProduct(db, input)` | Inserts the product and its ingredients in one transaction; returns the id |
| `updateProduct(db, id, input)` | Updates fields and replaces the ingredient list in one transaction |
| `saveIngredients(db, productId, lines)` | Takes parsed lines (task 006 `parseIngredientLines`), finds or creates each `ingredient` by `normalizedName`, writes `product_ingredient` with `position`; returns the new ingredient ids |
| `markOpened(db, id, today)` | Sets `openedAt` to today |
| `markFinished(db, id, today)` | Sets `archivedAt` to today; returns the previous value for Undo |
| `restoreProduct(db, id)` | Clears `archivedAt` |
| `deleteProduct(db, id)` | Only allowed when archived (throws otherwise); deletes the photo file too (through an injected `deleteFile` so tests don't touch the file system) |
| `duplicateProduct(db, id)` | Copies fields and ingredients, name unchanged, dates `purchasedAt` today, `openedAt`/`archivedAt` null, no rating or notes; returns the new id |
| `listArchived(db, sort)` | Archived products, `sort: 'date' \| 'cost'`, each with `archivedAt` and `costPerDay` |
| `brandSuggestions(db, prefix)` | Distinct earlier brands matching the prefix, up to 5 |
| `listKnownIngredients(db)` | For P4 suggestions: `{ id, name, normalizedName, groupId }[]` |
| `productsForPicker(db, { area, search, category })` | For R4/P7 pickers: active products of that area (skin pickers include `both`), with status |
| `expiringSoon(db, today, warnDays, limit)` | Active products with status `expiring` or `expired`, soonest first, for the Today card |
| `hasAnyProduct(db)` | For quick mode (spec P3: quick mode only while there are no products) |

### Validation (`schema.ts`, zod, shared with the form in task 014)

- Name required, 1–80 characters after trim; area required; category default `other`; size > 0 when given; price ≥ 0 (form gives a decimal string, store integer cents); `openedAt` ≤ today; `paoMonths` 1–120; notes ≤ 500; `expiresAt` any date.
- Error messages are i18n keys (`products.errors.nameRequired` → "Enter a name."), not English text.

### Query hooks (`api.ts`)

`useProducts(filters)` (with `keepPreviousData`), `useProduct(id)`, `useArchivedProducts(sort)`, `useArchiveCount()`, `useExpiringSoon()`, `useBrandSuggestions(prefix)`, `useKnownIngredients()`, `useHasAnyProduct()`, and mutations `useCreateProduct`, `useUpdateProduct`, `useMarkOpened`, `useMarkFinished`, `useRestoreProduct`, `useDeleteProduct`, `useDuplicateProduct`. Each mutation invalidates `qk.products.all`, `qk.ingredients.all` when ingredients change, and `qk.today(activeDay)`. `today` and `warnDays` come from `appStore.activeDay` and `useSettings()`; include them in the query keys so lists recompute at 04:00 and when the warning window changes.

Out:

- Screens: tasks 013–015.
- Photo capture and file saving: task 014 (this task only stores `photoUri`).
- Rating, would buy again and notes: task 039. Shopping and Buy again: task 034.
- Expiry notifications: task 021 hooks into create/update/finish/delete later; leave a clearly named `onProductChanged(id)` call site in the mutations that does nothing yet.

## Acceptance criteria

- [ ] Every repository function has tests on `createTestDb()`, including: search ignores accents and case; area filter includes `both`; status filter and expiry sort agree with task 006; creating two products with "Niacinamide" and " niacinamide" makes one ingredient; updating a product's ingredient list removes dropped links but keeps the ingredient row; delete refuses an active product; duplicate copies ingredients; archive list sorts by cost per day with products lacking a cost last.
- [ ] zod schema tests for each rule.
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
