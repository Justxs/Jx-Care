# 005 Data access and app state

**Phase:** A. Foundation · **Depends on:** 003, 004 · **Spec:** Sequence diagrams ("Data" = TanStack Query over SQLite via Drizzle), Motion and layout stability (keep data while refetching, paint Today complete)

## Goal

The patterns every feature uses to read and write data and to hold app state: TanStack Query over the repositories, TanStack Store for in-memory state, and the settings row as the first real example of both.

## Scope

In:

1. **Packages:** `npm install @tanstack/react-query@latest @tanstack/react-store@latest`. Optional dev helper: `@tanstack/react-query-devtools` is web-only, so skip it.
2. **`src/db/queryClient.ts`:** one `QueryClient` with defaults for a local database: `staleTime: Infinity` (data only changes through our own mutations), `gcTime: 30 min`, `retry: 0`, `refetchOnWindowFocus: false`, `networkMode: 'always'` (no network involved). Provide it in `app/_layout.tsx` inside the migration gate.
3. **`src/db/queryKeys.ts`:** a key factory for every area, so invalidation is consistent:
   ```ts
   export const qk = {
     settings: ['settings'] as const,
     products: { all: ['products'] as const, list: (f: ProductFilters) => ['products', 'list', f] as const, detail: (id: number) => ['products', 'detail', id] as const },
     ingredients: { all: ['ingredients'] as const },
     routines: { all: ['routines'] as const, /* … */ },
     today: (day: string) => ['today', day] as const,
     // shopping, hair, calendar, conflicts, progress, condition, notes …
   };
   ```
   Add the keys for every area now (they're cheap), with a comment naming which task fills them in.
4. **Repository pattern** (document it at the top of `src/features/settings/repo.ts` as the example to copy):
   - Plain functions, first argument `db: Db`, no React, no Query. Synchronous Drizzle calls are fine.
   - Writes that touch several tables run in `db.transaction()`.
   - Each repo has a `repo.test.ts` using `createTestDb()` from task 004.
5. **Query hook pattern** in `api.ts`:
   - `useX()` wraps `useQuery({ queryKey, queryFn: () => repoFn(db, …) })`.
   - `useSaveX()` wraps `useMutation` and, on success, invalidates the keys it affects (always list them explicitly; also invalidate `qk.today(...)` when Today could change).
   - Lists that refilter use `placeholderData: keepPreviousData` so the previous list stays visible (no blank, no shift).
6. **Settings, as the first example:** `src/features/settings/repo.ts` with `getSettings(db)` (returns the row, or the defaults from task 004 when no row exists yet), `saveSettings(db, patch)` (upsert of id 1); `api.ts` with `useSettings()` and `useUpdateSettings()`. Tests for both.
7. **TanStack Store** in `src/state/`:
   - `appStore`: `language`, `isReady` (fonts + migrations), `activeDay` (the current app day, refreshed on app foreground and at 04:00, using task 006's `appDay()`; until 006 lands, a local stub with the same signature).
   - `lockStore`: `locked` (true at launch), `lastBackgroundAt`; task 018 fills in the behaviour.
   - `uiStore`: the toast queue (`showToast({ message, actionLabel?, onAction?, durationMs = 8000 })`) used by task 009's Toast host. Toasts stay 8 s; while a screen reader is on (`AccessibilityInfo.isScreenReaderEnabled()`) they stay until the next action or until dismissed (spec Global UI rules).
   - Read with `useStore(store, selector)`; write with `store.setState`. Export small action functions (`setLanguage`, `showToast`) instead of calling `setState` from screens.
   - Language: `setLanguage(lang)` updates `appStore`, i18next (task 003) and `settings.language`.
8. **Prefetch helper:** `prefetchToday(queryClient, day)` stub in `src/features/today/prefetch.ts`, called while the lock screen is open (task 018) so Today paints complete. Task 025 fills in what it prefetches.

Out:

- Feature repositories: each feature task writes its own.
- Persisting app state: anything that must survive a restart goes in `settings`, not the store.

## Acceptance criteria

- [ ] `useSettings()` returns defaults on a fresh database and the saved values after `useUpdateSettings()`; the hook re-renders consumers after the mutation.
- [ ] Changing language through `setLanguage` switches every mounted string at once and is still set after an app restart.
- [ ] `showToast` adds to the queue and the queue drops a toast after 8 s, but keeps it while a screen reader is on until it is dismissed or replaced (unit test with fake timers).
- [ ] `activeDay` changes from one app day to the next at 04:00 (unit test with fake timers and the stub or task 006's `appDay`).
- [ ] Repository and store tests pass; `npm run check` passes.

## Decisions

(Write any choices you make here.)
