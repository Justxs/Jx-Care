# 037 Progress timeline, week detail and compare

**Phase:** K. Progress photos · **Depends on:** 036 · **Spec:** C3, C6, C7, S7 (progress photo options), C2 (photo line), Empty states (Progress) · **Design:** [screens.md](../design/screens.md) ProgressPhotosScreen, WeekDetailScreen, PhotoCompareScreen, PreferencesScreen

## Goal

Looking back at progress: a weekly grid of photos, a week's detail with what changed in the routine that week, side-by-side and slider compare, and the photo settings.

## Scope

In: `npx expo install expo-image` (if not already). Files: `src/features/progress/screens/TimelineScreen.tsx`, `WeekDetailScreen.tsx`, `CompareScreen.tsx`, `src/features/settings/components/ProgressPrefs.tsx`.

### C3 Progress timeline (`/calendar/progress`, the Calendar tab's Progress segment)

- `ToggleGroup` Skin / Hair (Hair only when `settings.hairAlbumOn`).
- Top: "Take this week's photo" (when not taken) and "Compare".
- Grid (2 columns) of weekly `PhotoTile`s, newest first: front photo, "Week 41 · 6 Oct" (`weekLabel`, task 003), rating stars. Missing weeks are empty tiles "No photo"; skipped weeks "Skipped". Tiles reserve 3:4 before images decode (no reflow). Use a virtualised list (`FlashList` is not in the stack; use `FlatList` with `numColumns` and fixed item layout).
- Tap a tile: C6.
- **Empty:** "No photos yet" / "Take one a week in the same light to see your skin change." / Take first photo.

### C6 Week detail (`/calendar/week/[area]/[weekStart]`)

- All angles full width with horizontal paging and an angle label; rating, tags, note.
- **"What changed this week"** from `weekContext` (task 035): "Evening routine 5 of 7 days", products started ("Started Retinol 0.2% serum") and stopped ("Finished Vitamin C serum"), condition summary ("Mostly Calm, 2 days Breakout").
- Actions: Compare with… (opens C7 with this week on the right), Retake (camera for this week, replacing photos), Delete photo (current angle) / Delete week (AlertDialog: "Delete the photos from week 41? This can't be undone.").

### C7 Compare (`/progress/compare`, full screen, slide up 300 ms)

- Two modes (`ToggleGroup`): **Side by side** (two 3:4 columns with week labels on top) and **Slider** (one image, the newer revealed over the older by dragging a vertical handle; spoken "Comparison slider", adjustable with accessibility actions).
- Week pickers for left and right (sheet listing weeks with photos); quick chip "4 weeks ago vs now".
- Angle switcher (only angles both weeks have).
- **Pinch to zoom both in sync** (Gesture Handler pinch + pan on a shared transform, Reanimated); double-tap resets.

### S7 Preferences, progress photos (fill task 011's section)

- Tracked skin angles: chips Front (always on), Left side, Right side → `settings.skinAngles`.
- Hair album switch ("Photos of your hair, in their own album") → `settings.hairAlbumOn`; hair angles chips (Front, Back, Top) in a row whose space is **reserved** so switching the album doesn't jump the card.
- Last photo as a guide: switch and opacity (`Chip`s 20%, 30%, 40%, 50%) → `settings.photoGuideOn`, `photoGuideOpacity`.

### C2 photo line (fill task 028's slot)

"Week 41 photo, taken 6 Oct." with a thumbnail when a photo was taken that day (`photoForDay`), tapping to C6.

Out:

- Camera and review: 036. Zip backup: 040.

## Acceptance criteria

- [ ] Timeline shows weeks newest first with empty and skipped weeks; no reflow when images load.
- [ ] Week detail shows all angles and the "What changed" lines for a seeded week; Retake replaces, Delete removes rows and files.
- [ ] Compare: both modes, week pickers, "4 weeks ago vs now", angle switcher, synced pinch zoom.
- [ ] Photo preferences save and the hair album toggle shows the Hair segment without the card jumping.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
