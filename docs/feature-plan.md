# Jx-Care Feature Plan

Written 2026-10-06. Living version: [Claude Doc](https://claude.ai/code/artifact/965d4890-47d1-44a7-a629-985c83b64dd4).

Screen-by-screen detail for design, the navigation map and sequence diagrams are in [feature-spec.md](feature-spec.md); where the two differ, the spec wins.

## Overview

Jx-Care is an offline React Native app for one person to track skin and hair care products, follow routines, and stay consistent. Everything lives on the phone: no account, no server, no sync.

Fixed by the ask:

- React Native, single user, local-only storage
- Two languages, Lithuanian (LT) and English (EN), switchable in Settings
- PIN set on first launch, required to open the app

Defaults picked where the ask was open:

- **Platforms:** Android and iOS, both built from one Expo codebase.
- **Default language:** follows the phone's language, LT if it is Lithuanian, otherwise EN.
- **PIN:** 4 digits, optional fingerprint/Face ID unlock after the PIN is set, re-lock after 1 minute in the background.
- **Forgotten PIN:** a recovery question set during first launch lets the user set a new PIN. "Reset app" (wipes all data) stays as the last resort, softened by a manual JSON backup export.
- **Expiry rule:** a product's effective expiry is the earlier of its printed expiry date and opened date + period-after-opening (PAO, the "12M" jar icon).
- **Expiry warning:** 30 days before by default, adjustable per user in Settings.
- **Streak:** a day counts when every step of at least one skin routine scheduled that day is done (skin streak). Hair has its own separate streak, counting hair tasks done on their due day.
- **Ingredient conflicts:** fully user-defined, no built-in ingredient database, checked across the whole day. Products track dates only, no "how much is left" counter.

## Features

Eleven features, grouped as the app's main areas. Each lists what the user can do and the rules behind it.

### 1. PIN login

- First launch: pick language, create a 4-digit PIN, confirm it, then pick a recovery question and answer.
- Every launch and every return after 1 minute in the background shows the lock screen.
- Optional biometric unlock once a PIN exists.
- 5 wrong tries in a row adds a 30-second wait. "Forgot PIN?" asks the recovery question; a correct answer lets the user set a new PIN.
- Settings: change PIN (needs the old one), change recovery question, reset app (wipes everything, asks twice).
- PIN and recovery answer stored only as salted hashes in the phone's secure storage; the answer is compared ignoring case and spaces.

### 2. Product list (skin and hair)

- Add, edit, archive and delete products; each is tagged **Skin** or **Hair** (or both, for things like oils).
- Fields: name, brand, category (cleanser, toner, serum, moisturizer, SPF, mask, shampoo, conditioner, hair mask, oil, styling, other), photo, size + unit (ml, g, pcs), price (optional), purchase date, printed expiry date, opened date, period after opening in months, ingredients ("made of"), notes.
- Ingredients are entered one per line (typed or pasted), not separated by commas. Each line is matched against the user's own ingredient list with suggestions, and new ones are added to it, so conflicts can match on them.
- List shows a status badge: OK, expiring soon, expired, not opened yet.
- Filter by Skin / Hair, category, status; search by name or brand; sort by soonest expiry.
- "Mark as opened" quick action sets opened date to today.
- "Finished" moves a product to an archive instead of deleting it, keeping history.
- Cost per day of use: when a finished product has a price and an opened date, the app shows price ÷ days between opening and finishing (e.g. "€0.21 a day"). Shown on the product detail; the archive can sort by it to compare value.

### 3. Expiry notifications

- Each product gets a local notification on its warning date (default 30 days before effective expiry) and one on the expiry day.
- Recomputed whenever expiry date, opened date or PAO changes.
- Home screen shows an "Expiring soon" card as a backup to notifications.

### 4. Skin care routines

- A routine has a name, a time slot (Morning, Evening, or custom), the days of the week it applies, and an ordered list of steps.
- Each step links to a product from the list, with an optional note ("2 drops").
- Per-step schedule: a step runs every time the routine runs (default), only on chosen weekdays, or every N days. Example: one Evening routine where the exfoliant step is only on Tue/Fri. Today hides steps that aren't due, so fewer routine variants are needed.
- Wait timer: a step can have an optional wait (e.g. 60 seconds for an acid to absorb). After ticking it, a countdown runs before the next step; it can be skipped.
- Several routines can share a time slot, e.g. **Evening A: retinol** on Mon/Wed/Fri and **Evening B: exfoliation** on Tue/Thu. Today's screen shows only the routines scheduled today; if two land in the same slot, the user picks one.
- Steps are reordered by drag; a routine can be duplicated to make a variant.
- Doing a routine: tick steps off; when all are ticked the routine is done for the day.

### 5. Routine alarms

- Each routine can have one reminder time on its scheduled days, as a local notification ("Evening routine time").
- Tapping the notification opens that routine ready to tick off.
- Snooze 15 minutes; reminder skipped if the routine is already done.

### 6. Calendar and streak

- Month calendar: each day coloured done, partly done, missed, or no routine scheduled.
- Separate skin and hair streaks, each with current and best, on the home screen and calendar.
- A day with nothing scheduled neither breaks nor extends a streak.
- Tapping a day shows which routines and products were used.

### 7. Ingredient conflicts

- The user keeps a conflict list: pairs of ingredients that shouldn't be combined (e.g. retinol and AHA), each with an optional note.
- Conflicts can also be set between ingredient groups (e.g. "acids") the user defines, to avoid entering every pair.
- Conflicts are checked across the whole day: when any two products used in routines scheduled on the same day (morning and evening included) conflict, both steps get a warning mark with the reason, and the affected routine cards show a warning icon.
- Shown as a warning only; saving the routine is still allowed.
- The routine editor shows which other routine on which weekday causes the clash.
- Personal avoid list: ingredients or ingredient groups the user never wants (e.g. fragrance, a known allergen). Adding or editing a product that contains one shows a warning, and the product gets an "avoid" badge in the list.

### 8. Hair care calendar

- The user sets hair care tasks: a product or product set (e.g. shampoo + conditioner, or hair mask) and how often, "every N days" or on fixed weekdays.
- The app calculates the next due date from the last time it was done, not from a fixed start, so a late wash shifts the next one.
- Hair calendar shows past and upcoming wash days; a reminder fires on due days at a chosen time.
- Marking "washed today" logs which products were used.
- Hair events beyond washing: tasks without products, such as a trim every 8 weeks or colour every 6 weeks. The hair view shows how long ago each happened ("last trim 7 weeks ago") and reminds when the next is due. Events don't count toward the hair streak.
- Hair care has its own streak: each hair task done on its due day extends it, a missed due day breaks it. Days shown as on time / late.

### 9. Shopping list

- One list of things to buy. An item is either linked to an existing product ("buy again") or typed as free text for something new (name, optional brand, Skin/Hair, note).
- Quick add: "Add to shopping list" on any product, including archived ones, and on the "Expiring soon" card.
- Suggestions: when a product is marked **Finished**, or its effective expiry is within the warning window, the app offers to add it. Since there is no "how much is left" counter, nothing is added without the user's tap.
- Items show the last known price and size from the linked product, so the user knows what they paid before.
- Tick an item when bought. For a linked item the app offers "Add as new product", which copies name, brand, category, area, size, unit and ingredients into a new product with today's purchase date; expiry and opened dates are filled in fresh.
- Bought items move to a "Bought" section and are cleared after 30 days, or manually with "Clear bought".
- Filter by Skin / Hair; share the list as plain text (e.g. to a messaging app) for use in the shop.
- Shopping list items are included in the JSON backup.

### 10. Skin and hair progress photos

- Weekly check-in: a reminder on a chosen weekday and time (default Sunday 10:00) says it's time for this week's skin photo. Today shows a "Weekly photo" card until it's taken; a missed week gets no extra nagging.
- Guided capture with the in-app camera: last week's photo shows as a faint overlay so face position, angle and distance line up. A short hint reminds the user to use the same light and no makeup.
- Angles: the user picks which to track (front, left side, right side); front only by default. One check-in holds one photo per tracked angle.
- Each week can also get a 1–5 skin rating, tags (breakout, redness, dryness, oiliness) and a note.
- Timeline: a grid of weekly check-ins, newest first, with the rating shown on each.
- Compare: pick any two weeks side by side, or drag a slider across them; a quick "4 weeks ago vs now" button.
- Context: each week shows which routines were done that week and which products started or stopped, so changes in the skin can be linked to changes in the routine.
- Privacy: photos are saved in the app's private storage, never in the phone gallery, and are only visible after the PIN. The JSON backup leaves them out by default; "Include photos" exports a zip instead.
- Delete a single photo or a whole week.
- Hair album: the same weekly check-in for hair, with front, back and top angles. It's off by default and turned on in Settings; skin and hair have separate timelines.

### 11. Condition log and product notes

- Daily condition log: one tap on the calendar day or Today for skin (calm, oily, dry, breakout, redness) and hair (oily, dry, frizzy, shiny), plus an optional note. Several states can be picked.
- The day detail shows the condition next to the routines and products used, and the month calendar can switch to a condition view, so patterns are easy to spot.
- Product notes: dated reaction notes on any product ("small breakout on chin", "skin felt calm"), plus a personal 1–5 rating and a "would buy again" yes/no.
- Rating and "would buy again" show on the shopping list when suggesting a re-buy; a "no" product isn't suggested.

## Data model

Seventeen tables in a local SQLite database; expiry status and streaks are computed, not stored.

| Table | Key fields | Notes |
| --- | --- | --- |
| settings | language, pinHash, recoveryQuestion, recoveryAnswerHash, biometricsOn, expiryWarnDays, lockAfterSec | One row |
| product | id, name, brand, area (skin/hair/both), category, photoUri, size, unit, price, purchasedAt, expiresAt, openedAt, paoMonths, notes, rating, wouldRebuy, archivedAt | Effective expiry = min(expiresAt, openedAt + paoMonths); cost per day = price / (archivedAt - openedAt) |
| ingredient | id, name, groupId | User's own list |
| ingredient_group | id, name | e.g. "acids", "retinoids" |
| product_ingredient | productId, ingredientId | Many-to-many |
| conflict | id, leftKind, leftId, rightKind, rightId, note | Each side is an ingredient or a group |
| routine | id, name, slot (morning/evening/custom), daysOfWeek, reminderTime, active | Several per slot allowed |
| routine_step | id, routineId, productId, position, note, daysOfWeek, everyNDays, waitSeconds | Ordered steps; empty schedule = every time |
| routine_log | id, routineId, date, completedStepIds, completedAt | Feeds the calendar and skin streak |
| hair_task | id, name, kind (wash/event), productIds, everyNDays or daysOfWeek, reminderTime, lastDoneAt | Next due = lastDoneAt + N; events have no products |
| hair_log | id, hairTaskId, date, productIds | Wash history, feeds hair streak |
| shopping_item | id, productId (nullable), name, brand, area, note, addedAt, boughtAt | productId set for "buy again", null for free-text items |
| progress_entry | id, area (skin/hair), weekStart, takenAt, rating, tags, note | One per weekly check-in per area |
| progress_photo | id, entryId, angle (front/left/right/back/top), fileUri | Files in app-private storage |
| condition_log | id, date, area (skin/hair), states, note | Daily condition |
| product_note | id, productId, date, text | Dated reaction notes |
| avoid_item | id, kind (ingredient/group), refId, note | Personal avoid list |

Notification ids are kept per product, routine and hair task so they can be cancelled and rescheduled on edits.

## Screens and navigation

Five bottom tabs, all behind the lock screen; Today is the home tab.

```
First launch (language, PIN) → Lock screen (PIN / biometrics; every open, and after 1 min away)
                                   ↓
┌──────────────┬────────────────┬────────────────┬──────────────┬─────────────────┐
│ Today        │ Products       │ Routines       │ Calendar     │ Settings        │
├──────────────┼────────────────┼────────────────┼──────────────┼─────────────────┤
│ Routines due │ List + filters │ Skin routines  │ Skin / Hair  │ Language LT/EN  │
│ Tick off     │ Add / edit     │ Routine editor │ Month view   │ PIN, biometrics │
│ Hair due     │ Product detail │ Hair schedule  │ Day detail   │ Ingredients     │
│ Expiring soon│ Archive        │ Hair tasks     │ Streak stats │ Conflicts       │
│ Streak       │ Shopping list  │                │ Progress     │ Expiry warning  │
│ Weekly photo │                │                │ Daily log    │ Backup, reset   │
│ Daily log    │                │                │              │ Avoid list      │
└──────────────┴────────────────┴────────────────┴──────────────┴─────────────────┘
```

Routine reminders open straight into Today with that routine expanded; expiry reminders open the product's detail screen.

The shopping list sits inside the Products tab (a "Shopping" switch at the top of the list) to keep five tabs; Today shows a small "N to buy" chip linking to it.

Skin progress photos sit inside the Calendar tab as a "Progress" view next to the skin and hair calendars; the weekly reminder opens the camera directly.

## Tech stack

Expo-managed React Native with TypeScript on the newest versions, so Android and iOS build from one codebase. Expo packages are added with `npx expo install` so they match the SDK; everything else starts on its latest release. Versions below are the npm latest on 2026-10-06.

| Need | Pick | Why |
| --- | --- | --- |
| App framework | Expo SDK 57 (React Native 0.87, React 19) + TypeScript | Newest SDK, no native toolchain to start |
| Navigation | Expo Router 57 (tabs + stacks) | File-based routes, standard for Expo |
| Storage | expo-sqlite 57 + Drizzle ORM 0.45 | Relational data, typed queries, migrations |
| Data state | TanStack Query 5 | Caches SQLite reads, refreshes lists after edits via query invalidation |
| App state | TanStack Store 0.11 | Settings, language and lock state |
| Forms | TanStack Form 1 | Product, routine and hair task forms with validation |
| PIN hash | expo-secure-store + expo-crypto | Keychain/Keystore backed |
| Biometrics | expo-local-authentication | Fingerprint / Face ID |
| Notifications | expo-notifications (local only) | Expiry, routine and hair reminders, no server |
| Translations | i18next 26 + react-i18next 17, expo-localization | LT/EN files, picks phone language |
| Dates | date-fns 4 with lt and en-US locales | Expiry and "every N days" maths |
| Calendar UI | react-native-calendars | Month view with coloured day marks |
| Lists | react-native-draggable-flatlist 4 | Reorder routine steps |
| Photos | expo-image-picker | Product photo from camera or gallery |
| Camera | expo-camera | Weekly progress photo with last week's photo as an overlay |
| Backup | expo-file-system + expo-sharing | Export/import a JSON backup |
| Tests | Jest 30 + React Native Testing Library 14 | Unit tests for expiry, streak and conflict logic |
| Base components | rn-primitives 1.5 (@rn-primitives/* packages) | Unstyled, accessible dialogs, selects, switches, tabs and more, styled with the app's own theme |
| Styling | NativeWind 4.2 (Tailwind CSS 3.4) | Tailwind classes on RN components, light/dark tokens as CSS variables; same setup as React Native Reusables. Move to NativeWind 5 once it leaves RC |
| Animation | react-native-reanimated 4 | Smooth screen, sheet and list transitions; see the motion rules in docs/feature-spec.md |

Notification caveat: iOS keeps at most 64 pending local notifications, so the app schedules only the next ones in the coming weeks and tops them up each time it opens.

## Build order

Twelve milestones, each ending in something usable on the phone; later ones depend on the product list from milestone 2.

1. **Foundation:** Expo + TypeScript project, tab navigation, SQLite schema and migrations, LT/EN translation setup, NativeWind theme from the design system tokens, Settings screen with language switch.
2. **Products:** product list, add/edit form with all fields and photo, ingredients, archive, search/filter, expiry status badges, cost per day.
3. **PIN lock:** first-run onboarding (language, PIN, recovery question), lock screen, auto-lock, biometrics, forgot-PIN flow, change PIN, reset app.
4. **Expiry notifications:** schedule/cancel per product, warning-days setting, "Expiring soon" home card.
5. **Skin routines + alarms:** routines with days and slots, steps with per-step schedules and wait timers, variants, today's view with tick-off, reminder notifications.
6. **Calendar + streak:** routine log, month calendar, current and best skin streak.
7. **Conflicts:** ingredient groups, conflict editor, whole-day warnings in routines, personal avoid list.
8. **Hair care calendar:** hair tasks with frequency, next-due logic, hair calendar, reminders, wash log, hair streak, hair events (trim, colour).
9. **Shopping list:** list with linked and free-text items, add from product and expiring card, finished/expiring suggestions, tick bought and "Add as new product", share as text.
10. **Progress photos:** weekly reminder, guided camera with overlay, angles, rating and tags, timeline, side-by-side and slider compare, routine context, private storage, optional hair album.
11. **Condition log and product notes:** daily skin/hair condition, condition calendar view, product reaction notes, rating and "would buy again".
12. **Polish:** JSON backup export/import (photos optional as zip), empty states, full LT/EN copy review, app icon.

PIN lock comes after products on purpose: it is easier to test the data screens without a lock, and the lock wraps the finished navigation.

## Decisions

Answered by Justas on 2026-10-06 and folded into the sections above.

| Question | Decision |
| --- | --- |
| iOS too, or Android only? | Both Android and iOS |
| Streak for skin only, or hair too? | Separate skin and hair streaks |
| Check conflicts inside one routine or the whole day? | Whole day, morning and evening |
| Forgotten PIN: reset only, or recovery question? | Recovery question, reset as last resort |
| Track how much product is left? | No, dates only |
