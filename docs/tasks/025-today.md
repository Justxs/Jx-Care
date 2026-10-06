# 025 Today

**Phase:** F. Routines and Today · **Depends on:** 010, 012, 022 · **Spec:** T1 (sections, first-run state, routine cards, A/B choice, expired products), refinement 3, Motion (routine finished, paint Today complete) · **Design:** [screens.md](../design/screens.md) TodayScreen, TodayFirstRunScreen

## Goal

The home screen that answers "what do I need to do today?": header with streaks, one card per time of day, expiring products and the first-run setup card. Later tasks add their sections into slots this task defines.

## Scope

In: `src/features/today/screens/TodayScreen.tsx`, `components/*`, `src/features/today/api.ts` (`useToday()` that composes the section queries), `prefetch.ts` (fill in task 005's stub).

### Sections, top to bottom (each hidden when empty)

1. **Header:** greeting by time of day ("Good morning" until 12:00, "Good afternoon" until 18:00, "Good evening" after; app-day aware), date via `formatWeekdayDate` ("Tuesday, 6 Oct"), skin and hair `StreakChip`s (skin from `useSkinStreak`; hair slot filled by task 033). No streak chips until a routine exists.
2. **Routine cards** (`useTodayRoutines`, task 022), one per time of day in time order:
   - time of day name, "Reminder at 07:30 · 4 steps" or "No reminder · 2 steps", `ProgressRing` ("3/5"), `ConflictTag` from task 030 (slot hook returns none for now);
   - **expired products** in the chosen routine are named in red on the card ("SPF 50 fluid expired 2 Oct"; several → "2 products expired");
   - **A/B choice:** when the group has two or more options, chips A/B (routine names) with "Pick one. Jx-Care remembers it for Tuesdays." (weekday from the date); picking calls `useSetChoice`. The chips show **only until the first step is ticked**; after that the choice is fixed for the day;
   - primary-looking button on the card says **Start** before any tick and **Continue** after (opens the player, task 026). Only the first unfinished card gets the filled style; others use secondary (one filled button per screen);
   - **done:** the card collapses to a ticked row (250 ms) that keeps naming any expired product; the skin streak chip counts up.
3. **Expiring soon** (`useExpiringSoon`, up to 3 `ProductRow`s with days left, red when expired, "See all" → Products filtered by status) and the **"3 to buy" chip** (task 034 fills the count; hidden until then). **While any product is expired, this section and the chip move up to sit directly under the routine cards**; otherwise they sit after the hair and photo sections.
4. **Hair due:** slot for task 033.
5. **Weekly photo card:** slot for task 036.
6. **How's your skin today?:** slot for task 038.

Section order changes and late sections animate (layout transition 200 ms), but on first paint everything is already in place.

### First-run state (TodayFirstRunScreen)

Shown until setup is done or hidden:

- "Set up Jx-Care" card with a `Progress` bar and "1 of 3", three rows at a **fixed 72 pt** height: Add your first product (opens P3 quick mode), Build a routine (opens the starter sheet, task 023), Set up hair care (opens quick hair setup, task 032; until it exists, the row opens the Routines Hair placeholder). Each row has a numbered circle that turns into a green check, and its second line changes to what was made ("Vitamin C serum added"). Done is computed from data (has a product / a routine / a hair task), not stored.
- Below the card, an **Optional** group: Weekly progress photo (opens Preferences, task 037) and Ingredients to avoid (opens Avoid list, task 030).
- When all three are done, the line under the card reads "You're set"; the card is removed the next app day (`settings.setupDoneAt`). Long press → Hide removes it at once (`settings.setupHiddenAt`).
- No streak chips or routine cards until a routine exists.

### Paint complete

`prefetchToday(queryClient, day)` prefetches every query `useToday()` needs (settings, routines today, streak, expiring soon, and the slots' queries as later tasks add them). It runs while the lock screen is open (task 018) and at launch, so Today's first frame has all its sections. When a query isn't ready (rare), its section shows a skeleton at final size.

Out:

- Player: 026. Hair rows and hair streak: 033. Weekly photo card: 036. Skin chips: 038. To buy chip count: 034. Conflict tags: 030.

## Acceptance criteria

- [ ] With routines Mon/Wed/Fri and Tue/Thu at Evening plus a daily Morning, Today shows the right cards per weekday; two Evening routines on one day show A/B chips that disappear after the first tick and the button changes from Start to Continue (render tests with mocked hooks, plus 022's repository tests).
- [ ] An expired product in a routine is named in red on its card and done row, and Expiring soon moves under the routine cards.
- [ ] First-run card: rows tick from data, keep 72 pt, "You're set" then gone the next day; Hide works.
- [ ] Today paints with all sections on unlock (prefetch test: after `prefetchToday`, every Today query is in the cache).
- [ ] Finishing a routine collapses its card in 250 ms; Reduce Motion makes it a fade.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
