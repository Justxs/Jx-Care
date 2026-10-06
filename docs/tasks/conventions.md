# Conventions for every task

Read this file and the task file before writing code. Where a task and this file disagree, the task wins for that task only.

## Sources of truth

Read them in this order when they disagree:

1. **The task file** you are working on.
2. **[docs/feature-spec.md](../feature-spec.md)**: screens (IDs O1–S8), states, flows, copy, motion and layout rules. It wins over the feature plan.
3. **[DESIGN.md](../../DESIGN.md)**: colour tokens, type scale, spacing, radius, motion and the "what we avoid" rules.
4. **[docs/design/](../design/)**: the design system copied from the Claude artifact (component props, screen notes, NativeWind config) so you can read it offline. Its README lists the places where those notes disagree with the spec and what to build instead. The live artifact is https://claude.ai/artifact/6wezpPoHNSQoe9bM6GUryU; you may not be able to open it, and you don't need to.
5. **[docs/feature-plan.md](../feature-plan.md)**: background and the original data model.
6. **[PRODUCT.md](../../PRODUCT.md)** and **[docs/brand.md](../brand.md)**: voice, principles, logo and icon files.

If something you need is in none of them, pick the simplest option that fits the spec, write it down under "Decisions" at the bottom of the task file, and carry on.

## Stack (fixed)

Use the newest stable versions. Expo packages go in with `npx expo install <pkg>` so they match the SDK; everything else with `npm install <pkg>@latest`. Versions on 2026-10-06 for reference:

| Need | Package | Version seen |
| --- | --- | --- |
| Framework | `expo` (SDK 57), `react-native` 0.87, `react` 19, TypeScript strict | 57.0.x |
| Routing | `expo-router` (file-based, tabs + stacks) | 57.0.x |
| Database | `expo-sqlite` + `drizzle-orm`, `drizzle-kit` for migrations | 0.45 / 0.31 |
| Data state | `@tanstack/react-query` | 5.x |
| App state | `@tanstack/react-store` (no Zustand, no Redux, no React Context for state) | 0.11 |
| Forms | `@tanstack/react-form` + `zod` for schemas | 1.x / 4.x |
| Base components | `@rn-primitives/*` (React Native Reusables setup) | 1.5 |
| Styling | `nativewind` **4.2** + `tailwindcss` **3.4** (not Tailwind 4, not NativeWind 5 RC) | 4.2.7 / 3.4.19 |
| Animation | `react-native-reanimated` 4 (+ `react-native-worklets`), `react-native-gesture-handler` | 4.x |
| Sheets | `@gorhom/bottom-sheet` 5 | 5.x |
| Icons | `lucide-react-native` + `react-native-svg` | latest |
| Other UI helpers | `expo-haptics` (tick feedback), `expo-blur` (app switcher overlay), `react-native-keyboard-controller` (forms and sheets), `react-native-draggable-flatlist` (step reorder) | latest |
| Font | `@expo-google-fonts/figtree` + `expo-font` | latest |
| i18n | `i18next`, `react-i18next`, `expo-localization` | 26 / 17 |
| Dates | `date-fns` 4 (+ `Intl.DateTimeFormat` for display) | 4.x |
| Secure data | `expo-secure-store`, `expo-crypto`, `expo-local-authentication` | SDK |
| Notifications | `expo-notifications` (local only) | SDK |
| Media | `expo-image`, `expo-image-picker`, `expo-camera`, `expo-file-system`, `expo-sharing` | SDK |
| Tests | `jest` + `jest-expo`, `@testing-library/react-native`, `better-sqlite3` (repository tests in Node) | 30 / 14 |

Don't add other runtime libraries unless the task names them. If you really need one, write why under "Decisions".

## Folder layout

```
app/                         Expo Router routes only: thin files that render a screen from src/
  _layout.tsx                root: providers, fonts, splash, migrations, lock gate
  (onboarding)/              O1–O5
  lock.tsx, forgot-pin.tsx   L1, L2
  (tabs)/                    Today, Products, Routines, Calendar, Settings (+ their stacks)
  ...                        full-screen flows and sheets as modal routes
src/
  components/ui/             base components styled from rn-primitives (Button, Checkbox, ...)
  components/                shared app components (ProductRow, PinPad, StreakCard, ...)
  features/<area>/           screens, hooks and data access for one area
    screens/                 screen components (ProductListScreen.tsx, ...)
    components/              components only this area uses
    api.ts                   TanStack Query hooks (useProducts, useSaveProduct, ...)
    repo.ts                  database functions (take a db argument; no React)
  db/                        schema.ts, client.ts, migrations/ (generated), test-db.ts
  lib/                       pure logic with no React, no Expo: dates, expiry, schedule, streak, conflicts, ...
  i18n/                      index.ts, en.json, lt.json, format.ts
  state/                     TanStack Store stores (app, lock, ui)
  notifications/             scheduling and response handling
  theme/                     motion.ts, useReducedMotion, colours for non-className use
docs/tasks/                  these task files
```

Areas under `src/features/`: `onboarding`, `security`, `today`, `products`, `shopping`, `routines`, `hair`, `calendar`, `conflicts`, `progress`, `condition`, `settings`, `backup`.

Import with the `@/` alias (`@/lib/expiry`), which points at `src/`.

## Code rules

- **TypeScript strict**, no `any`, no `@ts-ignore`. Export types for anything another area uses.
- **Pure logic lives in `src/lib/`** and gets unit tests. Screens never compute expiry, streaks, schedules or conflicts themselves; they call `src/lib`.
- **Database access lives in `repo.ts` files** as plain functions that take a Drizzle database as their first argument (`listProducts(db, filters)`). That is what lets the same code run on expo-sqlite in the app and on better-sqlite3 in Jest.
- **Reads go through TanStack Query** hooks in `api.ts` with keys from `src/db/queryKeys.ts`. Mutations invalidate the keys they affect. Use `placeholderData: keepPreviousData` on lists that refilter, so the old list stays on screen instead of a blank.
- **App state** (language, lock state, first-run flags in memory, toasts) is TanStack Store in `src/state/`. Persisted settings live in the `settings` table and are read with Query.
- **Forms** use TanStack Form with a zod schema; errors show in the reserved helper line under the field.
- **Dates:** a calendar day is a `'YYYY-MM-DD'` string and is always the **app day** (the day ends at 04:00, see `src/lib/appDay.ts`). Moments in time are epoch milliseconds (`number`). Never store `Date` objects or locale strings.
- **Weekdays** are ISO numbers: 1 = Monday … 7 = Sunday. Weeks start on Monday.
- **Money** is stored as integer cents with the currency code from settings.
- **Ids** are SQLite integer primary keys.

## UI rules (from the spec and DESIGN.md)

- **Only tokens.** Colours, type, radius and shadow come from Tailwind classes (`bg-surface`, `text-ink-muted`, `text-body-strong`, `rounded-xl`, `shadow-card`). No hex values, no inline style objects, except Reanimated animated styles.
- **Every string** comes from `en.json` and `lt.json` through `t()`. Add both languages in the same change. Lithuanian runs 20–30% longer: use `min-h-*`, never fixed heights on text containers, and let labels wrap.
- **Words:** use the "Words and copy" table in the spec (Buy again, Mark finished, Start, Time of day, Every time / Set days / Every few days, Other care, mild, Weekly photo). Sentence case, verbs on buttons, no emoji, no exclamation marks, no em-dashes.
- **No layout shift:** skeletons at final size (never spinners), reserved image boxes, a reserved helper line under every field, `tabular-nums` on changing numbers, badges `min-w-[44px]`, a 6-row calendar, toasts and timers floating above the tab bar, late sections animate their height open.
- **Motion:** use the constants in `src/theme/motion.ts`. Enter with ease-out, leave with ease-in, no bounce. When Reduce Motion is on, slides and scales become 100 ms fades and counters jump to the final number.
- **Touch targets** at least 44 × 44 (use `hitSlop` on smaller visuals). Icon-only buttons have an `accessibilityLabel` from i18n ("Delete last digit", "More actions").
- **One filled accent button per screen.** No icon tiles, no uppercase overlines, no card inside a card (see DESIGN.md "Rules").
- **Both themes:** check every screen in light and dark.

## Definition of done

A task is done when all of this is true:

1. Every acceptance criterion in the task is met.
2. `npm run check` passes (typecheck, lint, tests). Pure logic and repositories you added have tests.
3. If you changed config, native modules or babel/metro setup: `npx expo export --platform android --output-dir /tmp/jx-export` bundles without errors.
4. New strings exist in both `en.json` and `lt.json`.
5. The status of the task is set to **done** in [README.md](README.md), and anything you decided is written under "Decisions" in the task file.
6. The work is committed **straight to `main`** (no branches, no pull requests) with the message `Task NNN: <title>` and pushed.

## Working on a task

1. Pull `main`. Check in [README.md](README.md) that every task in "Depends on" is done.
2. Set the task to **in progress** in README.md and commit that line on its own, so two agents don't take the same task.
3. Build it. Keep to the task's scope; if you find work that belongs to another task, leave a note in that task's file instead of doing it.
4. Finish with the definition of done.
