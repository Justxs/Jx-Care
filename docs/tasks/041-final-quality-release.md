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

(Write any choices you make here.)
