# 032 Hair setup and hair task editor

**Phase:** I. Hair · **Depends on:** 023, 031 · **Spec:** R1 (Hair), R5 (quick setup, editor), Empty states (Routines, hair) · **Design:** [screens.md](../design/screens.md) HairScreen, HairSetupSheet, HairTaskEditorScreen

## Goal

The Hair side of the Routines tab: wash and other-care tasks with their next due dates, the quick setup sheet for first-time use, and the full editor.

## Scope

In: `src/features/hair/screens/HairListScreen.tsx` (rendered by the Routines tab's Hair segment), `HairTaskEditorScreen.tsx`, `components/HairSetupSheet.tsx`, `components/HairTaskRow.tsx`.

### R1 Hair segment

- Two groups, **Washes** and **Other care**, each titled above its card.
- `HairTaskRow`: name, frequency ("Every 3 days", "Every 8 weeks", "Mon, Thu"), next due date ("Next 9 Oct"; "Due today"; "Overdue 1 day" in `warning`), last done as a date ("Last 18 Aug", never "7 weeks ago"). Icon per kind, bare `ink-muted`: `droplets` (wash), `scissors` (trim), `palette` (colour), `flask-round` (mask), none for other. Tap: editor.
- "+ New hair task" (header + button).
- **Empty:** "Hair care is not set up" / "Tell Jx-Care how often you wash your hair." / "Set up hair care" (opens the quick setup sheet).

### Quick hair setup (sheet)

- Wash frequency chips: Every day, Every 2 days, Every 3 days, Twice a week, Once a week, Other (Other opens the full editor instead).
- Last wash chips: Today, Yesterday, 2 days ago, Pick a date (`DateField`).
- Live "Next wash: Friday, 9 Oct" line (fixed height) from `quickSetupToTask` + `nextDue` (task 007).
- "Also track trims" switch (every 8 weeks; "Trims don't count toward your hair streak.").
- Footer "Save" → `useQuickHairSetup` (task 031). Opened from the Hair empty state and Today's setup row 3 (replace task 025's temporary link).

### R5 Hair task editor (`/routines/hair/[id]`, `new` for a new task)

- Fields per the R5 table: Type `ToggleGroup` Wash / Other care; for Other care, a kind picker (Trim, Colour, Mask, Other) that sets `otherKind` and the default name; Name; Products (washes only; the product picker from task 024 in `multiple` mode, Hair or Both products) shown as chips; Frequency: Every few days ("Repeat every (days)") / Set days (`WeekdayPicker`) / for Other care also Every few weeks; Last done (`DateField`, ≤ today, default today); Reminder switch + `TimeField` (first time asks via `askForReminders`, task 021).
- Preview line "Next due: Friday, 9 Oct" (fixed height). A caption under Type: washes count toward the hair streak, other care doesn't.
- Save (header "Save" and bottom "Save task"), Delete (edit mode, dialog), unsaved changes guard.

Out:

- Hair done sheet, Today rows, hair calendar, reminders and streak chip: 033.

## Acceptance criteria

- [ ] Quick setup creates the wash task (and the trim task when on) with the right next due date for each frequency chip, including "Twice a week" → Mon/Thu.
- [ ] The editor creates and edits washes and other care; products only for washes; preview line matches `nextDue`.
- [ ] Rows show frequency, next due (with overdue in warning colour) and last done as a date.
- [ ] Empty state and setup reachable from Today; light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
