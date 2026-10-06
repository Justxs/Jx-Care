# 023 Routines list and templates

**Phase:** F. Routines and Today · **Depends on:** 010, 022 · **Spec:** R1 (Skin), R2 "Starting a routine", Empty states (Routines, skin) · **Design:** [screens.md](../design/screens.md) RoutinesScreen, RoutineStarterSheet; [components.md](../design/components.md) WeekdayDots, ConflictTag

## Goal

The Routines tab's Skin side: routines grouped by time of day with their schedule at a glance, and the template sheet that makes starting a routine quick.

## Scope

In: `src/features/routines/screens/RoutinesScreen.tsx`, `components/RoutineCard.tsx`, `components/RoutineStarterSheet.tsx`.

- **Top:** title "Routines", `ToggleGroup` Skin / Hair (Hair shows task 032's content; until then a placeholder), + button labelled "New routine".
- **Skin:** routines grouped by time of day (Morning, Evening, then custom names, by `sortTime`), each group titled above its cards.
- **RoutineCard:** name (`body-strong`), `WeekdayDots` (soft pink scheduled days, spoken label in words), "Reminder at 07:30 · 4 steps" or "No reminder · 2 steps", `ConflictTag` when task 030 reports conflicts (render nothing until then, through a `useRoutineConflicts(id)` hook that returns `[]` for now), active `Switch` (inactive cards switch name and meta to `ink-muted`; no opacity), and a secondary "Start" button that opens the player (T2, task 026). Tap the card: editor (R2, task 024).
- **Long press:** DropdownMenu with Duplicate as variant (toast "Evening A (copy) added", new card fades in) and Delete (AlertDialog "Delete Evening A? Its history in the calendar is deleted too. This can't be undone.").
- **Empty (skin):** "No routines yet" / "Start from a template and swap in your products." / New routine (opens the starter sheet).
- **RoutineStarterSheet** (spec R2 starting a routine): Morning / Evening `ToggleGroup`, then the templates as a radio list (Evening: Treatment, Basics, Start empty; Morning: Basics, Light, Start empty). Below, the step preview from `buildFromTemplate` (task 022): each step with its product, or "Pick a product later" in amber for gaps. The preview area reserves 176 pt and cross-fades when the template changes. Footer: "Create routine" (primary), which saves nothing yet: it opens the R2 editor pre-filled (name from the template, time of day, all days, steps) where the person sets days, time and reminder and saves.
- + New routine always opens the starter sheet first.

Out:

- Editor, step editor, product picker: 024. Player: 026. Hair segment: 032. Conflict data: 030.

## Acceptance criteria

- [ ] Routines group by time of day in `sortTime` order; cards show dots, reminder text, step count and the active switch, which persists.
- [ ] Duplicate and Delete work with their toast and dialog; cards animate in and out (fade + height).
- [ ] The starter sheet fills steps from the person's products by category, shows gaps in amber, doesn't jump when switching templates, and opens the editor pre-filled without saving.
- [ ] Empty state in LT and EN; light, dark and 360 pt checked.
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
