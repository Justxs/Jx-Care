# 025 Today

**Phase:** F. Routines and Today · **Depends on:** 010, 012, 022 · **Spec:** T1 (sections, first-run state, routine cards, A/B choice, All done, expired products), refinements 3 and 13, Global UI rules (Explaining), Motion (routine finished, paint Today complete) · **Design:** [screens.md](../design/screens.md) TodayScreen, TodayFirstRunScreen, ExplainSheets; [components.md](../design/components.md) StreakChip

## Goal

The home screen that answers "what do I need to do today?": header with streaks, one card per time of day, expiring products, the Check-in card and the first-run setup card. Later tasks add their sections into slots this task defines. This task also builds the ExplainSheets that other screens open.

## Scope

In: `src/features/today/screens/TodayScreen.tsx`, `components/*`, `src/features/today/api.ts` (`useToday()` that composes the section queries), `prefetch.ts` (fill in task 005's stub), `src/components/ExplainSheet.tsx` (shared, see below).

### Sections, top to bottom (each hidden when empty)

1. **Header:** greeting by time of day ("Good morning" until 12:00, "Good afternoon" until 18:00, "Good evening" after; app-day aware), date via `formatWeekdayDate` ("Tuesday, 6 Oct"), skin and hair `StreakChip`s (`calendar-check` icon, never a flame; skin from `useSkinStreak`; hair slot filled by task 033). Tapping a chip opens the streak sheet. No streak chips until a routine exists.
2. **Routine cards** (`useTodayRoutines`, task 022), one per time of day in time order:
   - time of day name, "Reminder at 07:30 · 4 steps" or "No reminder · 2 steps", `ProgressRing` ("3/5"), `ConflictTag` from task 030 (slot hook returns none for now);
   - **expired products** in the chosen routine are named in red on the card ("SPF 50 fluid expired 2 Oct"; several → "2 products expired");
   - **A/B choice:** when the group has two or more options, chips A/B (routine names) with "Pick one for tonight; Jx-Care remembers it for Tuesdays. About A and B" (weekday from the date); picking calls `useSetChoice`. The link "About A and B" opens the A or B sheet. The chips show **only until the first step is ticked**; after that the choice is fixed for the day;
   - two buttons: **Start** before any tick and **Continue** after (opens the player, task 026), and **All done** (secondary, `check-check`). Only the first unfinished card's Start gets the filled style; others use secondary (one filled button per screen);
   - **All done** ticks every due step of the chosen routine at once (`useTickStep` for each, one optimistic update) and shows the toast "Evening done" with Undo, which unticks the steps it ticked. It does not open the Routine done screen;
   - **done:** the card collapses to a ticked row (250 ms) that keeps naming any expired product; the skin streak chip counts up.
3. **Expiring soon** (`useExpiringSoon`, up to 3 `ProductRow`s and "See all" → Products filtered by status), with a **"Shopping list · 3 to buy" row** at the foot of the card that opens the shopping list (task 034 fills the count; the row is hidden until then). An expired row's badge carries the date ("Expired 2 Oct"); the date is never written twice in a row. **While any product is expired, this card sits here, directly under the routine cards.**
4. **Hair due:** slot for task 033.
5. **Expiring soon** when nothing is expired: the same card as 3, after Hair due.
6. **Check-in:** one card with two slots, divided by a `Separator`, hidden when both are empty:
   - the weekly photo row (task 036): "This week's skin photo" with Take photo (secondary) and a plain "Skip this week" text link under it, so the two never look equal. It shows on the weekly photo day until the photo is taken;
   - "How's your skin today?" (task 038): the seven skin chips in the standard order (Calm, Glow, Oily, Dry, Breakout, Redness, Itchy; tapping one saves at once) and "Hair and note", which opens the Condition log sheet (T4).

Section order changes and late sections animate (layout transition 200 ms), but on first paint everything is already in place.

### ExplainSheets (shared, `src/components/ExplainSheet.tsx`)

Short sheets that answer "what does this mean?" (spec Global UI rules, Explaining; copy in [screens.md](../design/screens.md) ExplainSheets). Built here because Today is the first screen that opens them; tasks 024, 026 and 030 open the same sheets.

- One `ExplainSheet` on `SheetFrame` (task 009): a title, short lines each led by a bare `ink-muted` icon (no tinted circles), closes with Close or a drag. Each sheet uses the person's own data.
- **Skin streak** (from the `StreakChip`s): a day counts when you finish a skin routine set for it (A or B is enough); days with nothing set are skipped; today never breaks it; an earlier day with a routine set and none finished starts it again, and the best stays. The hair streak counts washes on or before their day.
- **Evening A or B** ("About A and B"): two routines at one time of day are options; the other is not missed; the pick is remembered per weekday; they are never compared with each other.
- **Why this warning** (a `ConflictTag`, or "Why?" in the player): the pair, where and on which days they meet, the rule's note, and that A/B alternatives are never compared; Edit the routine or see the rule. Takes the hit as a prop; task 030 passes the data.
- **Mild conflict** (a Mild conflict tag, or "What does mild mean?" in the editor): one step runs every few days, so they only meet on some days; on those days the tag is a normal Conflict.

### First-run state (TodayFirstRunScreen)

Shown until setup is done or hidden:

- "Set up Jx-Care" card with a `Progress` bar and "1 of 3". The next step to do is opened up with a filled button ("Build a routine"); the others stay rows at a **fixed 72 pt** height. The three steps: Add your first product (opens P3 quick mode), Build a routine (opens the starter sheet, task 023), Set up hair care (opens quick hair setup, task 032; until it exists, the row opens the Routines Hair placeholder). Each row has a numbered circle that turns into a green check, and its second line changes to what was made ("Vitamin C serum added"). Done is computed from data (has a product / a routine / a hair task), not stored.
- Below the card, an **Optional** group: Weekly progress photo (opens Preferences, task 037) and Ingredients to avoid (opens Avoid list, task 030).
- When all three are done, the card becomes **"You're set"**: logo, one line and a "See today" button, which removes the card at once (same as Hide). It is removed the next app day (`settings.setupDoneAt`). Long press → Hide removes it at once (`settings.setupHiddenAt`).
- No streak chips or routine cards until a routine exists.

### Paint complete

`prefetchToday(queryClient, day)` prefetches every query `useToday()` needs (settings, routines today, streak, expiring soon, and the slots' queries as later tasks add them). It runs while the lock screen is open (task 018) and at launch, so Today's first frame has all its sections. When a query isn't ready (rare), its section shows a skeleton at final size.

Out:

- Player and Routine done screen: 026. Hair rows and hair streak: 033. Weekly photo row: 036. Skin chips and Hair and note: 038. Shopping list row count: 034. Conflict tags and conflict sheet data: 030.

## Acceptance criteria

- [ ] With routines Mon/Wed/Fri and Tue/Thu at Evening plus a daily Morning, Today shows the right cards per weekday; two Evening routines on one day show A/B chips that disappear after the first tick and the button changes from Start to Continue (render tests with mocked hooks, plus 022's repository tests).
- [ ] All done ticks every due step, shows "Evening done" with Undo, and Undo unticks them.
- [ ] Tapping a streak chip opens the streak sheet; "About A and B" opens the A or B sheet; both close with Close or a drag.
- [ ] An expired product in a routine is named in red on its card and done row, and Expiring soon (with its Shopping list row) moves under the routine cards.
- [ ] The Check-in card holds the photo row and the skin chips, and hides when both are empty.
- [ ] First-run card: rows tick from data, keep 72 pt, the next step has the filled button; "You're set" card then gone the next day; Hide works.
- [ ] Today paints with all sections on unlock (prefetch test: after `prefetchToday`, every Today query is in the cache).
- [ ] Finishing a routine collapses its card in 250 ms; Reduce Motion makes it a fade.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

- **Files.** `src/features/today/`: `screens/TodayScreen.tsx`, `components/` (`TodayHeader`, `RoutineCard`, `ExpiringCard`, `SetupCard` with `OptionalGroup`, `CheckInCard`), `api.ts` (`useToday`, `todayQueries`, `setupQuery`), `repo.ts` (`setupProgress`), `logic.ts` (greeting, setup state, section order, card helpers, done transition), `cardText.ts`, `slots.tsx`, `useRoutineActions.ts`, `useCountUp.ts`, `prefetch.ts`. Shared: `src/components/ExplainSheet.tsx` and `src/components/Logo.tsx` (the frog, for "You're set"; onboarding and lock can reuse it). No schema change.
- **Query options are shared, so prefetch keys always match.** `todayRoutinesQuery` and `skinStreakQuery` (routines `api.ts`), `expiringSoonQuery` (products `api.ts`) and `settingsQuery` (settings `api.ts`) are `queryOptions` factories that the existing hooks now use too. `prefetchToday` fetches settings, then prefetches every `todayQueries(day, warnDays)` entry. It runs at launch from `bootstrapAfterMigrations` (once onboarding is done); task 018 calls it behind the lock screen.
- **Setup is computed from data.** `setupProgress(db)` names the first product, routine and hair task made (any, also archived or inactive), so a row's second line reads "Vitamin C serum added" / "Evening basics added" / "Hair wash set up". Its query sits under `qk.today(day)`, which every product, routine, hair and settings mutation already invalidates.
- **Setup card life.** Visible while `setupHiddenAt` is null and `setupDoneAt` is null or today. When all three steps are done Today saves `setupDoneAt = today` once, shows "You're set" (frog, one line, See today) and the card is gone the next app day. See today and long press, Hide (also an accessibility action) save `setupHiddenAt`. The Optional group shows under the card only while it is in its "Set up" state. The setup card sits above the routine cards.
- **One filled button.** While the setup card shows it owns the filled button (the next step, or See today), so every routine card's Start is secondary; otherwise the first unfinished card's Start/Continue is filled.
- **Setup rows** are `h-[72px]` as the task says (one line of title, one of detail, both `numberOfLines={1}`; the full text is in the spoken label). The next step is opened up with its filled button and is taller; only one step is ever open, so the card height doesn't change when a step is ticked.
- **Setup links.** Add your first product opens `/product-form` (every new product uses the short form). Build a routine opens `/routines?starter=1` and Set up hair care `/routines?segment=hair`: task 023 should open the starter sheet / Hair side from these params, and task 032 can point row 3 at its quick setup sheet. Optional: `/settings/preferences` and `/settings/avoid`.
- **Routine card.** Title is the time of day ("Morning", "Evening" or the custom name). Meta is the chosen routine's reminder and its due step count today; once an A/B choice is fixed the chosen routine's name leads it ("Evening B · No reminder · 2 steps"). Expired products are those in the chosen routine's steps due today, each named once (`expiredProducts`); a product with no date that is "expired" can't happen, so the single line always has a date. The A/B line uses the time of day ("this morning", "tonight", "today") and a plural weekday (`today.weekdaysPlural`, LT instrumental "pirmadieniais"). "About A and B" is a 44 pt text button under the line rather than inline, for the touch target.
- **All done** ticks the chosen routine's remaining due steps in one `useTickStep` call (one optimistic update), gives a light haptic and shows "{{time of day}} done" with Undo, which unticks exactly those steps (an emptied log stays, as task 022 decided, so the A/B chips come back). Picking an A/B chip is ignored once started.
- **Done row** is pressable and opens the player (to review or untick); it keeps the expired line in red.
- **Motion.** `ROUTINE_DONE_MS = 250` lives in `today/logic.ts` (the spec's Motion table; `src/theme/motion.ts` keeps its 150/200/300 scale). The card's wrapper has a 250 ms `LinearTransition` while the card fades out and the done row fades in; with Reduce Motion there is no layout transition and both are 100 ms fades (`ReduceMotion.Never` so Reanimated doesn't drop them). Sections enter, leave and move with 200 ms fade and layout transitions; `LayoutAnimationConfig skipEntering` keeps the first paint still. The skin chip counts up (`useCountUp`, 250 ms; jumps with Reduce Motion). The greeting re-checks the clock once a minute.
- **Skeletons** at final size (routine card 188 pt, Expiring soon 260 pt) only when a query isn't cached; with the prefetch they never show.
- **Slots for later tasks** (`today/slots.tsx`, all return nothing now): `useCardConflictSlot` (030), `useHairStreakSlot` and `useHairDueSlot` (033), `useShoppingToBuySlot` (034, the Shopping list row is hidden while null), `useWeeklyPhotoSlot` (036), `useSkinCheckInSlot` (038). When a slot gets data, add its query to `prefetchToday`. The Check-in card is hidden until 036/038 fill a slot.
- **ExplainSheets** (`src/components/ExplainSheet.tsx`): `ExplainSheet` (title, lines of `{ icon, text }`, optional footer; Close plus drag, on `Sheet`) and four ready sheets: `StreakExplainSheet({ skin })`, `ABExplainSheet({ timeOfDay, names, weekday })`, `ConflictExplainSheet({ conflict, onEditRoutine?, onSeeRule? })` with `ConflictExplain = { first, second: { product, routine }, weekdays, note, mild }` for task 030 to build from a hit, and `MildConflictExplainSheet({ step?: { product, everyNDays } })`. Their strings are under `today.explain.*`.
- **See all** sets the Products filters to Expired + Expiring (keeping the sort) and navigates to `/products`. The Shopping list row will navigate to `/products` until task 034 gives it its own target.
- **Tests:** pure helpers (`logic.test.ts`), `setupProgress` (`repo.test.ts`), the prefetch (`prefetch.test.tsx`: every Today query cached and the first render has every part), screen tests over a seeded test database (`screens/__tests__/today.test.tsx`, with a bottom sheet mock that only renders while presented), and the shared sheets (`src/components/__tests__/ExplainSheet.test.tsx`).

Check on a real device:

- Light, dark, 360 pt and Lithuanian: the routine card buttons side by side ("Tęsti" / "Viskas atlikta" may wrap to two lines), the A/B line, the setup rows at 72 pt with Lithuanian text (one line each, truncated if the phone's text size is large), "You're set" card with the frog.
- Finishing a routine with All done: the card collapses in 250 ms with no jump below it, and the skin chip counts up; with Reduce Motion it is a short fade.
- Today paints with every section on a cold start (no skeleton flash), and sections move smoothly when Expiring soon jumps above Hair due.
- The streak and A/B sheets open, close with Close and with a drag, and size to their content.
- Long press on the setup card opens the Hide menu next to the card.
- The frog logo renders correctly (react-native-svg masks).
- A native Lithuanian read of the new `today.*` strings.
