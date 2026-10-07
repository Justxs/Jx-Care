# 024 Routine editor, step editor and product picker

**Phase:** F. Routines and Today · **Depends on:** 023 · **Spec:** R2 (fields, step rows, conflict panel, unsaved changes), R3, R4, Global UI rules (Touch, Choices, Explaining), Motion (dragging a step) · **Design:** [screens.md](../design/screens.md) RoutineEditorScreen, StepEditorSheet, ProductPickerSheet, ExplainSheets; [components.md](../design/components.md) RadioList, SelectField

## Goal

Creating and editing a skin routine: its name, time of day, days, reminder and an ordered, drag-to-reorder list of steps, each with its own product, note, schedule and wait.

## Scope

In: `npx expo install react-native-draggable-flatlist` (check it works with Reanimated 4 and the new architecture; if it doesn't, build the reorder with Reanimated + Gesture Handler and note it). Files: `src/features/routines/screens/RoutineEditorScreen.tsx`, `components/StepRow.tsx`, `components/StepEditorSheet.tsx`, `src/features/products/components/ProductPickerSheet.tsx` (shared with hair tasks and shopping).

### R2 Routine editor (`/routines/[id]`, `id = new` with pre-fill from the starter)

- `ScreenHeader` with back and the title only; Save never goes in the header. "Save routine" is a full-width button in a bar pinned to the bottom, in thumb reach. Use `useAppForm` with task 022's zod schema.
- Fields per the R2 table: Name; Time of day chips Morning / Evening / Custom (Custom reveals a name and a default time; Morning defaults `sortTime` 07:00, Evening 21:00); Days: `WeekdayPicker` plus an "Every day" shortcut; Reminder: switch + `TimeField` (switching it on for the first time ever calls task 021's `askForReminders`; task 027 does the scheduling).
- **Steps:** a reorderable list. Each `StepRow`: order number, `ProductThumb` + product name (or "Pick a product later" in amber when empty), schedule chip if not every time ("Tue, Fri" / "Every 3 days"), wait chip ("1 min"), `ConflictTag` (mild for every-few-days steps) when task 030 reports one. Drag handle (`grip-vertical`, spoken "Reorder step"): the dragged row lifts (scale 1.03, `shadow-raised`) and others slide aside. Tap: step editor. Swipe: delete (row collapses). "Add step" opens the step editor for a new step.
- **Conflict panel** at the bottom of the form (`Collapsible`, animates its height open): leave the slot and a `useEditorConflicts(draft)` hook that returns no hits for now; task 030 fills it in. The panel ends with the link "What does mild mean?", which opens the Mild conflict sheet (the ExplainSheets built in task 025; task 030 wires it with the panel content).
- Save validates (at least one day, at least one step), writes with `useSaveRoutine` and pops back with the toast "Evening A saved".
- **Unsaved changes:** back or swipe-back with a dirty form asks Discard / Keep editing.
- Edit mode adds Delete routine (danger, ghost) at the end of the form, above the bottom bar, with the same dialog as task 023.

### R3 Step editor (sheet)

- Product (opens the product picker; Skin or Both products only), note ("2 drops", max 60), schedule as a `RadioList` (task 008; a 3-way segmented control does not fit the Lithuanian labels) with one line each: Every time (default, "Each time the routine runs") / Set days ("Only on the days you pick") / Every few days ("For example every 3 days"). Set days shows a `WeekdayPicker` limited to the routine's days; Every few days shows "Repeat every (days)" (2–60) and a start date (default today). The schedule detail cross-fades inside a min-height box so the sheet doesn't jump. Wait after this step is a `SelectField` (task 009): None, 30 s, 1, 2, 5, 10, 15, 20 min.
- Footer "Save step". Changes go into the editor's draft, not the database, until the routine is saved.

### R4 Product picker (sheet, reusable)

- Props: `area` filter (`skin` includes both; `hair` includes both; `any`), `multiple` (hair tasks pick several), `selected`, `onPick`.
- Search at the top, then **Recent** (up to 5 products last used in any step), then every product by name, narrowed as you type. No category chips. Rows show `ProductThumb`, name, brand and status `Badge`.
- Expired products sit in a group "Can't be picked" with their red Expired badge and the line "Expired products stay out of new steps. Buy it again from Products." Their rows are disabled (`accessibilityState.disabled`) and say why in their spoken label; their text is not faded.
- "Add new product" opens Add product (the short form, task 014) and, on save, returns with the new product selected.

Out:

- Conflict results: 030. Routine reminder scheduling: 027. Hair task editor reuse of the picker: 032.

## Acceptance criteria

- [ ] Create a routine from a template and from scratch; edit name, time of day, days, reminder and steps; reorder by drag; delete a step; all saved in one go.
- [ ] Step schedules: a radio list with a line per option; Set days limited to routine days; Every few days with start date; wait as a select; values round-trip through save and reopen.
- [ ] Save routine sits in the bottom bar and there is no Save in the header.
- [ ] Product picker filters by area, shows Recent, searches by name, lists expired products under "Can't be picked" where they can't be picked, and returns a newly added product selected.
- [ ] Leaving with changes asks first; validation messages appear in place.
- [ ] Dragging feels smooth (lift, others slide aside); Reduce Motion turns the lift into a fade.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
