# 035 Progress photo data and storage

**Phase:** K. Progress photos · **Depends on:** 005 · **Spec:** Feature plan 10 (privacy), C3 (timeline), C4 (angles), C5 (review), C6 (week detail, "What changed this week"), C7 (compare), S7 (angles, hair album), Global UI rules (Privacy), sequence 8

## Goal

Private file storage for progress photos and the repository and hooks for weekly entries, so the camera, timeline, week detail and compare screens (tasks 036–037) only deal with UI.

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
| `listTimeline(db, area, fromWeek)` | One tile per week from the first entry to this week, newest first, including empty weeks ("No photo") and skipped weeks; front photo, rating |
| `lastPhoto(db, area, angle, beforeWeek)` | The guide photo for the camera (C4) |
| `deletePhoto(db, photoId)` / `deleteWeek(db, entryId)` | Rows and files |
| `weekContext(db, area, weekStart)` | C6 "What changed this week": routines done (count of evenings and mornings completed out of due, from `routine_log` and task 007), products started (`openedAt` in the week) and stopped (`archivedAt` in the week), condition log summary (most frequent skin tags that week). Return plain data; the screen formats it |
| `photoForDay(db, day)` | C2 "Week 41 photo, taken 6 Oct." |
| `thisWeekStatus(db, area, today)` | `taken`, `skipped` or `due` (for Today's Weekly photo card and the reminder) |

Tags use the skin tag set from the spec (Calm, Glow, Oily, Dry, Breakout, Redness, Itchy) as stable keys (`calm`, `glow`, …), translated at display.

### Query hooks

`useTimeline(area)`, `useWeekEntry(area, weekStart)`, `useLastPhoto(area, angle)`, `useWeekContext(area, weekStart)`, `useThisWeekStatus(area)`, mutations `useSaveCheckIn`, `useSkipWeek`, `useDeletePhoto`, `useDeleteWeek`. Invalidate `qk.progress.*`, `qk.today(day)` and the day detail key.

Out:

- Camera and screens: 036, 037. Weekly reminder: 036. Zip export: 040.

## Acceptance criteria

- [ ] Repository tests with a fake file system: saving a week twice replaces photos and deletes the old files; skipping a week shows as skipped in the timeline; the timeline fills empty weeks between entries; deleting a week removes its folder; `weekContext` counts completed routines and products started and stopped in that week.
- [ ] A manual check on a device that a saved photo doesn't appear in the phone's gallery (write what you checked under Decisions).
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
