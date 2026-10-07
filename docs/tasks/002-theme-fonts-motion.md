# 002 Theme, fonts and motion

**Phase:** A. Foundation · **Depends on:** 001 · **Spec:** Global UI rules (theme), Styling, Motion and layout stability · **Design:** [DESIGN.md](../../DESIGN.md), [docs/design/nativewind.md](../design/nativewind.md)

## Goal

NativeWind 4.2 with every design token as a Tailwind class that switches between light and dark with the phone, the Figtree font loaded before the splash screen hides, and one place for motion timings that every animation uses.

## Scope

In:

1. **NativeWind 4.2 + Tailwind 3.4.** Follow the NativeWind v4 Expo install guide (https://www.nativewind.dev/docs/getting-started/installation): `npm install nativewind@^4.2 tailwindcss@^3.4`, `npx expo install react-native-reanimated react-native-worklets react-native-safe-area-context`, `babel.config.js` with `['babel-preset-expo', { jsxImportSource: 'nativewind' }]` and `'nativewind/babel'`, `metro.config.js` with `withNativeWind(config, { input: './global.css' })`, `nativewind-env.d.ts`. Do **not** install Tailwind 4 or NativeWind 5.
2. **`global.css`** at the repo root with the light `:root` and `.dark:root` variables, copied exactly from [docs/design/nativewind.md](../design/nativewind.md). Import it once in `app/_layout.tsx`.
3. **`tailwind.config.js`** copied from the same file. `content` must be `['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}']`.
4. **Fonts:** `npx expo install @expo-google-fonts/figtree expo-font expo-splash-screen`. Load `Figtree_400Regular`, `Figtree_500Medium`, `Figtree_600SemiBold`, `Figtree_700Bold` in `app/_layout.tsx`. Call `SplashScreen.preventAutoHideAsync()` at module level and hide the splash only after fonts are loaded (task 004 will also wait for migrations here). Set `font-sans` and `bg-canvas` on the root view.
5. **Weights on Android:** each weight is its own family, so the type classes must set the family, not only `fontWeight`. Make `text-body-strong`, `text-title-*`, `text-label`, `text-overline` and `text-display` resolve to the right Figtree family. One way: a small Tailwind plugin that adds `fontFamily` to those `fontSize` utilities; another: a `Text` wrapper in `src/components/ui/text.tsx` that maps the class to the family. Pick one, write it under Decisions, and make sure `<Text className="text-body-strong">` renders semibold on Android and iOS.
6. **Dark mode:** follows the phone (`userInterfaceStyle: automatic` from 001). Use NativeWind's `useColorScheme()`; no manual toggle in this app. Status bar style follows the theme.
7. **`src/theme/motion.ts`** exporting the motion scale (values from DESIGN.md and the spec):
   ```ts
   export const motion = {
     duration: { fast: 150, base: 200, slow: 300, reduced: 100 },
     // cubic-bezier control points for Easing.bezier
     easing: { standard: [0.2, 0, 0, 1], enter: [0, 0, 0.2, 1], exit: [0.4, 0, 1, 1] },
     spring: { damping: 34, stiffness: 280, mass: 1 }, // critically damped, no overshoot
   } as const;
   ```
   plus helpers `timing(kind)` returning Reanimated `withTiming` config (duration + `Easing.bezier`) and a `useMotion()` hook that returns the reduced variant (100 ms fades, no translate or scale) when Reduce Motion is on (`useReducedMotion()` from Reanimated).
8. **`src/theme/colors.ts`:** the token hex values for light and dark (same numbers as global.css) for the few places that can't take a className: navigation theme, status bar, `react-native-svg` strokes, `@gorhom/bottom-sheet` backgrounds, notification accent colour. Export `useThemeColors()`. Add a unit test that every key in `colors.ts` exists in `global.css` with the same RGB value, so the two can't drift.
9. **Theme preview screen** at `app/dev/theme.tsx`, only reachable in development (`__DEV__`): swatches for every colour token, every type style with a Lithuanian sample ("Ąžuolinė šukuosena · 12,50 €"), radius and shadow samples. This is how later tasks and reviewers check the theme.

Out:

- Components (Button, Card, …): task 008.
- Navigation transitions: task 010.

## Acceptance criteria

- [ ] `<View className="bg-surface rounded-xl shadow-card p-4"><Text className="text-title-s text-ink">…</Text></View>` renders with the right colours in light and dark, switching live when the phone theme changes.
- [ ] All 24 colour tokens plus `camera-bg` (fixed in both themes, for C4) and the React Native Reusables aliases (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-input`, …) work as classes.
- [ ] Type classes match DESIGN.md: `caption` and `overline` are **13 px / 18 px**, overline is semibold and **not** uppercase (DESIGN.md wins over any older 11–12 px value).
- [ ] Figtree renders in all four weights on Android and iOS; there is no flash of the system font (the splash stays until fonts load).
- [ ] `motion.ts`, `useMotion()` and `colors.ts` exist with tests; the colour drift test passes.
- [ ] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Notes

- `shadow-card` uses React Native's `boxShadow`, available on the new architecture. In dark mode the token is a 1 px hairline (`0 0 0 1px rgba(255,255,255,0.04)`), so define the dark value in the config with a `dark:` variant or a CSS variable.
- Tabular numbers: `tabular-nums` maps to `fontVariant: ['tabular-nums']`; check it works with Figtree.

## Decisions

(Write any choices you make here.)
