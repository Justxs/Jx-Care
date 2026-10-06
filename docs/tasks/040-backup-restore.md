# 040 Backup and restore

**Phase:** M. Finish · **Depends on:** 021, 030, 033, 037, 038, 039 · **Spec:** S8, S1 (Data group, Reset app), L2 reset copy, Notifications (Backup reminder), sequence 9 · **Design:** [screens.md](../design/screens.md) BackupScreen; [components.md](../design/components.md) AlertDialog

## Goal

Everything the person has can leave the phone as one file they control, come back on a new phone, and be wiped on purpose.

## Scope

In: `npx expo install expo-file-system expo-sharing expo-document-picker`, `npm install fflate@latest` (zip in pure JS; note it under Decisions as the one added library). Files: `src/features/backup/format.ts`, `export.ts`, `import.ts`, tests, `screens/BackupScreen.tsx`, `reminders.ts`.

### Format (`format.ts`)

- JSON: `{ app: 'jx-care', formatVersion: 1, schemaVersion: <latest migration tag>, exportedAt, data: { <table>: rows[] } }` with every table from task 004 **except** `scheduled_notification`. PIN, recovery question and answer are never included (they live in secure storage).
- Product photos and progress photos are referenced by relative path (`products/<file>`, `progress/<area>/<week>/<file>`).
- A zod schema validates a file before import; unknown future `formatVersion` is refused with a clear message.

### Export

- "Export backup" → choose **JSON** (all data, no photos: "Photos are not included") or **Zip with photos** (JSON + `products/` + `progress/` files; shows the size first, from `totalPhotoBytes`). Written to the cache folder, then the share sheet (`expo-sharing`) to save to Files, Drive or email. On success, `settings.lastBackupAt = now`.
- Large zips: build in chunks so the UI stays responsive; show a determinate progress row (scaleX bar), not a spinner.

### Import (sequence 9)

- "Import backup" → document picker (JSON or zip) → validate → **preview counts** ("84 products, 6 routines, 52 photos", exported date) → "Replace all data" (danger) → AlertDialog "This replaces everything on this phone with the backup from 1 Sep. This can't be undone." → in **one transaction**: delete all rows, insert all rows (keeping ids); then restore photo files (replace the folders), clear the query cache, `sync()` notifications (task 020), and go to Today with the toast "Backup restored". Import never merges.
- A file from an older `schemaVersion` is migrated forward before insert (write the mapping hook even if version 1 needs none); a newer one is refused ("This backup is from a newer version of Jx-Care. Update the app first.").
- Errors in the middle roll back the transaction and leave the current data untouched.

### S8 screen

- Last backup line ("Last backup 1 Sep" or "No backup yet"); when older than 30 days or never, an amber callout "Back up your Jx-Care data. Your last backup is from 1 Sep." (callouts are only for warnings that need action).
- Export backup (primary), Import backup (secondary), storage used by photos.

### Reset app from Settings (S1 Data row)

- Asks the PIN first, then task 018's `ResetDialog` with `fromSettings`: the real counts text plus an "Export backup" button above "Reset app", then typing RESET, then `resetApp()`.

### Backup reminder (planner registered with task 020)

- When `lastBackupAt` is more than 30 days ago (or never and the person has at least one product), one notification "Back up your Jx-Care data" at 10:00 on the next day it's due, then at most once a month; opens `/settings/backup`.

Out:

- Cloud sync of any kind (the app stays local only).

## Acceptance criteria

- [ ] Round trip test: seed every table, export JSON, wipe, import, compare every table row for row (ids kept). Zip round trip restores photo files (fake file system).
- [ ] Validation refuses a broken file and a newer format with clear messages; a failure mid-import leaves the old data intact (test with an injected error).
- [ ] No secure data in the export (test the JSON has no PIN or recovery fields).
- [ ] Reset from Settings asks for the PIN, offers Export backup, needs RESET and wipes everything.
- [ ] Planner test for the backup reminder.
- [ ] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

(Write any choices you make here.)
