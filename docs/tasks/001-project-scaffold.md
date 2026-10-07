# 001 Project scaffold

**Phase:** A. Foundation · **Depends on:** none · **Spec:** Global UI rules (platforms, portrait) · **Brand:** [docs/brand.md](../brand.md)

## Goal

An Expo SDK 57 app with TypeScript, Expo Router, linting, formatting and Jest, set up in the repository root with the folder layout from [conventions.md](conventions.md). It shows one placeholder screen and every later task builds on it.

## Scope

In:

- Create the Expo project **in the repository root** (the repo already has `assets/`, `docs/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `LICENSE`; keep them). The simplest way: run `pnpm create expo-app@latest jx-care-tmp --template blank-typescript` in a temporary folder, then move its files into the repo root, without overwriting `assets/` or the docs.
- Expo Router: `pnpm expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar`, `"main": "expo-router/entry"` in package.json, an `app/_layout.tsx` with a `Stack` and an `app/index.tsx` placeholder that says "Jx Care".
- `app.json`:
  - `name` "Jx Care", `slug` "jx-care", `scheme` "jxcare", `orientation` "portrait", `userInterfaceStyle` "automatic", `newArchEnabled` true (the default on SDK 57).
  - `ios.bundleIdentifier` and `android.package` both `eu.jxcare.app`; `ios.supportsTablet` false.
  - Icons and splash exactly as in [docs/brand.md](../brand.md) (`assets/images/icon.png`, `adaptive-icon.png` with background `#d94f87`, `splash-icon.png`, `favicon.png`). Splash background `#F8F4F5` (the light `canvas` token) and, under `dark`, `#141112`.
  - `plugins`: `expo-router`, `expo-splash-screen` (config above). Later tasks add their own plugins.
  - `experiments.typedRoutes` true.
- TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`, path alias `"@/*": ["src/*"]`.
- Create the empty folder layout from conventions.md with a `.gitkeep` where a folder would otherwise be empty: `src/components/ui`, `src/features`, `src/db`, `src/lib`, `src/i18n`, `src/state`, `src/notifications`, `src/theme`.
- Lint and format with oxc (Justas, 2026-10-07: "for linting and formating use oxc"): `oxlint` with `.oxlintrc.json` (TypeScript, React, React hooks, import, Jest and jsx-a11y plugins) and `oxfmt` with `.oxfmtrc.json` (`singleQuote: true`, `printWidth: 100`, `trailingComma: 'all'`). No ESLint or Prettier.
- Jest: `pnpm expo install jest-expo jest @types/jest --dev`, preset `jest-expo`, `@testing-library/react-native`. One sample test for a tiny function in `src/lib/` (it can be deleted by task 006) and one render test for the placeholder screen.
- package.json scripts:
  - `start`, `android`, `ios` (Expo defaults)
  - `typecheck`: `tsc --noEmit`
  - `lint`: `oxlint --deny-warnings`
  - `format`: `oxfmt`; `format:check`: `oxfmt --check`
  - `test`: `jest`
  - `check`: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test --ci`
- `.gitignore` from the template plus `/tmp`, `*.db`, `.expo/`.
- Replace `README.md` with a short one: what the app is (one paragraph from PRODUCT.md), how to run it (`pnpm install`, `pnpm expo start`), `pnpm check`, and a link to `docs/tasks/README.md`.

Out:

- Styling, fonts, translations, database: tasks 002–005.
- EAS build config: task 041.

## Acceptance criteria

- [ ] `pnpm install` then `pnpm expo start` starts Metro without errors, and the placeholder screen renders in Expo Go or a dev build.
- [ ] `pnpm check` passes.
- [ ] `pnpm expo export --platform android --output-dir /tmp/jx-export` bundles.
- [ ] `pnpm dlx expo-doctor` reports no problems (or only ones explained under Decisions).
- [ ] App icon, adaptive icon and splash point at the existing files in `assets/images/`.
- [ ] Importing `@/lib/<file>` works in app code and in Jest.

## Notes

- Use the newest SDK the template gives you (57 at the time of writing). If `create-expo-app` gives a newer SDK, use it and note the version under Decisions.
- Do not add Expo Router's template screens, sample components, or the `(tabs)` example; task 010 builds navigation.

## Decisions

- Expo SDK 57.0.27 from the template, with React Native 0.86.3 and React 19.2.3 (conventions.md expected RN 0.87; SDK 57 ships 0.86).
- `api.expo.dev` and the React Native Directory are blocked from the cloud build container, so packages were added with `EXPO_OFFLINE=1 npx expo install …`, which uses the SDK's bundled version list. `expo-doctor` passes 19 of 21 checks; the two that fail are the app.json schema and React Native Directory checks, which need those blocked hosts. Re-run `pnpm dlx expo-doctor` on a machine with normal network.
- Jest 29.7 instead of 30: `jest-expo` 57 is built on Jest 29 (babel-jest 29, jest-environment 29). `@testing-library/react-native` 14 needs `test-renderer`; it is pinned to 1.2 because 1.3 pulls a React 19.3 reconciler and the SDK pins React 19.2.3.
- Linting and formatting moved from ESLint 9 + Prettier to oxc (`oxlint` 1.87, `oxfmt` 0.72) on 2026-10-07 at Justas's request. `pnpm lint` fails on warnings too, and `pnpm check` also runs `oxfmt --check`.
- `tsconfig.json` lists `types: ["jest", "node"]` because TypeScript 6 no longer loads every `@types` package by default.
- `react-dom` 19.2.3 is a dev dependency so npm doesn't resolve Expo's optional `react-dom` peer to a newer React.
