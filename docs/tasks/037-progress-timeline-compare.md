# 037 Progress photos, week detail and compare

**Phase:** K. Progress photos · **Depends on:** 036 · **Spec:** C3, C6, C7, S7 (progress photo options), C1 (Progress photos row), C2 (photo line), Words and copy (a progress photo is its date), Empty states (Progress) · **Design:** [screens.md](../design/screens.md) ProgressPhotosScreen, CalendarScreen, WeekDetailScreen, PhotoCompareScreen, PreferencesScreen

## Goal

Looking back at progress: a weekly grid of photos labelled by date, a week's detail with what changed in the routine that week, side-by-side and slider compare, and the photo settings.

## Scope

In: `npx expo install expo-image` (if not already). Files: `src/features/progress/screens/ProgressPhotosScreen.tsx`, `WeekDetailScreen.tsx`, `CompareScreen.tsx`, `src/features/settings/components/ProgressPrefs.tsx`.

### C3 Progress photos (`/calendar/progress`, a pushed screen)

- A pushed screen in the Calendar stack, not a Calendar segment. Reached from the Progress photos row on Calendar, Today's Check-in card and the weekly photo reminder.
- `ScreenHeader` titled "Progress photos" with the header word Compare (opens C7).
- `ToggleGroup` Skin / Hair (Hair only when `settings.hairAlbumOn`).
- Top: "Take this week's photo" (when not taken).
- Grid (2 columns) of weekly `PhotoTile`s, newest first: front photo labelled with the date it was taken ("6 Oct", `formatDate`, task 003), never a week number. No stars on the tiles; the rating shows on C6. Missing weeks are dashed tiles "No photo" with "Skipped". Tiles reserve 3:4 before images decode (no reflow). Use a virtualised list (`FlashList` is not in the stack; use `FlatList` with `numColumns` and fixed item layout).
- Tap a tile: C6.
- **Empty:** "No photos yet" / "Take one a week in the same light to see your skin change." / Take first photo.

### C6 Week detail (`/calendar/week/[area]/[weekStart]`)

- Titled by the date taken ("Skin photo, 6 Oct"), never a week number.
- All angles full width with horizontal paging and an angle label; rating, tags, note.
- **"What changed this week"** from `weekContext` (task 035): "Evening routine 5 of 7 days", products started ("Started Retinol 0.2% serum") and stopped ("Finished Vitamin C serum"), condition summary ("Mostly Calm, 2 days Breakout").
- Actions: Compare with… (opens C7 with this week as After), Retake (camera for this week, replacing photos), Delete photo (current angle) / Delete week (AlertDialog: "Delete the photos from 6 Oct? This can't be undone.").

### C7 Compare (`/progress/compare`, full screen, slide up 300 ms)

- Two modes (`ToggleGroup`): **Side by side** (two 3:4 columns with date labels on top) and **Slider** (one image, the newer revealed over the older by dragging a vertical handle; spoken "Comparison slider", adjustable with accessibility actions).
- Before and After pickers showing dates ("8 Sep", "6 Oct"), each opening a sheet that lists the weeks with photos by date with the photo as a thumbnail; quick chip "4 weeks ago vs now".
- Angle switcher (only angles both weeks have).
- **Pinch to zoom both in sync** (Gesture Handler pinch + pan on a shared transform, Reanimated); double-tap resets.

### S7 Preferences, progress photos (fill task 011's section)

- Tracked skin angles: chips Front (always on), Left side, Right side → `settings.skinAngles`.
- Hair album switch ("Photos of your hair, in their own album") → `settings.hairAlbumOn`; hair angles chips (Front, Back, Top) in a row whose space is **reserved** so switching the album doesn't jump the card.
- Last photo as a guide: switch and opacity (`Chip`s 20%, 30%, 40%, 50%) → `settings.photoGuideOn`, `photoGuideOpacity`.

### Calendar Progress photos row (fill task 028's row)

Under the month grid: "Progress photos" with "Last photo 29 Sep · next one Sunday" (from `useTimeline` and `settings.weeklyPhotoWeekday`), opening C3.

### C2 photo line (fill task 028's slot)

"Skin photo, taken 6 Oct." with a thumbnail when a photo was taken that day (`photoForDay`), tapping to C6.

Out:

- Camera and review: 036. Zip backup: 040.

## Acceptance criteria

- [ ] Progress photos opens as a pushed screen from the Calendar row; it shows weeks newest first, each tile labelled by date with no stars, and dashed tiles for missing weeks; no reflow when images load.
- [ ] No week number appears anywhere: tiles, C6 title, Delete week dialog, Compare labels and pickers, and the C2 line all use dates.
- [ ] Week detail shows all angles and the "What changed" lines for a seeded week; Retake replaces, Delete removes rows and files.
- [ ] Compare (from the header word): both modes, Before and After date pickers, "4 weeks ago vs now", angle switcher, synced pinch zoom.
- [ ] Photo preferences save and the hair album toggle shows the Hair segment without the card jumping.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
