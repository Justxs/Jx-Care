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

(Write any choices you make here.)
