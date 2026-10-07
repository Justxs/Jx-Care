# 023 Routines list and templates

**Phase:** F. Routines and Today · **Depends on:** 010, 022 · **Spec:** R1 (Skin), R2 "Starting a routine", Global UI rules (Touch, Choices), Empty states (Routines, skin) · **Design:** [screens.md](../design/screens.md) RoutinesScreen, RoutineStarterSheet; [components.md](../design/components.md) WeekdayDots, ConflictTag, Fab, RadioList

## Goal

The Routines tab's Skin side: routines grouped by time of day with their schedule at a glance, and the template sheet that makes starting a routine quick.

## Scope

In: `src/features/routines/screens/RoutinesScreen.tsx`, `components/RoutineCard.tsx`, `components/RoutineStarterSheet.tsx`.

- **Top:** title "Routines", `ToggleGroup` Skin / Hair (Hair shows task 032's content; until then a placeholder). No add button in the header.
- **Fab** "New routine" (task 008) at the bottom right, above the tab bar; hidden while a sheet is open. The list keeps 96 pt of space at its end so the last card scrolls clear of it.
- **Skin:** routines grouped by time of day (Morning, Evening, then custom, by `sortTime`). No heading repeats a card's name: a time of day with one routine has no heading above it. Two routines at one time of day are alternatives and sit under one heading named for the time of day ("Evening, A or B") with the line "On nights both are set, you pick one on Today. A and B are never checked against each other for conflicts." (never one heading per card). Custom routines sit under "Custom".
- **RoutineCard:** name (`body-strong`), `WeekdayDots` (soft pink scheduled days, spoken label in words), "Reminder at 07:30 · 4 steps" or "No reminder · 2 steps", `ConflictTag` when task 030 reports conflicts (render nothing until then, through a `useRoutineConflicts(id)` hook that returns `[]` for now), active `Switch` (inactive cards switch name and meta to `ink-muted`; no opacity), and a secondary "Start" button that opens the player (T2, task 026). Tap the card: editor (R2, task 024).
- **Long press:** DropdownMenu with Duplicate as variant (toast "Evening A (copy) added", new card fades in) and Delete (AlertDialog "Delete Evening A? Its history in the calendar is deleted too. This can't be undone.").
- **Empty (skin):** "No routines yet" / "Start from a template and swap in your products." / New routine (opens the starter sheet).
- **RoutineStarterSheet** (spec R2 starting a routine): Morning / Evening `ToggleGroup`, then the templates as a `RadioList` (task 008; round marks, so they never look like checkboxes): Evening: Treatment, Basics, Start empty; Morning: Basics, Light, Start empty. Below, the step preview from `buildFromTemplate` (task 022): each step with its product, or "Pick a product later" in amber for gaps. The preview area reserves 176 pt and cross-fades when the template changes. Footer: "Create routine" (primary), which saves nothing yet: it opens the R2 editor pre-filled (name from the template, time of day, all days, steps) where the person sets days, time and reminder and saves.
- New routine (the Fab and the empty state) always opens the starter sheet first.

Out:

- Editor, step editor, product picker: 024. Player: 026. Hair segment: 032. Conflict data: 030.

## Acceptance criteria

- [ ] Routines group by time of day in `sortTime` order; a single routine at a time of day has no heading, two at one time of day sit under "Evening, A or B" with its line; cards show dots, reminder text, step count and the active switch, which persists.
- [ ] The Fab "New routine" opens the starter sheet, and the last card scrolls clear of it.
- [ ] Duplicate and Delete work with their toast and dialog; cards animate in and out (fade + height).
- [ ] The starter sheet fills steps from the person's products by category, shows gaps in amber, doesn't jump when switching templates, and opens the editor pre-filled without saving.
- [ ] Empty state in LT and EN; light, dark and 360 pt checked.
- [ ] `pnpm check` passes.

## Decisions

- **Grouping** (`listGroups.ts`, tested): Morning, then Evening, then Custom, each in `sortTime` then id order. A time of day with one routine has no heading; two or more are one "Evening, A or B" block (three or more keep the same heading). Inactive routines are grouped like active ones, so switching one off never moves cards around. Every custom routine sits under one "Custom" heading, whatever its custom name, with no A/B line.
- **A/B line for mornings.** The spec's line says "On nights"; Morning alternatives use the same line with "On days" (`routines.list.alternativesNote`), Evening uses the spec's wording (`alternativesNoteEvening`).
- **Card.** The whole card opens the editor; for screen readers the name/days/meta block is one button whose label reads name, days in words, reminder and steps, conflict and "Off", with Duplicate as variant and Delete as accessibility actions. The Switch and Start are separate controls. Inactive cards turn name and meta `ink-muted` (meta is `ink` while active, as the task says). Start shows on inactive cards too. `useRoutineConflicts(id)` lives in `src/features/routines/useRoutineConflicts.ts` and returns `[]`; with conflicts the card shows one `ConflictTag` ("Mild conflict" only when every conflict is mild), not pressable until task 030 adds the sheet.
- **Active switch** writes the new value into the cached list before saving, so the thumb never waits; a failed save refetches the list.
- **Duplicate** toast names the copy ("Evening A (copy) added"), no Undo (the spec has none; Delete undoes it). **Delete** shows only the AlertDialog. Cards and group headings fade in and out with the shared `rowEntering` / `rowExiting` / `rowLayout` presets; the first render skips the entering fade.
- **Hair segment** is an empty-state placeholder ("Hair care tasks arrive in a later update.") until task 032, and the Fab is hidden there (032 adds "New hair task").
- **Starter sheet side.** It opens on the time of day that has no routine yet (Evening when only a Morning exists, and the other way round), otherwise by the clock: Evening from 14:00. Switching Morning / Evening selects that side's first template.
- **Starter preview.** Products come from `useProducts` (active, all areas; `buildFromTemplate` keeps skin and both). Each row shows its number, the step label ("Cleanser") and the product name, the rinse note, or "Pick a product later" in `text-warning` bold. Start empty shows "No steps yet. You add them on the next screen." The preview box is `min-h-[176px]` (three 56 pt rows) and the new template fades in while the old one fades out.
- **Create routine** saves nothing: it puts `draftFromTemplate(...)` in `routineDraftStore` (`src/features/routines/draft.ts`, TanStack Store) and pushes `/routines/new`, which the existing `[id]` route catches. Task 024 reads it with `takeRoutineDraft()` (note left in its task file). The sheet is exported so Today's first-run card (task 025) can open it too.
- No skeleton for the starter preview: the products query is usually cached; while it loads, steps show as gaps for a moment.

Check on a real device:

- Long press on a card opens the menu at the card's top right; Duplicate fades the copy in, Delete fades the card out and neighbours glide (200 ms), and the "A or B" heading appears or goes away smoothly.
- Switching templates in the starter sheet cross-fades with no jump in the sheet's height; switching Morning / Evening too.
- The Fab hides while the starter sheet is open and the last card scrolls clear of it; toasts float above the tab bar.
- Light, dark and 360 pt widths, with Lithuanian strings (the A/B line and the card meta wrap without overlapping); a native Lithuanian read of the new `routines.*` strings.
- TalkBack / VoiceOver: card label, Duplicate and Delete actions, the switch's label.
