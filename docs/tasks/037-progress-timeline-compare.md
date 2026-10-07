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

- **Packages:** `expo-image` was already installed; nothing was added. No schema change.
- **File names:** the routes already pointed at `screens/PhotoCompareScreen.tsx` (task 010 placeholder), so Compare keeps that name instead of `CompareScreen.tsx`. Other new files: `components/WeekTile.tsx` (C3 tile), `components/DayPhotoSection.tsx` (C2), `weekLines.ts` (C6 "What changed" text), `src/lib/progressCompare.ts` (pure Compare rules, tested) and `nextPhotoDay` in `src/lib/weeklyPhoto.ts`.
- **C3 tiles:** this week's empty tile is left out (the "Take this week's photo" button stands for it; the button shows until this week is taken, also after a skip). A skipped week and a week with nothing saved both show as the dashed "No photo" tile with "Skipped" under it; neither opens anything. The spoken label adds the dates ("No photo, skipped. 14 Sep to 20 Sep"); taken tiles are spoken "Skin photo, 29 Sep". The Compare header word shows once there is a photo; with one date C7 explains that it needs two. Tiles have a fixed width from the window and reserve 3:4, and a skeleton grid at the same size shows before the first read. The list is a `FlatList` with `numColumns={2}`; it has no `getItemLayout`, because the caption under each tile can grow with the phone's text size and a wrong row height would break virtualisation.
- **Album switch:** C3 takes `?area=hair`; Skin / Hair shows only while `hairAlbumOn`.
- **After saving the review** (036) the flow goes to `router.dismissTo('/calendar/progress?area=<album>')` instead of Today. **Retake** opens the camera with `?week=` (036) for that week; the review then starts from the week's saved rating, tags and note (unless the session already has a draft), and saving replaces the photos (`saveCheckIn` deletes the old files). A retake is dated the day it is taken (`takenAt` is the save time, 035).
- **C6:** pages are a horizontal paging `FlatList`, one full-width 3:4 photo per angle with "Front · 1 of 2" under it. The rating shows as the read-only star row ("Not rated" without one), tags as pills, the note as text. "What changed this week": one line per time of day ("Evening routine 5 of 7 days"; custom routines use their name), hair tasks for the hair album ("Wash 2 times"), "Started …" and "Finished …" per product, and the condition summary in one line: the most frequent tag reads "Mostly Calm" only when it was logged on more than half the logged days, the others "2 days Breakout" (up to three tags). "Nothing logged this week." when there is nothing. Compare with… and Retake are two secondary buttons; Delete photo (only with more than one photo; deletes the angle on screen) and Delete week are in the header's More actions menu, each behind an AlertDialog ("Delete the photos from 29 Sep?" / "Delete the Front photo from 29 Sep?", "This can't be undone."). Deleting the week (or its last photo) goes back.
- **C7:** opens with After = the newest week with photos and Before = the week closest to four weeks earlier (`?after=` from C6 and `?before=` are kept when they have photos). The pickers list every date with photos, newest first, with the cover photo as a thumbnail; picking the date the other side shows swaps the two. "4 weeks ago vs now" is a chip, shown selected while that pair is on screen. The angle switcher lists only the angles both dates have and hides with one; with none in common the screen says so. Side by side: two 3:4 columns sized to fit the space, dates on top. Slider: Before underneath, After on top, revealed from the handle to the right edge; the handle is clipped with transforms (no width animation), and its line and knob use the fixed camera colours so it reads on any photo in both themes. It is one accessible element, role adjustable, "Comparison slider", value "Shows 50% of 6 Oct", with increment / decrement moving 10%. Zoom: one Reanimated transform shared by both photos (pinch up to 4×, drag while zoomed, double tap resets; in slider mode one finger drags the handle and two fingers move the zoomed photos). The hint under the photos changes from "Pinch to zoom both photos." to "Double tap to see the whole photos again." while zoomed. A new pair, angle or mode starts unzoomed.
- **S7:** the progress photos card is `src/features/settings/components/ProgressPrefs.tsx`. Front is a chip shown chosen that cannot be turned off (spoken "Front, always on"); Left side and Right side save `skinAngles` as Front plus the sides in order. The hair angles row is always laid out and fades (200 ms) with the album switch; while off it is hidden from screen readers and takes no touches, so the card never changes height. At least one hair angle stays on. The guide switch and the 20–50% chips save `photoGuideOn` and `photoGuideOpacity`; the chips stay usable with the guide off. Strings for this card are under `progress.prefs.*`; the old `settings.progressSoon` string is no longer used (left in place).
- **Calendar row:** "Last photo 29 Sep · next one Sunday" from the skin timeline. The "next one" part shows only while Weekly photo is on; it is this week's photo day, "today" once that day has come and the photo is still due, and next week's once this week is taken or skipped (`nextPhotoDay`). Without photos: "No photos yet" (· next one …). The row's spoken name now includes this line, so three calendar and condition tests match `/^Progress photos/`.
- **C2:** "Weekly photo" card after product notes, one row per album photo taken that day: 48 × 64 thumbnail and "Skin photo, taken 29 Sep." linking to C6.

### Check on a real device

- C3 grid: no reflow while thumbnails decode; scrolling a year of weeks is smooth; tiles and captions at 360 pt and in Lithuanian (long "Fotografuoti šios savaitės nuotrauką" button wraps).
- Saving a review lands on Progress photos (from Today and from C3, and for the hair album with the Hair segment selected); `dismissTo` with the calendar route works from the full-screen `progress` modal.
- C6 paging snaps one angle per swipe; More actions, both delete dialogs; deleting removes the files (S8 size drops); Retake replaces the photos and keeps the rating, tags and note.
- C7: pinch zooms both photos together and drag moves both; double tap resets; the slider handle follows one finger without fighting the pinch; side by side and slider fit at 360 × 800 and on a tall iPhone; the handle reads on light and dark photos; VoiceOver / TalkBack adjust the slider with swipe up / down.
- S7: switching the hair album fades the hair angles without the card jumping, in both themes and in Lithuanian; the guide opacity chips change the camera guide (036).
- Calendar row line in Lithuanian ("kita: sekmadienis"), and the C2 thumbnail opens the week.
- Light and dark on every screen above.
