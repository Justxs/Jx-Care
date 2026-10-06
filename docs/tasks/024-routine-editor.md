# 024 Routine editor, step editor and product picker

**Phase:** F. Routines and Today · **Depends on:** 023 · **Spec:** R2 (fields, step rows, conflict panel, unsaved changes), R3, R4, Motion (dragging a step) · **Design:** [screens.md](../design/screens.md) RoutineEditorScreen, StepEditorSheet, ProductPickerSheet

## Goal

Creating and editing a skin routine: its name, time of day, days, reminder and an ordered, drag-to-reorder list of steps, each with its own product, note, schedule and wait.

## Scope

In: `npx expo install react-native-draggable-flatlist` (check it works with Reanimated 4 and the new architecture; if it doesn't, build the reorder with Reanimated + Gesture Handler and note it). Files: `src/features/routines/screens/RoutineEditorScreen.tsx`, `components/StepRow.tsx`, `components/StepEditorSheet.tsx`, `src/features/products/components/ProductPickerSheet.tsx` (shared with hair tasks and shopping).

### R2 Routine editor (`/routines/[id]`, `id = new` with pre-fill from the starter)

- `ScreenHeader` with back and the text action "Save" (forms save with a word); the form also has a bottom "Save routine" button. Use `useAppForm` with task 022's zod schema.
- Fields per the R2 table: Name; Time of day chips Morning / Evening / Custom (Custom reveals a name and a default time; Morning defaults `sortTime` 07:00, Evening 21:00); Days: `WeekdayPicker` plus an "Every day" shortcut; Reminder: switch + `TimeField` (switching it on for the first time ever calls task 021's `askForReminders`; task 027 does the scheduling).
- **Steps:** a reorderable list. Each `StepRow`: order number, `ProductThumb` + product name (or "Pick a product later" in amber when empty), schedule chip if not every time ("Tue, Fri" / "Every 3 days"), wait chip ("1 min"), `ConflictTag` (mild for every-few-days steps) when task 030 reports one. Drag handle (`grip-vertical`, spoken "Reorder step"): the dragged row lifts (scale 1.03, `shadow-raised`) and others slide aside. Tap: step editor. Swipe: delete (row collapses). "+ Add step" opens the step editor for a new step.
- **Conflict panel** at the bottom (`Collapsible`, animates its height open): leave the slot and a `useEditorConflicts(draft)` hook that returns no hits for now; task 030 fills it in.
- Save validates (at least one day, at least one step), writes with `useSaveRoutine` and pops back with the toast "Evening A saved".
- **Unsaved changes:** back or swipe-back with a dirty form asks Discard / Keep editing.
- Edit mode adds Delete routine (danger, ghost) at the bottom with the same dialog as task 023.

### R3 Step editor (sheet)

- Product (opens the product picker; Skin or Both products only), note ("2 drops", max 60), schedule `ToggleGroup` Every time (default) / Set days / Every few days. Set days shows a `WeekdayPicker` limited to the routine's days; Every few days shows "Repeat every (days)" (2–60) and a start date (default today). The schedule panels cross-fade inside a min-height box so the sheet doesn't jump. Wait after step chips: none, 30 s, 1, 2, 5, 10, 15, 20 min.
- Footer "Save step". Changes go into the editor's draft, not the database, until the routine is saved.

### R4 Product picker (sheet, reusable)

- Props: `area` filter (`skin` includes both; `hair` includes both; `any`), `multiple` (hair tasks pick several), `selected`, `onPick`.
- Search, category filter chips, rows with `ProductThumb`, name, brand and status `Badge` (expired products show the Expired badge and stay pickable).
- "+ Add new product" opens the product form (full screen) and, on save, returns with the new product selected.

Out:

- Conflict results: 030. Routine reminder scheduling: 027. Hair task editor reuse of the picker: 032.

## Acceptance criteria

- [ ] Create a routine from a template and from scratch; edit name, time of day, days, reminder and steps; reorder by drag; delete a step; all saved in one go.
- [ ] Step schedules: Set days limited to routine days; Every few days with start date; wait chips; values round-trip through save and reopen.
- [ ] Product picker filters by area, searches, shows expired products with their badge and returns a newly added product selected.
- [ ] Leaving with changes asks first; validation messages appear in place.
- [ ] Dragging feels smooth (lift, others slide aside); Reduce Motion turns the lift into a fade.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
