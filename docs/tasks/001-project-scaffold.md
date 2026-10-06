# 001 Project scaffold

**Phase:** A. Foundation · **Depends on:** none · **Spec:** Global UI rules (platforms, portrait) · **Brand:** [docs/brand.md](../brand.md)

## Goal

An Expo SDK 57 app with TypeScript, Expo Router, linting, formatting and Jest, set up in the repository root with the folder layout from [conventions.md](conventions.md). It shows one placeholder screen and every later task builds on it.

## Scope

In:

- Create the Expo project **in the repository root** (the repo already has `assets/`, `docs/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `LICENSE`; keep them). The simplest way: run `npx create-expo-app@latest jx-care-tmp --template blank-typescript` in a temporary folder, then move its files into the repo root, without overwriting `assets/` or the docs.
- Expo Router: `npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar`, `"main": "expo-router/entry"` in package.json, an `app/_layout.tsx` with a `Stack` and an `app/index.tsx` placeholder that says "Jx-Care".
- `app.json`:
  - `name` "Jx-Care", `slug` "jx-care", `scheme` "jxcare", `orientation` "portrait", `userInterfaceStyle` "automatic", `newArchEnabled` true (the default on SDK 57).
  - `ios.bundleIdentifier` and `android.package` both `eu.jxcare.app`; `ios.supportsTablet` false.
  - Icons and splash exactly as in [docs/brand.md](../brand.md) (`assets/images/icon.png`, `adaptive-icon.png` with background `#d94f87`, `splash-icon.png`, `favicon.png`). Splash background `#F8F4F5` (the light `canvas` token) and, under `dark`, `#141112`.
  - `plugins`: `expo-router`, `expo-splash-screen` (config above). Later tasks add their own plugins.
  - `experiments.typedRoutes` true.
- TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`, path alias `"@/*": ["src/*"]`.
- Create the empty folder layout from conventions.md with a `.gitkeep` where a folder would otherwise be empty: `src/components/ui`, `src/features`, `src/db`, `src/lib`, `src/i18n`, `src/state`, `src/notifications`, `src/theme`.
- Lint and format: `npx expo lint` (sets up `eslint-config-expo` with the flat config), Prettier with `singleQuote: true`, `printWidth: 100`, `trailingComma: 'all'`, plus `eslint-config-prettier`.
- Jest: `npx expo install jest-expo jest @types/jest --dev`, preset `jest-expo`, `@testing-library/react-native`. One sample test for a tiny function in `src/lib/` (it can be deleted by task 006) and one render test for the placeholder screen.
- npm scripts:
  - `start`, `android`, `ios` (Expo defaults)
  - `typecheck`: `tsc --noEmit`
  - `lint`: `expo lint`
  - `format`: `prettier --write .`
  - `test`: `jest`
  - `check`: `npm run typecheck && npm run lint && npm run test -- --ci`
- `.gitignore` from the template plus `/tmp`, `*.db`, `.expo/`.
- Replace `README.md` with a short one: what the app is (one paragraph from PRODUCT.md), how to run it (`npm install`, `npx expo start`), `npm run check`, and a link to `docs/tasks/README.md`.

Out:

- Styling, fonts, translations, database: tasks 002–005.
- EAS build config: task 041.

## Acceptance criteria

- [ ] `npm install` then `npx expo start` starts Metro without errors, and the placeholder screen renders in Expo Go or a dev build.
- [ ] `npm run check` passes.
- [ ] `npx expo export --platform android --output-dir /tmp/jx-export` bundles.
- [ ] `npx expo-doctor` reports no problems (or only ones explained under Decisions).
- [ ] App icon, adaptive icon and splash point at the existing files in `assets/images/`.
- [ ] Importing `@/lib/<file>` works in app code and in Jest.

## Notes

- Use the newest SDK the template gives you (57 at the time of writing). If `create-expo-app` gives a newer SDK, use it and note the version under Decisions.
- Do not add Expo Router's template screens, sample components, or the `(tabs)` example; task 010 builds navigation.

## Decisions

(Write any choices you make here.)
