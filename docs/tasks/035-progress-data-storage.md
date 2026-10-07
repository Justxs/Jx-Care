# 035 Progress photo data and storage

**Phase:** K. Progress photos · **Depends on:** 005 · **Spec:** Feature plan 10 (privacy), Words and copy (a progress photo is its date), C3 (Progress photos), C4 (angles), C5 (review), C6 (week detail, "What changed this week"), C7 (compare), S7 (angles, hair album), Global UI rules (Privacy), sequence 8

## Goal

Private file storage for progress photos and the repository and hooks for weekly entries, so the camera, Progress photos, week detail and compare screens (tasks 036–037) only deal with UI.

## Scope

In: `npx expo install expo-file-system expo-image-manipulator`. Files: `src/features/progress/files.ts`, `repo.ts`, `repo.test.ts`, `api.ts`.

### Files (`files.ts`)

- Photos live under `Paths.document/progress/<area>/<weekStart>/<angle>-<takenAt>.jpg` (expo-file-system's new `File`/`Directory` API). That folder is app-private and excluded from the gallery; never call `MediaLibrary`.
- `savePhoto(tempUri, { area, weekStart, angle })`: resizes to a max of 1600 px on the long side, JPEG quality 0.85 (`expo-image-manipulator`), crops to **3:4** portrait if needed, moves it into place, returns the `fileUri`.
- `deletePhotoFile(uri)`, `deleteWeekFolder(area, weekStart)`, `listAllPhotoFiles()` (for backup, task 040), `totalPhotoBytes()` (shown in S8).
- On iOS, mark the `progress` folder as excluded from iCloud backup (`isExcludedFromBackup` if available in the SDK; otherwise note it under Decisions).
- Wrap the file system behind a small interface so repository tests run without native code.

### Repository functions (`repo.ts`)

| Function | Does |
| --- | --- |
| `getWeekEntry(db, area, weekStart)` | Entry + photos by angle, or null |
| `saveCheckIn(db, { area, weekStart, photos: { angle, fileUri }[], rating, tags, note })` | Inserts or replaces the week's entry and photo rows in one transaction; replaced photo files are deleted after commit (retake, C6) |
| `skipWeek(db, area, weekStart)` | Entry with `skipped: true` and no photos ("Skip this week" on Today and the notification) |
| `listTimeline(db, area, fromWeek)` | One tile per week from the first entry to this week, newest first, including empty weeks ("No photo") and skipped weeks; front photo and the date it was taken (tiles show no rating) |
| `lastPhoto(db, area, angle, beforeWeek)` | The guide photo for the camera (C4) |
| `deletePhoto(db, photoId)` / `deleteWeek(db, entryId)` | Rows and files |
| `weekContext(db, area, weekStart)` | C6 "What changed this week": routines done (count of evenings and mornings completed out of due, from `routine_log` and task 007), products started (`openedAt` in the week) and stopped (`archivedAt` in the week), condition log summary (most frequent skin tags that week). Return plain data; the screen formats it |
| `photoForDay(db, day)` | C2 "Skin photo, taken 6 Oct." (named by its date, never a week number) |
| `thisWeekStatus(db, area, today)` | `taken`, `skipped` or `due` (for the photo row in Today's Check-in card and the reminder) |

Tags use the skin tag set from the spec (Calm, Glow, Oily, Dry, Breakout, Redness, Itchy) as stable keys (`calm`, `glow`, …), translated at display.

### Query hooks

`useTimeline(area)`, `useWeekEntry(area, weekStart)`, `useLastPhoto(area, angle)`, `useWeekContext(area, weekStart)`, `useThisWeekStatus(area)`, mutations `useSaveCheckIn`, `useSkipWeek`, `useDeletePhoto`, `useDeleteWeek`. Invalidate `qk.progress.*`, `qk.today(day)` and the day detail key.

Out:

- Camera and screens: 036, 037. Weekly reminder: 036. Zip export: 040.

## Acceptance criteria

- [x] Repository tests with a fake file system: saving a week twice replaces photos and deletes the old files; skipping a week shows as skipped in the timeline; the timeline fills empty weeks between entries; deleting a week removes its folder; `weekContext` counts completed routines and products started and stopped in that week.
- [ ] A manual check on a device that a saved photo doesn't appear in the phone's gallery (write what you checked under Decisions).
- [x] `npm run check` passes.

## Decisions

- **Packages:** `expo-file-system` and `expo-image-manipulator` were already installed; nothing was added.
- **File interface:** `types.ts` defines `ProgressFileStore` (delete a file, delete a week folder), which the repository takes as an argument, and `ProgressFiles` (adds `savePhoto`, `isProgressFile`, `listAllPhotoFiles`, `totalPhotoBytes`). `files.ts` is the expo-file-system implementation (`progressFiles`); `fakeFiles.ts` (`createFakeFiles()`) is an in-memory one for repository tests and for the screen tests of 036–037. `repo.ts` never imports native code.
- **Crop and size** are pure (`src/lib/photoCrop.ts`, tested): centre crop to 3:4 portrait when the photo is off by more than 1 px, then scale to 1200 × 1600 if taller than 1600; never scale up. JPEG quality 0.85. The camera's temporary file is deleted after the copy, but only when it sits in the cache folder.
- **iCloud backup:** expo-file-system 57 has no `isExcludedFromBackup` (or any way to set `NSURLIsExcludedFromBackupKey`), so the `progress` folder is not marked. Photos are private to the app either way (not in the gallery); an iOS device backup does include the documents folder. Android Auto Backup also includes documents unless `android.allowBackup` is off; 041 (or Justas) should decide on that in app.json.
- **Saving the review:** `saveCheckInWithFiles(db, input, files)` (in `repo.ts`, used by `useSaveCheckIn`) copies camera photos into storage, keeps photos that already live in the progress folder, then calls `saveCheckIn`. If a photo or the database write fails, the files it just saved are removed. All photos of one check-in share one `takenAt`, so file names are `<angle>-<takenAt>.jpg`; a retake gets new names, and `saveCheckIn` deletes the old files after the commit.
- **saveCheckIn** replaces every photo row of the week (a retake re-shoots all tracked angles), clears `skipped`, trims the note (empty is null), removes duplicate tags and clamps the rating to 1–5.
- **skipWeek** on a week that already has photos leaves it unchanged (returns its id).
- **deletePhoto** removing the week's last photo deletes the whole week (entry and folder), so no empty entry is left that would show as "No photo" with a rating.
- **File errors** after a commit are swallowed (an orphaned file at worst), as products do.
- **listTimeline(db, area, thisWeek):** the third argument is the Monday of the week that holds today (the newest tile). Tiles run from the first entry's week to this week (or a later entry's week, if the clock went back). `status` is `taken` (has photos), `skipped` or `empty`; `current` marks this week. The cover photo is front, or the first angle in the standard order when front is missing. `takenDay` is the app day of `takenAt` (04:00 rule), for the "6 Oct" label.
- **weekContext(db, area, weekStart, today)** takes `today` so a running week counts only the days so far (`days`). Skin: one row per time of day with days complete (any A/B routine complete, same rule as the calendar) out of days due, using `createSkinIndex` from `src/lib/streak.ts`. Hair album: hair task logs per task that week instead of routines. Products started (`openedAt`) and stopped (`archivedAt`) count over the whole week, for the album's area plus `both`. Condition: days with at least one tag, and every tag with its count, most frequent first, ties in the standard tag order.
- **photoForDay(db, day)** returns a list (skin first, then hair) of weeks whose `takenAt` falls on that app day, each with its cover photo.
- **Tags:** stored as stable keys. Skin uses the seven skin tags; the hair album uses the hair tags (`progressTags(area)`), since the spec only names the skin set for C5.
- **Query keys** are built under `qk.progress.all` inside `api.ts` (`week`, `last`, `context`, `status`, `day`, `bytes`); the timeline uses `qk.progress.list(area)`. `src/db/queryKeys.ts` is unchanged. Mutations invalidate `qk.progress.all`, `['today']` (every `qk.today(day)`) and `['calendar', 'day']` (every `qk.calendar.day(day)`).
- **Extra hooks** for later tasks: `usePhotosForDay(day)` (C2) and `usePhotoStorageBytes()` (S8). `onWeeklyPhotoChanged(area)` in `api.ts` is an empty hook for the weekly reminder (036), called after every save, skip and delete.
- **No strings** were needed; tasks 036–037 add `progress.*` copy.

### Check on a real device

- Take a progress photo (once 036 has the camera, or by calling `progressFiles.savePhoto` from a dev screen) and confirm it does not appear in Photos (iOS) or Google Photos / Gallery (Android), and that no "Jx-Care" album is created.
- The saved file is 1200 × 1600 and upright for front-camera and back-camera photos (EXIF rotation is applied by expo-image-manipulator) and for a landscape shot (centre-cropped).
- Delete a week and confirm `progress/skin/<week>/` is gone (S8 storage size drops).
- `listAllPhotoFiles()` and `totalPhotoBytes()` match what is on disk.
