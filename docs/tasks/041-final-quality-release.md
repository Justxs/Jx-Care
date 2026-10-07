# 041 Final quality pass and release builds

**Phase:** M. Finish · **Depends on:** all other tasks · **Spec:** Global UI rules, Words and copy, Motion and layout stability, Empty states · **Design:** [DESIGN.md](../../DESIGN.md) rules, [docs/design/](../design/)

## Goal

Check the finished app against every global rule, fix what slipped, and produce installable Android and iOS builds.

## Scope

In:

### Audit (fix everything found; list findings and fixes under Decisions)

1. **Copy:** read every string in `en.json` and `lt.json` against the "Words and copy" table and the content rules (sentence case, verbs on buttons, no emoji, no exclamation marks, no em-dashes, one word per idea). Lithuanian: polite plural, correct plural forms, diacritics, and no English left over. Remove unused keys (script: grep each key in `src`).
2. **Lithuanian layout:** walk every screen in LT at 360 × 800 and with the largest system font size; nothing truncates where it should wrap, nothing overlaps.
3. **Themes:** walk every screen in light and dark; no hard-coded colours (`grep -rE "#[0-9a-fA-F]{3,6}" src` only finds `src/theme/colors.ts`).
4. **Layout shift:** every list loads without a jump (skeletons at final size or data already cached), badges and counters keep their width, forms keep helper lines, toasts and the wait bar float, Today paints complete after unlock.
5. **Motion:** every transition matches the spec table; Reduce Motion on turns slides and scales into 100 ms fades and counters jump to the final number.
6. **Accessibility:** VoiceOver and TalkBack pass over every screen: every control has a role, a label and its state; icon-only buttons are labelled ("Delete last digit", "More actions", "Show last photo as a guide"); calendar days read their status; ConflictTag, Badge and AreaTag always carry words; touch targets ≥ 44 pt; text contrast 4.5:1 (no text with opacity).
7. **Empty states:** every list from the spec's table shows its exact copy and action.
8. **Notifications:** with 30+ products, several routines and hair tasks, the pending count stays ≤ 60 and tops up on open; every notification opens its screen after unlock; actions work.
9. **Privacy:** app switcher blur on both platforms; no photo in the gallery; backup excludes secure data.
10. **Performance:** Today, Products (200 products) and Calendar render a first frame under 300 ms on a mid-range Android phone in a release build; ticking a step responds in one frame.

### Release builds

- `eas.json` with `development`, `preview` (internal distribution APK / ad-hoc IPA) and `production` profiles; `npx expo install expo-dev-client` for the development profile.
- Version `1.0.0`, build numbers auto-incremented by EAS (`appVersionSource: remote`).
- App name, icons, splash and adaptive icon from docs/brand.md checked on both platforms.
- iOS permission texts (camera, Face ID, notifications) in English, with Lithuanian through `locales` in app.json (`ios.infoPlist` per language).
- A `preview` Android build installs and runs end to end on a real phone (note the build link under Decisions; Justas runs the iOS build with his Apple account).
- Update the root README with how to build (`eas build --profile preview --platform android`).

Out:

- Store listings and publishing (not asked for).

## Acceptance criteria

- [ ] Every audit item above is checked and its findings fixed or listed with a reason.
- [ ] `npm run check` passes and the coverage of `src/lib` stays at least 95%.
- [ ] A preview Android build installs and runs through onboarding, adding a product, a routine, ticking it, a hair wash, a weekly photo and a backup round trip.
- [ ] README updated; all tasks in docs/tasks/README.md marked done.

## Decisions

### Audit

What could be checked without a phone was checked in code and tests; the rest is in [docs/device-checklist.md](../device-checklist.md), one walk-through for the preview build.

1. **Copy:** a script read all 1341 EN and 1477 LT strings (LT has more plural forms) for em and en dashes, exclamation marks, emoji and "..." (none), Lithuanian values left in English (only format strings like `{{count}} min`, the app name and units), and Title Case (none, only proper nouns and sentence starts). The spec's empty-state table matches word for word. Unused keys removed: `hair.picker.*` (the hair picker now uses the shared product picker), `dev.time`, `forms.errors.dateRequired`, `forms.errors.monthsNumber`. The `dev.*` strings stay for the development-only component gallery (`/dev/components`), which `overlays.test.tsx` also uses.
2. **Lithuanian layout:** needs the phone (largest font at 360 × 800). Every screen has a Lithuanian long-text story in Storybook for a quick look.
3. **Themes:** `grep -rE "#[0-9a-fA-F]{3,6}" src` finds only `src/theme/colors.ts` (and notification ids like `#abc` in tests). Light and dark on the phone: checklist.
4. **Layout shift:** covered by each screen's tests (skeletons at final size, reserved helper lines, floating toasts and wait bar, Today prefetched before unlock). The visual pass is on the checklist.
5. **Motion:** Reanimated skips layout animations and timings when Reduce Motion is on (its default `ReduceMotion.System`), so no slide or scale runs. Two places now fade for 100 ms instead of appearing at once: the toast (was a fade-down) and the route sheet `ModalSheet` (was a slide-up). Counters already jump (`useCountUp` with `allowCounting`).
6. **Accessibility:** the Storybook smoke test now also fails when a control a screen reader can reach has no role or no name, across every story. It found two problems, both fixed:
   - The Today setup card was one accessible element (a `Pressable` for the long-press Hide), so VoiceOver and TalkBack could not reach the buttons inside. It is no longer accessible itself; the card's title carries the Hide action.
   - Every form label was a role-less focus stop (rn-primitives `Label` is a pressable). Labels are no longer focusable; each control already carries its label.
   Touch targets, contrast and how each screen reads aloud need the phone: checklist.
7. **Empty states:** all nine from the spec's table, exact copy and action (checked against `en.json`, and each list screen has an Empty story).
8. **Notifications:** `src/notifications/__tests__/load.test.ts` seeds 80 products, 4 routines and 3 hair tasks: 60 pending at most, a second sync changes nothing, and it tops up after delivered notifications are gone. Taps after unlock and actions with the app closed: checklist.
9. **Privacy:** the app switcher overlay is a blur with the logo (task 018); progress photos are saved in the app's own folder, never the gallery (task 035); backups exclude the PIN, recovery answer and biometrics flag, which live in secure storage (task 040 tests).
10. **Performance:** needs a release build on a mid-range Android phone: checklist.

`src/lib` coverage: 99.8% statements, 91% branches, 100% functions and lines.

Not done, on purpose:

- A Clear action on DateField (task 014 note) waits for a reason from the phone; switching Yes/Not yet clears the printed expiry on the short form.
- The shopping list's add-item sheet keeps its own product search rather than the shared product picker; it adds names that aren't products too.

### Release builds

- `eas.json` has `development` (dev client, APK), `preview` (internal, APK, auto-incremented build numbers) and `production`; `appVersionSource: remote`, version 1.0.0. `expo-dev-client` is installed.
- iOS permission texts (camera, photo library, Face ID) are in English in `app.json` with Lithuanian through `locales/lt.json` (`CFBundleAllowMixedLocalizations`). Notifications have no iOS usage text.
- Icons, splash and adaptive icon are the frog from docs/brand.md (task 001); the notification icon is the white frog (task 020).
- README has the build commands.
- **Skipped for now (Justas, 2026-10-07):** the `preview` build and the phone walk-through. When picked up: `npx eas-cli login` (or an `EXPO_TOKEN`), the first build links the project (`eas init`), the iOS build needs Justas's Apple account, then walk [docs/device-checklist.md](../device-checklist.md). The task is marked done with these two acceptance criteria open.
