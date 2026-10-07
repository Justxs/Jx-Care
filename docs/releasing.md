# Releasing and safe updates

The promise: once Jx Care is on someone's phone, every later version installs over it and keeps all their data (products, routines, history, streaks, photos, settings and the PIN). This page is what keeps that promise. Read it before a release and before any change to the database.

## What protects an update

| Risk | What stops it |
| --- | --- |
| A schema change loses rows or values | `src/db/__tests__/upgrade.test.ts` in `pnpm check`: realistic data frozen at every past schema version (`src/db/upgrade-fixtures/`) is upgraded to the newest and compared value by value, straight there and one version at a time |
| A shipped migration is edited (phones never re-run it, so they drift from new installs) | `src/db/migrations.lock.json` records each migration's hash; the test fails if one changes or disappears |
| `schema.ts` changes without a migration (crash on update: "no such column") | The test diffs `schema.ts` against the newest migration snapshot with drizzle-kit |
| A migration dated earlier than the one before it (Drizzle would skip it on phones) | `checkJournal` in `src/db/migrate.ts`, at test time and at every launch |
| A table rebuild cascade-deletes child rows (Drizzle's own migrator runs `DROP TABLE` with foreign keys on, which wipes e.g. a product's ingredients and notes) | `runMigrations` turns foreign keys off around the migration, runs `PRAGMA foreign_key_check` before committing, and rolls back if anything points nowhere |
| A migration fails halfway | All pending migrations run in one transaction; a failure leaves the data as it was and shows "Jx Care couldn't open its data" with Try again |
| A migration succeeds but turns out wrong | Before migrating an existing install the app copies the database to `documents/db-backups/jx-care-<previous migration>.db` (newest two kept; Reset app deletes them). A later release can ship code to restore it |
| An older app opens data from a newer one (a downgrade, or a restore) | `DatabaseNewerError`: the app shows "Update Jx Care to open your data" and changes nothing |
| iOS moves the app's folder on update, so saved photo paths break | `rebasePhotoUris` at every launch points saved photo uris at the current documents folder (`src/features/backup/repo.ts`) |
| A backup made by an older version doesn't restore | Backups carry their schema version; `dataMigrations` in `src/features/backup/format.ts` moves old backups forward, newer ones are refused |

## Versions

- **App version** (`1.2.0`): `expo.version` in `app.json`, the one place it is set. `package.json` carries the same number (a test checks). Change both with `pnpm version:bump patch|minor|major` or `pnpm version:bump 1.4.0`.
  - patch: fixes only; minor: new features or a database change; major: a big redesign.
- **Build number** (iOS `buildNumber`, Android `versionCode`): EAS keeps it (`"appVersionSource": "remote"` in `eas.json`) and adds one on every `preview` and `production` build (`autoIncrement`). Never set one by hand in `app.json`. Android refuses to install a lower `versionCode` over a higher one; if a build was ever made outside EAS, set the counter above it with `pnpm dlx eas-cli build:version:set`.
- Settings → About → Version shows both: `1.2.0 (14)`.
- Tag each release on main: `git tag v1.2.0 && git push origin v1.2.0`.

## Never change these

An update only installs over the old app when the phone sees the same app. Changing any of these makes it a different app (a second icon, or an install that fails), and the person's data stays behind in the old one:

- Bundle ID and package `eu.jxcare.app`, Expo slug `jx-care`, scheme `jxcare`.
- **The Android signing key.** EAS creates and stores it on the first build. Download a copy right after that build (`pnpm dlx eas-cli credentials -p android` → Keystore → Download) and keep it in a password manager. Without it no Android update can install over an existing install. With Google Play App Signing, Google holds the app key and a lost upload key can be reset through Play support.
- **The iOS bundle ID and Apple team.** Certificates and profiles can be renewed any time; installs keep updating.
- **Where people got the app.** A sideloaded APK (`preview` profile, signed by the EAS key) and the Play Store version (signed by Google's key once Play App Signing is on) have different signatures, so one can't update the other. Pick the channel for real users from the first release. If people must move channels, they export a backup (Settings → Backup), install the new one and import it.
- Names the data is stored under: the database `jx-care.db`, the photo folders `products/` and `progress/` under documents, and the secure-store keys of the PIN and recovery answer (`src/features/security/`). Renaming any of them loses that data or the PIN.

## Changing the database

1. Change `src/db/schema.ts`.
2. `pnpm db:generate`. It runs drizzle-kit, locks the new migration (`scripts/db-lock.mjs`) and writes its frozen data snapshot (`pnpm db:fixture`).
3. If the migration changes existing data on purpose (a rename, a split, a rewritten value), describe it in `expectedChanges` in `src/db/__tests__/upgrade.test.ts`, and add the same step to `dataMigrations` in `src/features/backup/format.ts` so old backups still restore. Adding tables, nullable columns, columns with a default and indexes needs neither.
4. `pnpm check`, then commit the `.sql`, `meta/`, `migrations.js`, `migrations.lock.json` and the snapshot together.

Rules:

- **Never edit, rename, reorder or delete a migration once it is on main.** Fix a mistake with a new migration. The only exception is a migration you haven't committed yet: delete its `.sql`, its snapshot and journal entry in `meta/`, its line in `migrations.js`, its entry in `migrations.lock.json` and its file in `src/db/upgrade-fixtures/`, then generate again.
- **Never edit a file in `src/db/upgrade-fixtures/`.** Each one is the data a phone had at that version.
- A new `NOT NULL` column needs a default, or existing rows can't be migrated.
- Never drop a column or table someone's data lives in without moving that data first (the upgrade test fails on a drop unless `expectedChanges` says where the data went).
- Changing a column's type or constraint makes drizzle-kit rebuild the table (`__new_x`, copy, drop, rename). That is safe with `runMigrations`; the upgrade test proves the copy kept every value.
- Two threads adding migrations at once: pull main before `pnpm db:generate`; if both land, the second regenerates on top of the first so the numbers and dates stay in order.

## Before every release

1. `pnpm check` is green on main.
2. `pnpm version:bump …`, commit `Release x.y.z`.
3. **Update test on a phone.** Install the previous release (keep every release's APK; on iOS use the App Store or TestFlight version), use it or restore a realistic backup into it, take a product photo and a progress photo. Then install the new build over it without uninstalling (Android: `adb install -r new.apk`; iOS: update through TestFlight) and check:
   - every product, routine, hair task, calendar day, streak and condition log is there;
   - product and progress photos show (on iOS this checks the folder move);
   - the PIN unlocks, the recovery question is the same, biometrics still work;
   - reminders still fire, Settings shows the new version and build;
   - Settings → Backup exports, and a backup from the old version imports.
4. A fresh install still works: onboarding, then the same quick walk.
5. `pnpm dlx eas-cli build --profile production --platform all`, then submit (`eas submit`).
6. Tag the release (`git tag vX.Y.Z`) and push the tag.

## Over-the-air updates (not used)

Jx Care ships every change as a store build. `expo-updates` (EAS Update) could later push JavaScript-only fixes without a store review. It isn't needed for safe updates and isn't installed. If it is added: set `runtimeVersion` to the `appVersion` policy so an update only reaches builds with matching native code; database migrations ship inside the JavaScript bundle, so every rule above applies the same; and a native change (a new Expo module, a permission, an icon) still needs a store build.
