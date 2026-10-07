# 026 Routine player

**Phase:** F. Routines and Today · **Depends on:** 022, 025 · **Spec:** T2, refinements 11 and 13, sequence 4, Words and copy (no faded text, conflict tag, streaks) · **Design:** [screens.md](../design/screens.md) RoutinePlayerScreen, RoutineDoneScreen, ExplainSheets; [components.md](../design/components.md) StreakCard

## Goal

The full-screen flow for doing a routine at the bathroom shelf: tick steps (one by one or all at once), wait between them when a product needs it, handle expired or finished products, and finish on the Routine done screen with the updated streak.

## Scope

In: `src/features/routines/screens/RoutinePlayerScreen.tsx`, `RoutineDoneScreen.tsx`, `components/PlayerStep.tsx`, `components/ProblemStepCard.tsx`, `components/WaitBar.tsx`, `useWaitTimer.ts`.

- Route `/player/[routineId]` (full-screen modal, slide up 300 ms, close slides down). Opened from Today, Routines or a routine reminder. It shows today's app day.
- **Header:** routine name, time of day, close (X), "Step 2 of 5" (`tabular-nums`) and a `ProgressRing`.
- **Steps due today** in order (`dueSteps`, task 007); steps not due today are hidden. Each row: `ProductThumb`, name, brand, note ("2 drops"), `Checkbox` (square). The whole row toggles it, not only the 26 pt box, so wet hands can hit it: tapping a done row unticks it. Ticking is optimistic (`useTickStep`), fills in 150 ms with a light haptic. Done steps keep their row and turn the name `ink-muted` (no opacity).
- **All done** (ghost, `check-check`) under the list ticks every remaining step at once and goes to the Routine done screen.
- **Wait timer:** ticking a step with `waitSeconds` starts a countdown in a **fixed bar floating at the bottom** ("Wait 1:00 before the next step", `tabular-nums`) with a real "Skip wait" button (secondary, 44 pt), not a link. Until it ends, the next step's text turns `ink-muted` and its caption reads "Next, after the wait" (text is never faded with opacity). The timer is based on an end timestamp so it stays right if the app is backgrounded; when it ends, a light haptic. Toasts float above the bar.
- **Conflict on a step:** a tappable `ConflictTag` (task 030 provides `dayConflicts` results; the hook returns none until then); an amber line under the list names the other routine and the risk ("Vitamin C serum conflicts with the glycolic acid toner in tonight's Evening B. Using both on one day can irritate. Why?"). The tag and "Why?" open the conflict sheet (the ExplainSheets from task 025; task 030 passes the data).
- **Expired or finished product** (refinement 11, v14): the step becomes a card: "Step 4 · SPF 50 fluid", a red "Expired 2 Oct" or neutral "Finished" `Badge`, the line "Pick another product for this step, or tick it to use this one today.", and two buttons: Pick another (opens the product picker, task 024; `useReplaceStepProduct` changes the routine's step) and Buy again (task 034; hidden until it exists). The card still has its checkbox.
- **Step with no product** ("Pick a product later"): same card style with "Pick a product" only.
- **All ticked** (the last tick, or All done): the player hands over to the Routine done screen. Ticks are saved as they happen; leaving mid-way keeps them.
- Call `onRoutineCompleted(routineId, day)` (no-op hook) whenever a routine becomes complete, here or through All done on Today, so task 027 can cancel today's pending reminder.

### Routine done (`/player/[routineId]/done`)

- Replaces the player (`router.replace`), full screen. The designed end of a routine, calm, no confetti, no exclamation marks: the logo (88 pt, fades in), "Evening done", "All 4 steps, finished at 21:52.", the skin `StreakCard` counting up to the new number (Reduce Motion shows the final number at once; after a break it reads "Started again. Your best is still 21 days." through `restarted`).
- What comes next ("Next: Morning · Tomorrow at 07:30") and anything that needs attention, such as an expired product in the routine ("SPF 50 fluid expired 2 Oct").
- Buttons: Back to Today (filled) and Add a note (ghost), which opens the Condition log sheet (task 038) on Skin.
- All done on the Today card (task 025) skips this screen and shows a toast with Undo instead.

Out:

- Reminder scheduling and snooze: 027. Conflict data: 030. Buy again: 034.

## Acceptance criteria

- [ ] Steps due today show in order; tapping anywhere on a row ticks it and tapping a done row unticks it; both save immediately and update Today and the streak.
- [ ] All done ticks every remaining step and opens the Routine done screen.
- [ ] Wait timer: countdown bar floats, next step text is muted with "Next, after the wait", the Skip wait button ends it, and the time is right after backgrounding (test `useWaitTimer` with fake timers).
- [ ] Expired and finished products show the problem card; Pick another replaces the product in the routine.
- [ ] Finishing shows the Routine done screen with the streak counting up ("Started again" after a break), what is next and Back to Today; leaving mid-way keeps ticks.
- [ ] The conflict tag and "Why?" open the conflict sheet.
- [ ] No text uses opacity; light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

- **Where it lives:** the screens moved from the task-010 placeholders in `src/features/player/` to `src/features/routines/screens/` as this task says; the `/player/[routineId]` and `/player/[routineId]/done` routes now import them. Pure helpers are in `playerLogic.ts`, "what comes next" in `playerRepo.ts` (+ `useNextUp` in `playerApi.ts`), so `repo.ts` stays untouched.
- **Opened on a day the routine isn't due** (Start on Routines works for every routine): the player shows "Nothing set for today" with Close instead of an empty list. A deleted routine shows "Routine not found".
- **Layout:** runs of plain step rows share one flush card; a problem step (expired, finished, no product) is its own card between them, so no card sits inside a card. The header is the player's own (close, name, "Evening · Step 2 of 5", ProgressRing), left-aligned so the ring fits; "Step n" is the first unticked step, or the last once all are ticked.
- **Ticking:** the whole row is the checkbox for screen readers (the visual Checkbox inside is hidden from them); the light haptic comes from the row when ticking, or from the Checkbox when its box itself is hit, never both.
- **Wait timer:** `useWaitTimer` keeps an end timestamp and re-reads the clock every 250 ms and when the app becomes active. The step it holds back is the first unticked step after the one that started it (else the first unticked). Ticking any other step ends a running wait (and starts that step's own wait if it has one); unticking the step that started it ends it too. Skip wait has no haptic; the natural end does. While the bar shows, the toast inset is the bar's height; leaving the player restores the previous inset.
- **Hand-over:** the tick that completes the routine (or All done) calls `router.replace` to `/player/[routineId]/done?from=<streak before>`; the done screen paints the old number first and counts up to the new one with Today's `useCountUp` (250 ms; Reduce Motion jumps). `restarted` is `best > current`.
- **`onRoutineCompleted(routineId, day)`** lives in `src/features/routines/events.ts` and is called from `useTickStep`'s mutation whenever a tick turns the day's log complete, so the player, the player's All done and All done on Today all reach it once per completion.
- **What comes next:** a later time of day still open today, else the first time of day due within the next 14 days (with the remembered A/B pick); time is the reminder time, else the routine's time. "Today at 21:00", "Tomorrow at 07:30", or "Thursday at 07:30". Hidden when nothing is due again.
- **Needs attention:** each expired ("SPF 50 fluid expired 2 Oct", red) or finished ("Face oil is finished") product due today, once. The "On your shopping list" part waits for task 034.
- **Hooks for later tasks** (`playerSlots.ts`, the same register pattern as `shopping/buyAgain.ts`): `registerPlayerConflicts` (task 030 returns `{ stepId, conflict: ConflictExplain }[]`; the step then shows a ConflictTag, the amber line under the list names the other side, and the tag and "Why?" open `ConflictExplainSheet`; mild when every conflict on the step is mild) and `registerAddNote` (task 038; "Add a note" is hidden until then). Buy again uses `useBuyAgain()` and is hidden until task 034 registers it; the card without a product only offers "Pick a product".
- **Pick another:** task 024's `ProductPickerSheet` is being built in parallel, so `components/StepProductPicker.tsx` is a small stand-in (skin products that aren't expired, by name). Once 024 is merged, render `ProductPickerSheet area="skin"` inside it; the player doesn't change.
- **Back to Today** uses `router.dismissTo('/')`, which closes the player modal from either screen.

Check on a real device:

- Slide up / slide down of the player, and `router.replace` to the done screen inside the player stack (no flash, no back gesture to the player).
- Wait timer: lock the phone or switch apps mid-wait and come back; the time is right and the end haptic fires once. The bar sits above the home indicator and a toast floats above it.
- Haptics on row ticks and on the box itself (one each), and that tapping the ConflictTag doesn't tick the row.
- Done screen: logo fade, streak count-up (and a jump with Reduce Motion on), "Started again" copy, Back to Today from a player opened on Routines.
- Light and dark, 360 pt width and Lithuanian (problem card buttons side by side, "Pasirinkti kitą" / "Pirkti dar kartą", the wait bar with "Praleisti laukimą").
