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

(Write any choices you make here.)
