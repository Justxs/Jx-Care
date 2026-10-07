# 024 Routine editor, step editor and product picker

**Phase:** F. Routines and Today · **Depends on:** 023 · **Spec:** R2 (fields, step rows, conflict panel, unsaved changes), R3, R4, Global UI rules (Touch, Choices, Explaining), Motion (dragging a step) · **Design:** [screens.md](../design/screens.md) RoutineEditorScreen, StepEditorSheet, ProductPickerSheet, ExplainSheets; [components.md](../design/components.md) RadioList, SelectField

## Goal

Creating and editing a skin routine: its name, time of day, days, reminder and an ordered, drag-to-reorder list of steps, each with its own product, note, schedule and wait.

## Scope

In: `pnpm expo install react-native-draggable-flatlist` (check it works with Reanimated 4 and the new architecture; if it doesn't, build the reorder with Reanimated + Gesture Handler and note it). Files: `src/features/routines/screens/RoutineEditorScreen.tsx`, `components/StepRow.tsx`, `components/StepEditorSheet.tsx`, `src/features/products/components/ProductPickerSheet.tsx` (shared with hair tasks and shopping).

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
- [ ] Light, dark, 360 pt and Lithuanian checked; `pnpm check` passes.

## Decisions

- **No react-native-draggable-flatlist.** It isn't installed (workers may not install packages) and its v4 targets older Reanimated APIs. The reorder is built with Reanimated 4 + Gesture Handler in `components/StepList.tsx`: a Pan on the `grip-vertical` handle (starts at once, the screen stops scrolling while dragging), the row follows the finger with scale 1.03 and a raised shadow that fades in under it, the others slide aside by the dragged row's measured height (200 ms), and on release the row settles into its slot (150 ms) before the list is reordered. Rows can differ in height (Lithuanian wraps), so the maths in `reorder.ts` (tested, worklets) uses measured heights. Reduce Motion: no scale or shadow, the row fades to 85 % and the others jump. Screen readers get Move up / Move down actions on the row and on the handle (spoken "Reorder step"), plus Delete on the row.
- **Swipe to delete** uses the same `ReanimatedSwipeable` as product rows (red Delete action); the row collapses its height and fades (200 ms) before it leaves the list. No toast or Undo: nothing is saved until Save routine, and leaving asks first.
- **Steps not saved yet** get temporary negative ids (`editor.ts`), so every row keeps a stable key while dragging; `toSaveInput` turns them back into `null` (new steps) for `saveRoutine`.
- **Draft from the starter** is read with `routineDraftStore.state` while rendering and cleared with `takeRoutineDraft()` in an effect, so a second render never loses it. Editing a saved routine starts the form from the first load only; later refetches never reset it.
- **Step problems on the row.** Errors of a step whose editor is closed (days the routine no longer runs on, after the routine's days change) show in red under that step's row, and Save shows them via the schema. Set days in the step editor disables days the routine doesn't run on (`WeekdayPicker` got an `allowed` prop; a picked day outside it stays tappable so it can be cleared).
- **Step editor.** The note field is capped at 60 characters as the task says (the schema from 022 allows 100, so older notes still save). Every few days pre-fills the start date with today and leaves "Repeat every (days)" empty with a "3" placeholder; the two fields share one row so the schedule detail box is one field tall (`min-h-[96px]`) and the radio list never jumps. The wait is a `SelectField`; with eight options it opens its own sheet, which `@gorhom/bottom-sheet` stacks over the step editor (`switch`) and restores after.
- **Reminder switch** starts at the routine's own time (07:00, 21:00 or the custom time) and calls `onRoutineReminderSwitchedOn()` in `api.ts` (no-op) where task 021 calls `askForReminders()` (note left in 021). Scheduling is task 027 via `onRoutineChanged`.
- **Time of day** chips are a single-choice `ChipGroup`. Custom reveals "Name of this time" (max 30) and "Usual time" (the `sortTime`, hint "Sets its place on Today."). "Every day" is a chip under the weekday toggles, selected when all seven are on.
- **Delete routine** in edit mode is a ghost-style danger button (trash icon, red text) at the end of the form, with the same dialog as task 023; it pops back and shows the same "Evening A deleted" toast with Undo as R1. Deleted steps (saved, or removed since the editor opened) are listed under Add step with Restore, which puts the step back at the end; Save makes it count again.
- **Conflicts:** `useEditorConflicts(draft)` returns `[]`; `EditorConflictPanel` is in place (closed) with "You can still save." and "What does mild mean?" (no-op until 030; note left in 030). Step rows show a `ConflictTag` per hit.
- **Product picker (R4)** `src/features/products/components/ProductPickerSheet.tsx`: props `open`, `onClose`, `area` (`skin` / `hair` include both, `any` lists all), `multiple`, `selected`, `onPick(ids)`, `onAddNew`. Single choice picks on tap and closes; multiple toggles rows (checkboxes) and Done returns the whole selection. Recent comes from `useRecentStepProducts` (`any` merges skin and hair) and hides while searching. Expired products sit in "Can't be picked" at the end, disabled, with the reason in their spoken label and their red badge. Strings are under `routines.picker.*`.
- **Add new product from the picker** (`pickReturn.ts`): the picker closes, calls `onAddNew` (the caller hides any sheet under it, which would float over the form) and pushes `/product-form` with the area pre-filled. The product form calls `productAddedForPick({ id, area })` after adding (one line in `ProductFormScreen`), and the waiting picker picks it (the first one only, with Save and add another; a product of another area isn't picked). The routine editor reopens the step editor when it regains focus, with the new product already set, and calls `endAddProductForPick()` so a product added later somewhere else never lands in the step (hair task editor and shopping should do the same).
- Step products in the editor come from the routine's own step products (finished ones too, shown with a Finished badge) plus every active product, so a product picked or added while editing has its name and photo at once.

Check on a real device:

- Dragging a step: lift, shadow, neighbours sliding aside, the settle into the slot, and no flicker when the list reorders after the drop (iOS and Android, release build); the screen doesn't scroll while dragging; the drag works near the top and bottom of a long list (no auto-scroll while dragging).
- Reduce Motion on: the lift is a fade and others jump.
- Swipe left on a step shows Delete; the row collapses smoothly and the rows below glide up.
- The step editor sheet with the wait select and the iOS date sheet stacked on top: the step editor comes back after each.
- Picker → Add new product → save: the product form is on top (no sheet floating over it), and on return the step editor reopens with the new product. Cancelling Add product also brings the step editor back.
- Keyboard: name, custom name and step note scroll into view; the bottom bar rides above the keyboard.
- Light, dark, 360 pt and Lithuanian (time-of-day chips, schedule radio list, step rows with long product names and chips wrapping); a native Lithuanian read of the new `routines.editor.*`, `routines.step.*` and `routines.picker.*` strings.
- TalkBack / VoiceOver: step row labels, Move up / Move down / Delete actions, "Reorder step", disabled expired rows reading their reason.

Note from task 023: "Create routine" in the starter sheet calls `setRoutineDraft(draftFromTemplate(...))` (`src/features/routines/draft.ts`) and pushes `/routines/new` (`NEW_ROUTINE_ID`), which the existing `app/(tabs)/routines/[id].tsx` route catches. The editor should treat `id === 'new'` as a new routine and start from `takeRoutineDraft()` (it clears the draft), falling back to `emptyRoutineForm()` when there is none. Nothing is saved before the editor saves. The editor is dirty from the start for a draft, so leaving asks Discard / Keep editing.
