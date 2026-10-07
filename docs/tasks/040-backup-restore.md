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
- A file from an older `schemaVersion` is migrated forward before insert (write the mapping hook even if version 1 needs none); a newer one is refused ("This backup is from a newer version of Jx Care. Update the app first.").
- Errors in the middle roll back the transaction and leave the current data untouched.

### S8 screen

- Last backup line ("Last backup 1 Sep" or "No backup yet"); when older than 30 days or never, an amber callout "Back up your Jx Care data. Your last backup is from 1 Sep." (callouts are only for warnings that need action).
- Export backup (primary), Import backup (secondary), storage used by photos.

### Reset app from Settings (S1 Data row)

- Asks the PIN first, then task 018's `ResetDialog` with `fromSettings`: the real counts text plus an "Export backup" button above "Reset app", then typing RESET, then `resetApp()`.

### Backup reminder (planner registered with task 020)

- When `lastBackupAt` is more than 30 days ago (or never and the person has at least one product), one notification "Back up your Jx Care data" at 10:00 on the next day it's due, then at most once a month; opens `/settings/backup`.

Out:

- Cloud sync of any kind (the app stays local only).

## Acceptance criteria

- [x] Round trip test: seed every table, export JSON, wipe, import, compare every table row for row (ids kept). Zip round trip restores photo files (fake file system).
- [x] Validation refuses a broken file and a newer format with clear messages; a failure mid-import leaves the old data intact (test with an injected error).
- [x] No secure data in the export (test the JSON has no PIN or recovery fields).
- [x] Reset from Settings asks for the PIN, offers Export backup, needs RESET and wipes everything.
- [x] Planner test for the backup reminder.
- [x] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

- **Packages:** `expo-file-system`, `expo-sharing`, `expo-document-picker` and `fflate` were already installed by the integrator; nothing was added here. `fflate` (pure-JS zip) is the one added library. Only its synchronous API is used (`Zip` + `ZipDeflate`, `unzipSync`); its async API needs Web Workers, which React Native doesn't have.
- **Files:** `format.ts` (envelope, zod validation, data-migration hook, photo paths, preview counts), `repo.ts` (`readAllData`, `replaceAllData`, `markBackedUp`), `zip.ts` (fflate helpers), `files.ts` (`BackupFiles` interface and the expo-file-system implementation), `fakeFiles.ts` (in-memory one for tests), `export.ts`, `import.ts`, `platform.ts` (share sheet, document picker), `api.ts` (hooks, `finishRestore`), `reminders.ts`, `size.ts`, `screens/BackupScreen.tsx`.
- **Format:** `{ app: 'jx-care', formatVersion: 1, schemaVersion, exportedAt, data }`. `schemaVersion` is the newest migration tag from `src/db/migrations/meta/_journal.json` (e.g. `0001_tired_echo`); its number prefix orders versions. `data` is keyed by SQL table name and rows use the Drizzle field names exactly as `select()` returns them (booleans as booleans, JSON columns as arrays). Every table in the schema is included automatically (the same `allTables` list Reset app uses) except `scheduled_notification`.
- **The file is itself the newest backup:** its settings row is written with `lastBackupAt = exportedAt`, and after the share sheet closes the phone's `settings.lastBackupAt` is set to the same moment. A restore therefore shows "Last backup <exported date>". `expo-sharing` can't tell whether the person actually saved the file or dismissed the sheet, so closing the sheet counts as a backup.
- **Validation:** checked in this order. Not an object with `app: 'jx-care'` gives "This file isn't a Jx Care backup". A `formatVersion` above 1 or a newer schema gives "This backup is from a newer version of Jx Care. Update the app first." A broken envelope or row gives "damaged". Row schemas are built from the Drizzle columns, so a new column is covered without extra code: integers, reals, text, booleans, JSON arrays, nullability, and primary keys required (ids are kept). Columns with defaults may be missing (an older backup) and get their defaults on insert. Unknown fields are dropped. There must be exactly one settings row. Every photo path must sit under `products/` or `progress/` with no `..` or empty segments; this also guards zip entry names against zip-slip. Enum values are not checked.
- **Migration hook:** `dataMigrations` in `format.ts` maps a schema number N to a function that turns data written at migration N into data for N + 1; `migrateForward` runs them in order. None are needed yet (added columns only need their defaults). The hook is tested with a fake migration.
- **Photo paths:** product `photoUri` and progress `fileUri` are absolute uris on the phone. On export they become paths under the documents folder (`products/x.jpg`, `progress/skin/<week>/<file>`). A uri from an older documents folder is cut at its `products/` or `progress/` segment. On import they become uris under this phone's documents folder.
- **Zip:** `backup.json` (deflated) plus every file under `products/` and `progress/`, stored as deflate level 0 because JPEGs don't compress. Stored-in-deflate works in every unzip tool, even with the streaming data descriptors fflate writes; checked with `unzip -t` and Python's `zipfile`. The zip is written straight to a cache file chunk by chunk, one photo at a time, with a yield to the UI between photos and a determinate progress bar ("Adding photos: 12 of 52"). The size shown first is the total of those files (`usePhotoStats`, product and progress photos). Older `jx-care-backup-*` files in the cache are removed at the start of each export. The new file stays in the cache for the share target to read, and the phone clears the cache by itself.
- **Import:** the picker accepts any file type (`*/*`), because cloud drives label JSON and zip files inconsistently; the file is recognised by its zip signature, otherwise parsed as JSON. Restore order: (1) a zip's photos are unpacked into `documents/restore-staging/`, so a broken zip stops before anything changes; (2) a zip's staged `products/` and `progress/` folders are swapped in by folder renames, the current folders moving into `documents/restore-previous/`; (3) one transaction deletes every row of every table (`scheduled_notification` too) and inserts the backup's rows with their ids, with `PRAGMA defer_foreign_keys`, so any error, including a key that points nowhere at commit, rolls back; (4) if a folder move or the transaction fails, the moves done so far are undone in reverse and the staging folder is removed, so the phone stays on its old rows and photos; on success the set-aside folders are deleted (a file error there is swallowed). Tests cover a duplicate id mid-insert (JSON and zip), a foreign key failing at commit, a zip that can't be read during unpacking and a failure at each folder move.
- **JSON import and photos:** a JSON backup has no photos. Product photos whose file isn't on this phone are set to null, so the product shows its placeholder. Progress photo rows whose file isn't on this phone (or in the zip) are left out, since `fileUri` is required; the week's entry keeps its rating, tags and note, and the week shows as a "No photo" tile (this week's photo counts as not taken). Photo files no restored row points at are deleted, so "Replace all data" also replaces the photos. Restoring a JSON backup on the same phone keeps every photo it still references.
- **After a restore** (`finishRestore` in `api.ts`): the language follows the restored settings at once (`setLanguage(..., { persist: false })`). The cache is reset with `queryClient.resetQueries()` rather than `clear()`: every query goes back to empty and the ones on screen fetch again, whereas `clear()` would leave mounted tabs (Settings) holding orphaned queries. Then `sync(Date.now(), { reconcile: true })` runs, the Settings stack is dismissed, Today opens and the toast "Backup restored" shows in the restored language. The PIN, the recovery question and the lockout counters on this phone are untouched; they are never in a backup.
- **S8 layout:** an amber callout only when the backup is due, then three cards. **Export:** "Last backup 1 Sep" / "No backup yet", a JSON / Zip radio list whose details read "All data. Photos are not included." and "All data and 52 photos, 14.2 MB", the filled "Export backup" and the progress row in a Collapsible. **Import:** one line of explanation, then the secondary "Import backup". After a file is picked it changes to the preview ("Backup from 1 Sep", "84 products, 6 routines, 52 photos", plus "Photos are not included in this file." for JSON) with a danger "Replace all data" and Cancel. A reserved helper line holds the error. **On this phone:** "Storage used by photos" and a danger "Reset app" row. The spec lists Reset app under S8 too. Its Export backup button just closes the dialog, because the export controls are on that screen. The counts in the preview are products (archived too), routines and progress photos, as in the reset dialog. "Due" means no backup, or the last one more than 30 days ago in app days.
- **Settings S1 Reset app:** replaces the placeholder dialog with `ResetDialog fromSettings`: PIN, then the real counts with "Export backup" above "Reset app", then typing RESET, then `resetApp()`. Export backup closes the dialog and opens `/settings/backup`. The old `settings.resetSoonTitle` and `settings.resetSoonBody` strings are now unused but left in place (keys are never removed).
- **Backup reminder** (`reminders.ts`, registered in `src/notifications/tasks.ts`): "Back up your Jx Care data" at 10:00, opening `/settings/backup`, on the `digest` channel (Android names it "Weekly digest and backup"), with no action buttons. The count starts from `lastBackupAt`, or with no backup from the first product's `createdAt`; no products means no reminder. Reminders fall on fixed days (anchor + 30, + 60, ...), and only the next one after now is planned, so planning again never adds a second one and it fires at most once a month. If the app wasn't opened when one was due, the next one comes on the following fixed day rather than the next morning. A backup moves the anchor, and the export calls `sync()`, which drops the old reminder.
- **Not merged:** import always replaces everything; there is no merge path.

### Check on a real device

- Export JSON and zip on iOS and Android. The share sheet opens and saving to Files, Drive and email works. The `.zip` opens in Files (iOS) and in a desktop unzip tool and holds `backup.json`, `products/` and `progress/`.
- A large zip (100+ progress photos): the progress bar moves, the screen stays responsive, and memory stays reasonable.
- The share sheet and the document picker don't lock the app on return (auto-lock is paused for those trips).
- Import a JSON and a zip picked from Files, Google Drive and Downloads. Check that the picker lets you choose both files (it filters nothing).
- Restore a zip on a second phone (or after Reset app): products show their photos, Progress photos show every week, Today opens with "Backup restored", the language follows the backup, and reminders are re-planned. Notifications scheduled before the restore are gone.
- Restore a JSON on a phone without the photos: products show their placeholder and progress weeks show as "No photo" tiles.
- Restore a zip over a phone that has photos: the folder swap (renames of `products/` and `progress/` into and out of `restore-previous/` and `restore-staging/`) works on iOS and Android, and nothing is left in those two folders afterwards.
- With the last backup more than 30 days ago (change `lastBackupAt` or the phone date): the S8 callout shows and the 10:00 reminder arrives and opens Backup and restore behind the lock.
- Reset app from Settings: the PIN is asked, Export backup opens Backup and restore, typing RESET wipes everything (photos too) and opens Welcome.
- Light and dark mode on S8, including the callout, the preview and the progress row, in LT (longer text wraps).
