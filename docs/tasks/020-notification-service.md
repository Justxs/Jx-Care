# 020 Notification service

**Phase:** E. Expiry reminders · **Depends on:** 005 · **Spec:** Notifications (table and scheduling rule), refinement 8 (permission asked in context), S5 banner, navigation map (dotted notification taps)

## Goal

One local-notification layer that every feature uses: permission, Android channels, action buttons, a 14-day scheduling window kept topped up, cancel-and-reschedule per entity, and taps that open the right screen behind the lock. Features (021, 027, 033, 036) only describe what to schedule.

## Scope

In: `npx expo install expo-notifications expo-background-task expo-task-manager`; add the `expo-notifications` plugin to `app.json` with the notification icon (a white frog silhouette from `assets/brand/logo-white.svg` rendered to a 96 × 96 PNG, `assets/images/notification-icon.png`) and colour `#B83A6E`. Files in `src/notifications/`.

### Permission (`permission.ts`)

- `getPermission()` → `'granted' | 'denied' | 'undetermined'`.
- `requestPermission()` shows the system prompt. It is only ever called from an in-context ask (task 021's reminder ask, task 027's first routine reminder), never at launch.
- `usePermission()` re-checks when the app returns to the foreground, for the S5 banner "Notifications are off for Jx Care" with "Open phone settings" (`Linking.openSettings()`).

### Channels and categories (`setup.ts`, run once at startup)

- Android channels: `expiry` ("Expiry"), `routines` ("Routines"), `hair` ("Hair care"), `photos` ("Weekly photo"), `digest` ("Weekly digest and backup"). Names from i18n, re-registered when the language changes.
- Categories with action buttons (spec table "Actions"): `expiry_warning` (Buy again), `expiry_day` (Mark finished), `routine` (Snooze), `hair` (Done, Snooze), `other_care` (Done), `weekly_photo` (Skip this week). Button titles from i18n.
- Foreground behaviour: show banners while the app is open, but no sound.

### Scheduling (`scheduler.ts`)

The core is a pure planner plus a thin side-effect layer:

```ts
type PlannedNotification = {
  key: string;            // stable, e.g. 'product:12:expiry_warning:2026-11-05'
  entityType: 'product' | 'routine' | 'hair_task' | 'weekly_photo' | 'digest' | 'backup';
  entityId: number | null;
  kind: string;
  fireAt: number;         // ms
  title: string; body: string;
  categoryId?: string; channelId: string;
  data: { url: string };  // deep link, see below
};
type Planner = (ctx: { db: Db; now: number; settings: Settings; t: TFunction }) => PlannedNotification[];
```

- `registerPlanner(name, planner)`: features register planners (021 expiry, 027 routines, 033 hair, 036 weekly photo, 021 digest, 040 backup).
- `sync(now)`: runs every planner, keeps only items with `fireAt` within the next **14 days** and after `now`, sorts by `fireAt`, caps at **60** (iOS allows 64 pending), then diffs against the `scheduled_notification` table: cancel what is gone or changed, schedule what is new, update the table. Same input twice → no OS calls the second time (tested with a fake OS adapter).
- `syncEntity(entityType, entityId)`: the same diff limited to one entity, called after a product, routine or hair task changes.
- When `sync` runs: on every app open (after unlock), when the app returns to the foreground on a new app day, after language or reminder settings change, and from a daily background task (`expo-background-task`, minimum interval 24 h) so reminders keep flowing when the app isn't opened.
- If permission isn't granted, `sync` cancels everything and schedules nothing.
- Wrap `expo-notifications` behind a `NotificationOS` adapter (`schedule`, `cancel`, `getAllScheduled`) so the planner and diff are tested in Jest without native code.

### Taps and actions (`responses.ts`)

- Each notification carries `data.url`, an Expo Router path: `/products/12` (P2), `/player/5` (T2), `/hair/done/3` (T3 sheet), `/progress/camera` (C4), `/products?filter=expiring` (digest), `/settings/backup` (S8).
- On tap: if the app is locked, remember the URL in `lockStore.pendingUrl`; after unlock (task 018), navigate to it. If unlocked, navigate at once. Handle cold starts with `getLastNotificationResponseAsync()`.
- Action buttons run without opening the app where the OS allows, through a handler map features register: `registerAction('routine', 'snooze', handler)`. Snooze schedules a one-off copy after `settings.snoozeMinutes`.

Out:

- Which notifications exist and their text: tasks 021 (expiry, digest), 027 (routines), 033 (hair), 036 (weekly photo), 040 (backup reminder).
- The Reminders screen (S5): task 021.

## Acceptance criteria

- [x] Planner diff tests with the fake adapter: new items are scheduled; an item whose `fireAt` or text changed is cancelled and rescheduled; removed items are cancelled; items beyond 14 days or past are dropped; more than 60 items keeps the soonest 60; a second identical `sync` makes no calls; `syncEntity` touches only that entity.
- [x] Without permission, `sync` cancels all and schedules none.
- [ ] Tapping a notification while locked opens the target screen right after the PIN (manual check on a device, described under Decisions with what you tested).
- [x] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

- **Files:** `src/notifications/` holds `types.ts`, `scheduler.ts` (planner registry, pure `selectWindow` / `diffScheduled`, `sync`, `syncEntity`, snooze, `cancelAllNotifications`), `repo.ts` (the `scheduled_notification` table), `os.ts` (the expo-notifications `NotificationOS`), `permission.ts`, `setup.ts`, `responses.ts`, `tasks.ts` (background tasks), `start.ts` (when sync runs), `app.ts` (what `app/_layout.tsx` calls) and `index.ts` (the public API features import from `@/notifications`). `fakeOS.ts` is the in-memory adapter for tests; feature tests (021, 027, 033, 036) can reuse it.
- **No schema change.** The OS identifier of each notification is `<key>#<hash>`, the hash (FNV-1a) covering time, title, body, category, channel and URL. That id goes in `scheduled_notification.notification_id`, so "changed" means "different id": the old one is cancelled and the new one scheduled, and the table needs no key or text columns. Keys are built with `notificationKey(entityType, entityId, kind, discriminator)` ('product:12:expiry_warning:2026-11-05'); a `#` in a key becomes `_`.
- **The adapter** is `schedule`, `cancel`, `getAllScheduled` plus `getPermission`, so `sync` is fully testable with the fake. "A second identical sync makes no calls" is tested as no schedule, cancel or getAllScheduled call (the permission read still happens, it changes nothing).
- **Diff rules:** rows whose `fireAt` has passed are deleted without a cancel (they have fired); duplicate rows for one id are deleted; cancels run before schedules so the phone never goes over the limit; a failed schedule isn't recorded, so the next sync retries. A planner that throws is skipped and the others still schedule. Syncs run one at a time (a promise queue), so two triggers can't double-schedule.
- **Reconcile:** `sync(now, { reconcile: true })` first reads the phone's pending list: our notifications the table doesn't know are cancelled (for example after a restore, task 040 should call it this way), rows the phone lost are forgotten and scheduled again. App open, a new app day, a permission change and the daily background task use it; settings and entity changes don't need it.
- **`syncEntity`** plans everything (the 60 cap is global), keeps the entity's items and diffs only that entity's rows. If the phone would then hold more than 60, it falls back to a full sync, which drops the latest ones.
- **Nothing is planned before onboarding** (no settings row): sync cancels whatever is left, which also covers a reset app.
- **Planners get** `{ db, now, settings, t }` with `t = i18n.getFixedT(settings.language)`, so the text follows the saved language even in a headless start.
- **When sync runs** (`start.ts`): right after boot (every app open, reconciling), on unlock (lock goes from true to false, task 018), when the language changes (channels and buttons are renamed first), when `activeDay` changes (a foreground on a new app day or the 04:00 timer), when a reminder setting in the settings query changes (any save through `useUpdateSettings` or `setQueryData`), when the permission changed while the app was away, and from the daily background task. The boot sync doesn't wait for the PIN: planning shows nothing, and it means reminders are topped up even before the lock exists.
- **Daily background task:** `expo-background-task` with `minimumInterval: 1440` minutes; skipped where the OS reports it restricted. The headless start sets the database (`@/db/client`) and the adapter itself.
- **Action buttons** all have `opensAppToForeground: false`. Android runs them from the notification background task (`Notifications.registerTaskAsync`) when the app is closed; while it runs, the response listener does. A response handled once is never handled again (the listener, the cold-start lookup and the background task can all see the same one). After a handler runs, the notification is dismissed. A button with no registered handler yet opens the notification's screen instead (task 021: "until then the action opens the product"). Snooze is registered here for `routine` and `hair`: a copy with id `snooze:<key>` after `settings.snoozeMinutes`, same text, category and channel (so it can be snoozed again). Snoozed copies live outside the table, so sync never cancels them; `cancelSnoozes(entityType, entityId)` removes them (task 027 on completion).
- **Feature registration:** `tasks.ts` lists the modules that call `registerPlanner` / `registerAction` as imports, so a headless start has them; each feature adds one import line there (021, 027, 033, 036, 040).
- **Taps:** `openUrl(url)` navigates with `router.push` when unlocked and sets `lockStore.pendingUrl` when locked. `openPendingUrl()` (navigate and clear, once) is for task 018 to call right after unlock. Cold starts read `getLastNotificationResponseAsync()` and then clear it, so a later launch doesn't reopen it. `lockStore` gained `pendingUrl`, `setPendingUrl` and `takePendingUrl`.
- **Permission:** `getPermission()` maps iOS provisional and ephemeral to granted. `requestPermission()` asks for alert and sound, no badge, and stores the answer in the `qk.notifications.permission` query. `usePermission()` reads that query and invalidates it whenever the app becomes active; `null` until the first check. `openPhoneSettings()` wraps `Linking.openSettings()`. The banner copy follows the spec and task 021 ("Notifications are off in phone settings", not "for Jx Care"); the strings are under `notifications.permissionOff.*` for task 021.
- **Channels** (Android): High importance for expiry, routines, hair and photos (heads-up), Default for the digest; sound default, light in the accent colour. Android doesn't let an app change a channel's importance after it exists, only its name, so changing these later needs new channel ids. Notifications carry `sound: true`; in the foreground the handler shows banner and list without sound.
- **Notification icon:** no SVG renderer exists in this container (ImageMagick's SVG delegate is rsvg-convert, which isn't installed), so `assets/images/notification-icon.png` was drawn with Python PIL from the exact geometry of `assets/brand/logo-white.svg` (head path, masks, eyes), at 16× supersampling, white on transparent, 96 × 96 with the drawing 84 px wide and centred.
- **Tests** mock the native modules globally in `jest.setup.js` (`src/test/nativeNotificationMocks.ts`: expo-notifications, expo-task-manager, expo-background-task as jest.fn stand-ins), so any screen test that imports the notification layer works.
- **Device checks needed:**
  - Tap a notification while locked (cold start and from the background): the lock shows first, then the target screen right after the PIN. Needs task 018 to call `openPendingUrl()` after unlock; not testable on a device until then. Taps while unlocked open the screen at once.
  - Each `data.url` opens the right screen: `/products/12`, `/player/5`, `/hair/done/3`, `/progress/camera`, `/products?filter=expiring`, `/settings/backup`.
  - Action buttons on Android with the app closed, in the background and open (Snooze fires again after the snooze length; the notification is dismissed). On iOS, buttons that don't open the app may not reach JS when the app was killed: check, and switch those to `opensAppToForeground: true` on iOS if they don't.
  - Foreground banner without sound on both platforms (Android may not show a heads-up when sound is off).
  - Channel names in Android settings change when the language changes; button titles follow the language.
  - The daily background sync actually runs (`BackgroundTask.triggerTaskWorkerForTestingAsync()` in a debug build) and the notification icon shows as the white frog in the status bar, tinted #B83A6E.
  - After a reboot pending notifications are still there (Android), and turning permission off in phone settings and back on reschedules on return.
