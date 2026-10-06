# 026 Routine player

**Phase:** F. Routines and Today · **Depends on:** 022, 025 · **Spec:** T2, refinement 11, sequence 4, Words and copy (no faded text, conflict tag) · **Design:** [screens.md](../design/screens.md) RoutinePlayerScreen

## Goal

The full-screen flow for doing a routine at the bathroom shelf: tick steps, wait between them when a product needs it, handle expired or finished products, and finish with the updated streak.

## Scope

In: `src/features/routines/screens/RoutinePlayerScreen.tsx`, `components/PlayerStep.tsx`, `components/ProblemStepCard.tsx`, `components/WaitBar.tsx`, `useWaitTimer.ts`.

- Route `/player/[routineId]` (full-screen modal, slide up 300 ms, close slides down). Opened from Today, Routines or a routine reminder. It shows today's app day.
- **Header:** routine name, time of day, close (X), "Step 2 of 5" (`tabular-nums`) and a `ProgressRing`.
- **Steps due today** in order (`dueSteps`, task 007); steps not due today are hidden. Each row: `ProductThumb`, name, brand, note ("2 drops"), `Checkbox` (the whole row is pressable, 44 pt+). Ticking is optimistic (`useTickStep`), fills in 150 ms with a light haptic. Done steps keep their row and turn the name `ink-muted` (no opacity).
- **Wait timer:** ticking a step with `waitSeconds` starts a countdown in a **fixed bar floating at the bottom** ("Wait 1:00 before the next step", `tabular-nums`) with "Skip wait". Until it ends, the next step's text turns `ink-muted` and its caption reads "Next, after the wait" (text is never faded with opacity). The timer is based on an end timestamp so it stays right if the app is backgrounded; when it ends, a light haptic. Toasts float above the bar.
- **Conflict on a step:** a tappable `ConflictTag` (task 030 provides `dayConflicts` results; the hook returns none until then); an amber line under the list names the other routine and the risk ("Vitamin C serum conflicts with the glycolic acid toner in tonight's Evening B. Using both on one day can irritate."). Tapping the tag scrolls to and highlights that line.
- **Expired or finished product** (refinement 11, v14): the step becomes a card: "Step 4 · SPF 50 fluid", a red "Expired 2 Oct" or neutral "Finished" `Badge`, the line "Pick another product for this step, or tick it to use this one today.", and two buttons: Pick another (opens the product picker, task 024; `useReplaceStepProduct` changes the routine's step) and Buy again (task 034; hidden until it exists). The card still has its checkbox.
- **Step with no product** ("Pick a product later"): same card style with "Pick a product" only.
- **All ticked:** a calm success state (a check, no confetti), "Skin streak: 12 days" counting up (instant with Reduce Motion), and Done (closes). Ticks are saved as they happen; leaving mid-way keeps them.
- Call `onRoutineCompleted(routineId, day)` (no-op hook) so task 027 can cancel today's pending reminder.

Out:

- Reminder scheduling and snooze: 027. Conflict data: 030. Buy again: 034.

## Acceptance criteria

- [ ] Steps due today show in order; ticking and unticking save immediately and update Today and the streak.
- [ ] Wait timer: countdown bar floats, next step text is muted with "Next, after the wait", Skip wait ends it, and the time is right after backgrounding (test `useWaitTimer` with fake timers).
- [ ] Expired and finished products show the problem card; Pick another replaces the product in the routine.
- [ ] Finishing shows the success state with the new streak; leaving mid-way keeps ticks.
- [ ] No text uses opacity; light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
