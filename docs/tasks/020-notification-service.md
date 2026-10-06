# 020 Notification service

**Phase:** E. Expiry reminders · **Depends on:** 005 · **Spec:** Notifications (table and scheduling rule), refinement 8 (permission asked in context), S5 banner, navigation map (dotted notification taps)

## Goal

One local-notification layer that every feature uses: permission, Android channels, action buttons, a 14-day scheduling window kept topped up, cancel-and-reschedule per entity, and taps that open the right screen behind the lock. Features (021, 027, 033, 036) only describe what to schedule.

## Scope

In: `npx expo install expo-notifications expo-background-task expo-task-manager`; add the `expo-notifications` plugin to `app.json` with the notification icon (a white frog silhouette from `assets/brand/logo-white.svg` rendered to a 96 × 96 PNG, `assets/images/notification-icon.png`) and colour `#B83A6E`. Files in `src/notifications/`.

### Permission (`permission.ts`)

- `getPermission()` → `'granted' | 'denied' | 'undetermined'`.
- `requestPermission()` shows the system prompt. It is only ever called from an in-context ask (task 021's reminder ask, task 027's first routine reminder), never at launch.
- `usePermission()` re-checks when the app returns to the foreground, for the S5 banner "Notifications are off for Jx-Care" with "Open phone settings" (`Linking.openSettings()`).

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

- [ ] Planner diff tests with the fake adapter: new items are scheduled; an item whose `fireAt` or text changed is cancelled and rescheduled; removed items are cancelled; items beyond 14 days or past are dropped; more than 60 items keeps the soonest 60; a second identical `sync` makes no calls; `syncEntity` touches only that entity.
- [ ] Without permission, `sync` cancels all and schedules none.
- [ ] Tapping a notification while locked opens the target screen right after the PIN (manual check on a device, described under Decisions with what you tested).
- [ ] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

(Write any choices you make here.)
