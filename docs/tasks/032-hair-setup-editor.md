# 032 Hair setup and hair task editor

**Phase:** I. Hair · **Depends on:** 023, 031 · **Spec:** R1 (Hair), R5 (quick setup, editor), Empty states (Routines, hair) · **Design:** [components.md](../design/components.md) Fab; [screens.md](../design/screens.md) HairScreen, HairSetupSheet, HairTaskEditorScreen

## Goal

The Hair side of the Routines tab: wash and other-care tasks with their next due dates, the quick setup sheet for first-time use, and the full editor.

## Scope

In: `src/features/hair/screens/HairListScreen.tsx` (rendered by the Routines tab's Hair segment), `HairTaskEditorScreen.tsx`, `components/HairSetupSheet.tsx`, `components/HairTaskRow.tsx`.

### R1 Hair segment

- Two groups, **Washes** and **Other care**, each titled above its card.
- `HairTaskRow`: name, frequency ("Every 3 days", "Every 8 weeks", "Mon, Thu"), next due date ("Next 9 Oct"; "Due today"; "Overdue 1 day" in `warning`), last done as a date ("Last 18 Aug", never "7 weeks ago"). Icon per kind, bare `ink-muted`: `droplets` (wash), `scissors` (trim), `palette` (colour), `flask-round` (mask), none for other. Tap: editor.
- New hair task is the `Fab` (task 008), at the bottom right. The list keeps 96 pt at its end so the last row scrolls clear of it.
- **Empty:** "Hair care is not set up" / "Tell Jx Care how often you wash your hair." / "Set up hair care" (opens the quick setup sheet).

### Quick hair setup (sheet)

- Wash frequency chips: Every day, Every 2 days, Every 3 days, Twice a week, Once a week, Other (Other opens the full editor instead).
- Last wash chips: Today, Yesterday, 2 days ago, Pick a date (`DateField`).
- Live "Next wash: Friday, 9 Oct" line (fixed height) from `quickSetupToTask` + `nextDue` (task 007).
- "Also track trims" switch (every 8 weeks; "Trims don't count toward your hair streak.").
- Footer "Save" → `useQuickHairSetup` (task 031). Opened from the Hair empty state and Today's setup row 3 (replace task 025's temporary link).

### R5 Hair task editor (`/routines/hair/[id]`, `new` for a new task)

- Fields per the R5 table: Type `ToggleGroup` Wash / Other care; for Other care, a kind picker (Trim, Colour, Mask, Other) that sets `otherKind` and the default name; Name; Products (washes only; the product picker from task 024 in `multiple` mode, Hair or Both products) shown as chips; Frequency: Every few days ("Repeat every (days)") / Set days (`WeekdayPicker`) / for Other care also Every few weeks; Last done (`DateField`, ≤ today, default today); Reminder switch + `TimeField` (first time asks via `askForReminders`, task 021).
- Preview line "Next due: Friday, 9 Oct" (fixed height). A caption under Type: washes count toward the hair streak, other care doesn't.
- "Save task" in a bar pinned to the bottom (no Save in the header), Delete (edit mode, dialog), unsaved changes guard.

Out:

- Hair done sheet, Today rows, hair calendar, reminders and streak chip: 033.

## Acceptance criteria

- [ ] Quick setup creates the wash task (and the trim task when on) with the right next due date for each frequency chip, including "Twice a week" → Mon/Thu.
- [ ] The editor creates and edits washes and other care; products only for washes; preview line matches `nextDue`.
- [ ] Rows show frequency, next due (with overdue in warning colour) and last done as a date.
- [ ] New hair task is the Fab and Save task sits in the bottom bar; the header has no + and no Save.
- [ ] Empty state and setup reachable from Today; light, dark, 360 pt and Lithuanian checked; `pnpm check` passes.

## Decisions

- **Files:** `src/features/hair/screens/HairListScreen.tsx`, `HairTaskEditorScreen.tsx`, `components/HairSetupSheet.tsx`, `components/HairTaskRow.tsx`, `components/HairProductPickerSheet.tsx`, and `display.ts` (row words, kind icons, default names, the editor's and the setup's next-due day through `nextDue` / `quickSetupToTask`) with `display.test.ts`. Screen tests in `screens/__tests__/hair.test.tsx`. No schema change.
- **Hair segment.** `RoutinesScreen` renders `<HairListScreen />` in its Hair segment; the list owns its Fab ("New hair task", hidden while the setup sheet is open) and the setup sheet. Washes and Other care are each a `Card` with its title above; an empty group is left out. Rows are 64 pt: kind icon (a 20 pt blank keeps names aligned for plain other care), name, "Every 3 days · Last 18 Aug" and the next due on the right ("Next 9 Oct", "Due today", "Overdue 1 day" in `warning`). A task with no last done day (only after deleting all its logs) says "Not done yet".
- **Links from Today** (coordinator request): `RoutinesScreen` reads `?segment=hair|skin`, `?starter=1` (opens the skin starter sheet) and `?setup=1` (shows Hair with the quick setup open). Each link is handled once during render and the params are then cleared with `router.setParams`; switching segments afterwards never reopens the setup. Today's "Set up hair care" row should push `/routines?segment=hair&setup=1` (Today is not in this worktree; `HairSetupSheet` is also exported for use in place).
- **Quick setup.** Starts on "Every 3 days" and "Today" so the Next wash line is never empty; "Pick a date" opens a `DateField` (≤ today, starts 3 days ago) under the chips. "Other" closes the sheet and opens `/routines/hair/new`. Save parses with `quickHairSetupSchema` and calls `useQuickHairSetup`; no toast (the list or Today's row changing is the feedback).
- **Editor.** `/routines/hair/new` starts as a wash named "Wash", every 3 days, last done today. Choosing Other care preselects Trim (the commonest other care) and swaps the name only when it is empty or a default name ("Wash", "Trim", "Colour", "Hair mask"); plain "Other" has no default name. Every few weeks is offered only for other care; turning a task back into a wash turns weeks into days (8 weeks → 56 days). Frequency is a `RadioList` (three options and long LT labels), its detail (number field or `WeekdayPicker`) cross-fades in a 96 pt box. The preview line reads "Overdue since …" in `warning` when the computed due day is already past, and stays blank (same height) while the schedule is incomplete. Delete is a danger button at the end of the form (edit mode only) with an AlertDialog; the edit form keeps its loaded values so it does not blank out while leaving after Delete. Values set from code (type, kind, frequency) re-run the form's validation, because TanStack Form does not re-validate a form that already failed to submit until a field blurs.
- **Reminder** switch starts the time at 19:00. `askForReminders` (task 021) does not exist yet, so switching it on asks nothing; note left in task 033.
- **Product picker.** Task 024's shared `ProductPickerSheet` was being built at the same time, so this task has a small `HairProductPickerSheet` (Hair or Both products via `useProductsForPicker({ area: 'hair' })`, search, checkbox rows, expired ones disabled under "Can't be picked", Done hands the ids back). It has no Recent group and no "Add new product". Swap it for the shared picker in `multiple` mode once both are on main.
- **Today's setup row** (task 025) was not in this worktree, so it is not changed here.

### Check on a real device

- Hair segment: the Fab sits bottom right above the tab bar, the last row scrolls clear of it, and the Fab fades out while the setup sheet is open.
- Quick setup sheet: chips wrap without jumps in Lithuanian; the Next wash line keeps its height; "Pick a date" opens smoothly and the date picker respects "no later than today"; Save closes the sheet and the list fades in.
- Editor: Type toggle, kind chips and products open and close with the height animation; the frequency detail cross-fades without moving the fields below; the keyboard never covers the number field or the bottom bar; Android back with changes asks Discard / Keep editing.
- `?segment=hair&setup=1` from Today opens Hair with the sheet already up (no flash of Skin first).
- Light, dark, 360 pt and Lithuanian (a native read of the new `hair.*` strings, especially "serija" for streak).
