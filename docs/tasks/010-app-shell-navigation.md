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
| `product-form` (params `id?`, `fromShoppingItem?`; with `id` Edit product, without it the short Add product form) | P3 | `fullScreenModal`, `slide_from_bottom` 300 ms |
| `player/[routineId]`, `player/[routineId]/done` (Routine done, opened with `router.replace`) | T2 | `fullScreenModal`, slide up 300 ms |
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

- **Gate moved into the tabs layout.** `app/index.tsx` and `app/(tabs)/index.tsx` would both be `/`, which Expo Router rejects, so there is no `app/index.tsx`. `app/(tabs)/_layout.tsx` redirects to `/welcome` while there is no settings row and carries the `TODO(018)` for the lock check.
- **Providers:** `GestureHandlerRootView` → `KeyboardProvider` → `QueryClientProvider` → `BottomSheetModalProvider` → migration gate → `ThemeProvider` → `Stack`, then `ToastHost` and `PortalHost`. Expo Router already wraps the app in a `SafeAreaProvider`, so we don't add a second one. The navigation theme (`src/navigation/theme.ts`) maps `background` to `canvas` and `card` to `surface`; every stack also sets `contentStyle` to `canvas`. `useThemeColors()` now returns a stable object per scheme.
- **Stack options** live in `src/navigation/stackOptions.ts`: `useStackOptions()` (no header, canvas, gesture back, native push; a 100 ms fade with Reduce Motion) and `useFullScreenModalOptions()` (`fullScreenModal`, `slide_from_bottom`, 300 ms). `player`, `progress` and `(onboarding)` have their own stack layouts so the root registers each flow once; the player also turns off swipe-to-dismiss (its close button decides). The lock screen has `animation: 'none'` and no gesture.
- **Tabs:** `animation: 'fade'` with a 150 ms timing (100 ms with Reduce Motion), a custom `TabBar` (`src/components/TabBar.tsx`, `tablist` with `tab` items and `selected` state). Active labels use a new `text-tiny-strong` style (12/16 SemiBold) because `font-semibold` alone would lose to the type style's family. Labels may wrap to two lines and cap font scaling at 1.3 so Lithuanian never truncates. The bar reports its height to `setToastInset`. Tapping the current tab does nothing; React Navigation pops a tab's stack to its root on a second tap of its own accord.
- **Placeholders:** every screen is a component in `src/features/<area>/screens/` rendering `PlaceholderScreen` (ScreenHeader, "P2 · Product", "Built in task 015.") with buttons to the screens it leads to, so the skeleton can be walked. Route files only re-export them. Titles are in `screens.*` and tab labels in `tabs.*`. `product-form` reads `id` and `fromShoppingItem`; with `id` it says Edit product.
- **Hair task done** (`hair/done/[taskId]`) is a `transparentModal` route rendering `ModalSheet` (`src/components/ModalSheet.tsx`): a fading backdrop and a `SheetFrame` panel that slides up, with the same dirty guard as in-place sheets. `SheetFrame` takes a `className`.
- **Tests:** `routes.test.ts` builds Expo Router's route tree from the real `app/` folder, checks every path in the table exists and that no two screens share a path (Expo Router only reports that at runtime). `navigation.test.tsx` renders the real layouts with `renderRouter`: a first launch lands on Welcome and `/products/12` opens the product placeholder once settings exist. Jest now transforms `standard-navigation`, and the Reanimated mock is patched at `react-native-reanimated/mock` because expo-router's testing library mocks Reanimated again from there.
- **Device check needed:** walking every route for the listed transitions, no white flash in dark mode, the tab cross-fade and kept scroll position, Lithuanian tab labels at 360 pt, and `npx uri-scheme open jxcare://products/1 --ios` (or `adb shell am start -d jxcare://products/1`). I couldn't run a simulator here.
