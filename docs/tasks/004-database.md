# 004 Database schema and migrations

**Phase:** A. Foundation · **Depends on:** 001 · **Spec:** every screen's fields; [feature plan data model](../feature-plan.md#data-model) (this task supersedes it where they differ)

## Goal

The whole local database defined once with Drizzle, migrated on app start before the splash hides, and usable from Jest on better-sqlite3 with the same schema and migrations.

## Scope

In:

1. **Packages:** `npx expo install expo-sqlite`, `npm install drizzle-orm@latest`, `npm install -D drizzle-kit@latest better-sqlite3 @types/better-sqlite3 babel-plugin-inline-import`.
2. **`drizzle.config.ts`:** `dialect: 'sqlite'`, `driver: 'expo'`, `schema: './src/db/schema.ts'`, `out: './src/db/migrations'`. Script `db:generate` = `drizzle-kit generate`.
3. **Metro and Babel for SQL migrations** (Drizzle's Expo guide): add `'sql'` to `resolver.sourceExts` in `metro.config.js` (keep the NativeWind wrapper from 002) and `['inline-import', { extensions: ['.sql'] }]` to `babel.config.js`.
4. **`src/db/client.ts`:** opens `jx-care.db` with `openDatabaseSync`, runs `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL`, exports `db = drizzle(expoDb, { schema })` and the type `Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>`. Both the expo-sqlite and the better-sqlite3 Drizzle drivers are synchronous, so both satisfy it; repositories take `Db`.
5. **Migrations on start:** in `app/_layout.tsx`, `useMigrations(db, migrations)`; keep the splash screen up until both fonts (002) and migrations are done. If a migration fails, show a plain full-screen error with the message and a "Try again" button (no crash loop).
6. **`src/db/test-db.ts`:** `createTestDb()` returns a fresh in-memory better-sqlite3 database with Drizzle and all migrations applied (`migrate()` from `drizzle-orm/better-sqlite3/migrator`, same `src/db/migrations` folder). Every repository test uses it.
7. **Schema** in `src/db/schema.ts`, exactly these tables (types: `text` for enums and `'YYYY-MM-DD'` days, `integer` for ms timestamps, booleans with `{ mode: 'boolean' }`, JSON arrays as `text({ mode: 'json' }).$type<…>()`). Every table except `settings` has `id integer primary key autoincrement`. Add `createdAt` (ms, default now) to every table and `updatedAt` where rows are edited.

| Table | Columns | Notes |
| --- | --- | --- |
| `settings` | `id` (always 1), `language` ('lt' \| 'en'), `currency` (default 'EUR'), `expiryWarnDays` (30), `expiryReminderTime` ('09:00'), `expiryRemindersOn` (false until allowed), `expiryDayReminderOn` (true), `routineRemindersOn` (true, master switch), `hairRemindersOn` (true, master switch), `weeklyPhotoOn` (false), `weeklyPhotoWeekday` (7 = Sunday), `weeklyPhotoTime` ('10:00'), `weeklyDigestOn` (true), `snoozeMinutes` (15), `autoLockSeconds` (60; 0, 60 or 300), `biometricsOn` (false), `skinAngles` (json, `['front']`), `hairAlbumOn` (false), `hairAngles` (json, `['front','back','top']`), `photoGuideOn` (true), `photoGuideOpacity` (0.3), `reminderAskDone` (false), `setupDoneAt` (day, null), `setupHiddenAt` (day, null), `lastBackupAt` (ms, null) | One row, created by onboarding (task 017). PIN data is **not** here; it lives in secure storage (task 016) |
| `product` | `name`, `brand`, `area` ('skin' \| 'hair' \| 'both'), `category` (see below), `photoUri`, `size` (real), `unit` ('ml' \| 'g' \| 'pcs'), `priceCents`, `purchasedAt` (day), `expiresAt` (day, printed), `openedAt` (day), `paoMonths`, `notes`, `rating` (1–5), `wouldRebuy` (boolean, null = not set), `archivedAt` (day, null = active) | Effective expiry and status are computed (task 006), never stored |
| `ingredient` | `name`, `normalizedName` (unique), `groupId` → ingredient_group, null | `normalizedName` from task 006 `normalizeName()` |
| `ingredient_group` | `name` | "Acids", "Retinoids" |
| `product_ingredient` | `productId` → product (cascade), `ingredientId` → ingredient (cascade), `position` | Primary key (productId, ingredientId) |
| `conflict` | `leftKind` ('ingredient' \| 'group'), `leftId`, `rightKind`, `rightId`, `note` | Either side can be an ingredient or a group |
| `avoid_item` | `kind` ('ingredient' \| 'group'), `refId`, `note` | Personal avoid list |
| `routine` | `name`, `timeOfDay` ('morning' \| 'evening' \| 'custom'), `customName`, `sortTime` ('HH:mm', orders cards; morning 07:00, evening 21:00 by default), `daysOfWeek` (json number[], ISO 1–7), `reminderTime` ('HH:mm', null = no reminder), `active` (true) | Several per time of day allowed |
| `routine_step` | `routineId` → routine (cascade), `productId` → product (set null), `position`, `note`, `scheduleKind` ('always' \| 'days' \| 'interval'), `daysOfWeek` (json, for 'days'), `everyNDays` (for 'interval'), `startDate` (day, for 'interval'), `waitSeconds` (0 = none) | `productId` null = "Pick a product later" |
| `routine_log` | `routineId` → routine (cascade), `day`, `dueStepIds` (json, snapshot when first ticked), `doneStepIds` (json), `completedAt` (ms, null) | Unique (routineId, day) |
| `routine_choice` | `timeOfDayKey` ('morning', 'evening' or 'custom:<name>'), `weekday`, `routineId` → routine (cascade) | Remembers the A/B pick per weekday (spec T1). Unique (timeOfDayKey, weekday) |
| `hair_task` | `name`, `kind` ('wash' \| 'other'), `otherKind` ('trim' \| 'colour' \| 'mask' \| 'other', null for washes; picks the calendar icon), `productIds` (json number[]), `scheduleKind` ('interval' \| 'days'), `everyNDays`, `intervalUnit` ('days' \| 'weeks', display only), `daysOfWeek` (json), `lastDoneAt` (day), `reminderTime` ('HH:mm', null), `active` (true) | Next due is computed (task 007) |
| `hair_log` | `hairTaskId` → hair_task (cascade), `day`, `dueDay` (the due day this fulfilled), `productIds` (json), `note` | Feeds the hair streak and calendar |
| `shopping_item` | `productId` → product (set null; null = new item), `name`, `brand`, `area`, `note`, `list` ('to_buy' \| 'want_to_try'), `boughtAt` (ms, null) | Bought rows older than 30 days are cleared on app open |
| `shopping_dismissal` | `productId` → product (cascade), `dismissedAt` (ms) | A dismissed suggestion; unique productId |
| `progress_entry` | `area` ('skin' \| 'hair'), `weekStart` (day, Monday), `takenAt` (ms), `skipped` (boolean), `rating` (1–5), `tags` (json string[]), `note` | Unique (area, weekStart) |
| `progress_photo` | `entryId` → progress_entry (cascade), `angle` ('front' \| 'left' \| 'right' \| 'back' \| 'top'), `fileUri` | Files in app-private storage (task 035) |
| `condition_log` | `day`, `area` ('skin' \| 'hair'), `states` (json string[]), `note` | Unique (day, area) |
| `product_note` | `productId` → product (cascade), `day`, `text`, `tags` (json string[]) | Dated reaction notes |
| `scheduled_notification` | `entityType` ('product' \| 'routine' \| 'hair_task' \| 'weekly_photo' \| 'digest' \| 'backup'), `entityId` (null for global), `kind` (e.g. 'expiry_warning', 'expiry_day', 'routine', 'hair', 'weekly_photo'), `notificationId` (text), `fireAt` (ms) | Lets edits cancel and reschedule (task 020) |

   Product `category` values: `cleanser`, `toner`, `serum`, `moisturiser`, `spf`, `mask`, `exfoliant`, `eye_care`, `shampoo`, `conditioner`, `hair_mask`, `hair_oil`, `styling`, `other` (default `other`). Export every enum as a TypeScript union and a constant array from `src/db/enums.ts` so forms and filters reuse them.

8. **Indexes:** `product(archivedAt)`, `product_ingredient(ingredientId)`, `routine_log(day)`, `hair_log(hairTaskId, day)`, `condition_log(day)`, `product_note(productId)`, `shopping_item(boughtAt)`.
9. **Types:** export `Product`, `NewProduct`, etc. with `typeof product.$inferSelect` / `$inferInsert`.
10. **Generate the first migration** with `npm run db:generate` and commit `src/db/migrations/` (SQL files, `meta/`, and the `migrations.js` bundle Drizzle makes for Expo).

Out:

- Repositories and query hooks: task 005 sets the pattern, feature tasks write their own `repo.ts`.
- Seeding the settings row: onboarding (task 017). Until then, task 005's `getSettings()` returns defaults when the row is missing.

## Acceptance criteria

- [ ] The app starts, runs the migration on a fresh install and keeps the splash up until it finishes.
- [ ] `createTestDb()` works in Jest; a test inserts a product with two ingredients and reads it back with its ingredients; deleting the product cascades to `product_ingredient`.
- [ ] Unique constraints hold in tests: `routine_log (routineId, day)`, `condition_log (day, area)`, `progress_entry (area, weekStart)`, `ingredient.normalizedName`.
- [ ] Deleting a product sets `routine_step.productId` and `shopping_item.productId` to null (tested).
- [ ] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Notes

- Later schema changes are new migrations generated with `npm run db:generate`; never edit a committed migration.
- If `better-sqlite3` fails to build in your environment, write why under Decisions and use `sql.js` with `drizzle-orm/sql-js` for tests instead.

## Decisions

- Column names in SQL are snake_case (`archived_at`); the Drizzle field names are the camelCase names from the table above.
- `createdAt` / `updatedAt` default to `unixepoch('subsec') * 1000` in SQL; `updatedAt` also refreshes on every Drizzle update through `$onUpdateFn`.
- `ingredient.groupId` uses `ON DELETE SET NULL`, so deleting a group keeps its ingredients.
- `shopping_dismissal.productId` is unique (one dismissal per product), as the table notes say.
- `migrations.js` is generated by drizzle-kit; `env.d.ts` declares `*.sql` and `*.css` imports for TypeScript.
- `MigrationGate` (`src/db/MigrationGate.tsx`) wraps the router in `app/_layout.tsx`: it renders nothing (splash still up) while migrating, then the app; on failure it hides the splash and shows the message with Try again, which remounts the migrator.
- better-sqlite3 13 builds fine in Node 22, so tests use it as planned.
