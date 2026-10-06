# 010 App shell and navigation

**Phase:** B. UI kit and shell · **Depends on:** 005, 009 · **Spec:** Navigation map, Screen inventory, Motion (tabs, push, full-screen flows, sheets) · **Design:** [components.md](../design/components.md) TabBar, ScreenHeader, Transitions; [screens.md](../design/screens.md)

## Goal

Every route in the app exists with the right presentation and transition, behind five bottom tabs, with placeholder screens that later tasks replace. After this task a person can move through the whole app's skeleton.

## Scope

In:

### Root (`app/_layout.tsx`)

Order of providers: `GestureHandlerRootView` → `SafeAreaProvider` → `KeyboardProvider` → splash/fonts/migrations gate (tasks 002, 004) → `QueryClientProvider` → `BottomSheetModalProvider` → stack → `ToastHost` and the rn-primitives `PortalHost` last. Navigation theme colours come from `useThemeColors()` so the background behind screens is `canvas` in both themes (no white flash during transitions).

### Routes

Route groups and files (thin files that render a placeholder screen component from `src/features/<area>/screens/`; placeholder = `ScreenHeader` + the screen's spec ID and name + an `EmptyState`-style note "Built in task NNN"):

| Route | Screen | Presentation |
| --- | --- | --- |
| `(onboarding)/welcome`, `create-pin`, `confirm-pin`, `recovery`, `biometrics` | O1–O5 | Stack, push |
| `lock`, `forgot-pin` | L1, L2 | No animation into lock; push to forgot-pin |
| `(tabs)/index` | T1 Today | Tab |
| `(tabs)/products/index`, `products/[id]`, `products/archive` | P1, P2, P5 | Tab stack, push |
| `(tabs)/routines/index`, `routines/[id]` (R2 editor), `routines/hair/[id]` (R5) | R1, R2, R5 | Tab stack, push |
| `(tabs)/calendar/index`, `calendar/day/[day]`, `calendar/progress`, `calendar/week/[area]/[weekStart]` | C1, C2, C3, C6 | Tab stack, push |
| `(tabs)/settings/index`, `ingredients`, `conflicts`, `avoid`, `reminders`, `security`, `preferences`, `backup` | S1–S8 | Tab stack, push |
| `product-form` (params `id?`, `mode=quick`, `fromShoppingItem?`) | P3 | `fullScreenModal`, `slide_from_bottom` 300 ms |
| `player/[routineId]` | T2 | `fullScreenModal`, slide up 300 ms |
| `progress/camera`, `progress/review`, `progress/compare` | C4, C5, C7 | `fullScreenModal`, slide up 300 ms |
| `hair/done/[taskId]` | T3 | Transparent modal route rendering a `SheetFrame` (so the hair reminder can open it) |

Other sheets (P4, P7, P8, R3, R4, T4, starter, quick hair setup, filters, reminder ask, conflict editor) open in place with task 009's `Sheet` and need no route.

### Tabs (`app/(tabs)/_layout.tsx`)

- Expo Router `Tabs` with a custom `TabBar` component (components.md TabBar): Today `home`, Products `package`, Routines `list-checks`, Calendar `calendar`, Settings `sliders`; 24 px icons; active `accent` with semibold label, others `ink-muted`; labels from i18n sized for the Lithuanian words (Šiandien, Produktai, Rutinos, Kalendorius, Nustatymai), 12 px, wrap allowed, no truncation at 360 pt.
- Tab switch: **cross-fade 150 ms, no slide** (`animation: 'fade'`). Each tab keeps its own stack and scroll position.
- Pushed screens inside a tab hide the tab bar only for full-screen flows (they are outside `(tabs)` anyway); normal pushes keep it.

### Headers and transitions

- `headerShown: false` everywhere; screens render `ScreenHeader` themselves.
- Push: native defaults (slide from right on iOS, fade-through on Android), gesture back on.
- With Reduce Motion on, pushes and modals use `animation: 'fade'` with 100 ms.

### Gate (placeholder logic until tasks 017 and 018)

`app/index.tsx` redirects: no settings row → `/(onboarding)/welcome`; otherwise → `/(tabs)`. Leave a clearly marked `TODO(018)` where the lock check goes.

### Deep links

The `jxcare://` scheme from task 001 resolves every route above (e.g. `jxcare://products/12`), which task 020's notification taps use.

Out:

- Real screens: their own tasks. Lock behaviour: 018.

## Acceptance criteria

- [ ] Every route in the table opens with the presentation and transition listed (manual walk-through on one platform, note it under Decisions); no white flash between screens in dark mode.
- [ ] Tab switches cross-fade in 150 ms and keep each tab's stack and scroll position.
- [ ] Tab labels fit in Lithuanian at 360 pt without truncation.
- [ ] `npx uri-scheme open jxcare://products/1 --ios` (or the Android equivalent) opens the product placeholder.
- [ ] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

(Write any choices you make here.)
