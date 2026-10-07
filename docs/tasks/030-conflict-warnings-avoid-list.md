# 030 Conflict warnings and avoid list

**Phase:** H. Conflicts · **Depends on:** 024, 026, 029 · **Spec:** Words and copy (Conflict tag), refinements 3 and 5, Global UI rules (Explaining, Destructive actions), R1 card, R2 step rows and conflict panel, T1 card, T2 conflict line, S4, P1/P2 avoid badge, P3 avoid warning, P4 chip marks, sequence 5 · **Design:** [components.md](../design/components.md) ConflictTag, Fab; [screens.md](../design/screens.md) RoutineEditorScreen, RoutinePlayerScreen, AvoidListScreen, ExplainSheets

## Goal

Turn the conflict rules and the avoid list into warnings everywhere they matter, always as the amber ConflictTag for conflicts and the red Avoid badge for avoided ingredients, never as colour-only dots.

## Scope

In: `src/features/conflicts/hooks.ts` (the hooks earlier tasks left as stubs), `src/features/conflicts/screens/AvoidListScreen.tsx`, `src/features/conflicts/avoidRepo.ts` + tests. The S3 mild intro line and New rule Fab are in task 029.

### Conflict hooks (replace the stubs)

- `useWeeklyConflicts()`: memoised `weeklyConflicts(conflictInput)` (task 007/029), recomputed when routines, products' ingredients or rules change (query key depends on `qk.routines.all`, `qk.products.all`, `qk.conflicts.all`).
- `useRoutineConflicts(routineId)` → hits for that routine (R1 card tag; mild when all its hits are mild).
- `useEditorConflicts(draft)` → `routineConflictSummary` for the **unsaved** draft (task 007: pass the input with the draft in place of the saved routine).
- `useDayConflicts(day)` → `dayConflicts` for Today's cards and the player.

### Where they show

| Place | What |
| --- | --- |
| R1 routine card (023) | `ConflictTag` ("Conflict" / "Mild conflict") under the meta line; tapping opens the conflict sheet (the Mild conflict sheet for a mild tag) |
| R2 step rows (024) | `ConflictTag` next to the schedule chips on each step in a conflict; tapping opens the same sheets as on R1 |
| R2 conflict panel (024) | `Collapsible` that opens after the draft changes: "2 conflicts this week. You can still save.", then one line per merged hit: "Retinol (step 3) × Glycolic acid in Evening B, Tue" with "mild" for every-few-days steps; plus, when the routine has alternates, "Evening A is the other evening choice, so it is not compared." The panel ends with "What does mild mean?", which opens the Mild conflict sheet. Saving is never blocked |
| T1 routine card (025) | `ConflictTag` when the chosen routine has a conflict today; tapping opens the conflict sheet ("Why this warning": the pair, where and on which days they meet, the rule's note, and that A/B alternatives are never compared; Edit the routine or see the rule) |
| T2 player (026) | Tappable `ConflictTag` on each step in a conflict today, and the amber line under the list naming the other routine and the rule's note, ending with "Why?", which opens the conflict sheet |
| P4 ingredient chips (014) | Small link icon on chips that appear in any rule |
| P2 ingredient chips (015) | Same link icon |

The conflict sheet and the Mild conflict sheet are the ExplainSheets built in task 025; this task opens them and passes the hit data (the pair, routines, days and the rule's note). A mild conflict means an every-few-days step only meets the other step on some days; on those days it is a normal Conflict. Rules have no strength of their own.

A/B alternates at one time of day are never compared with each other (enforced in task 007; check it end to end here).

### Avoid list (S4 + badges)

- `avoidRepo.ts`: `listAvoidItems(db)` with "in 1 product" counts (or "in no products"), `addAvoidItem(db, { kind, refId, note })`, `removeAvoidItem(db, id)` (returns the removed row), `restoreAvoidItem(db, row)` (for Undo), `productsWithAvoided(db)`. Tests.
- **S4 screen:** rows (ingredient or group, note "allergic", "in 1 product" warning count or "in no products"); the `Fab` "Add ingredient" (task 008) opens a picker of ingredients and groups (or type a new ingredient name, which creates it) with a note field. Removing a row with × collapses it (200 ms) and shows the toast "Parfum removed" with Undo, which puts it back in the same place. Below the list, "Products that contain these" with `ProductRow`s. Empty: "Nothing to avoid yet" / "Add ingredients that irritate you. Products that contain them get a red Avoid badge." / Add ingredient.
- **Badges and warnings:** fill task 012's `avoid` flag (P1 rows and the Avoid filter), the red Avoid badge on P2, red chips in P2/P4, and the P3 save warning and "Save anyway / Edit ingredients" dialog (task 014's slot) using `avoidMatches` / `parsedLinesAvoidMatches`.

Out:

- Rules and groups management: 029.

## Acceptance criteria

- [ ] End-to-end test over a seeded database: retinol in Evening A (Mon) and an AHA product in Morning (Mon) shows tags on both R1 cards, both steps, Monday's Today card and player; Evening A and Evening B on the same day never flag each other; an every-3-days step shows "Mild conflict".
- [ ] The editor panel updates for unsaved changes and says saving is allowed.
- [ ] Avoid list: adding a group marks every product with a member ingredient (P1 badge, filter, P2 badge, red chips); the product form asks to confirm.
- [ ] Removing an avoid entry shows "Parfum removed" with Undo, and Undo puts it back in the same place.
- [ ] Every Conflict tag and "Why?" opens the conflict sheet; every Mild conflict tag and "What does mild mean?" opens the Mild conflict sheet.
- [ ] No conflict shown as a colour-only dot anywhere; tags have 44 pt hit areas.
- [ ] Light, dark, 360 pt and Lithuanian checked; `pnpm check` passes.

## Decisions

- **One cached read.** `conflictDataQuery()` (`qk.conflicts.input`, in `src/features/conflicts/hooks.ts`) holds `conflictInput`, the names the warnings show (products, ingredients, groups, rule notes) and `weeklyConflicts` worked out once. Routine mutations now invalidate `qk.conflicts.all` (one line in the routines `invalidate()`), products already did, and conflicts/avoid mutations did too, so `useRules()` lost its `refetchOnMount: 'always'` stopgap. 029's unused `useConflictInput()` is replaced by it. Today's prefetch fetches it, so the Today tags paint with the cards.
- **Hooks.** `useWeeklyConflicts`, `useDayConflicts(day)`, `useRoutineConflicts(routineId)` (R1), `useDayRoutineConflicts(routineId, day)` (T1, T2), `useEditorConflicts(draft)` (R2) and `useIngredientInRule()` (chips). Pure helpers that turn hits into tags, sheet data and panel lines are in `warnings.ts` (tested); `withDraftRoutine`, `ruleTokens` and `ingredientInRules` were added to `src/lib/conflicts.ts`. `src/features/routines/useRoutineConflicts.ts` now only re-exports these.
- **A pair inside one routine** (two steps of the same routine) tags both steps; the editor panel lists it once ("Retinol (step 2) × Glycolic acid (step 1), Mon"); the player shows one amber line per step.
- **Which sheet a tag opens.** A tag is "Mild conflict" only when every conflict behind it is mild, and then opens the Mild conflict sheet about the every-few-days step ("Retinol serum runs every 3 days"). Otherwise it opens "Why this warning" for the first full conflict (one pair per sheet). "What does mild mean?" in the editor names the first mild step, or reads the general line without one.
- **Sheet buttons.** "Edit the routine" shows on R1 and Today (opens `/routines/<id>`), not inside the editor; "See the rule" opens S3 (it can't open one rule yet). Both navigate after the sheet has closed. The player keeps its own sheet without buttons (task 026).
- **Player line.** With a rule note: "Retinol serum conflicts with AHA toner in Morning. Can cause flushing." (notes get a closing full stop). Without one, task 026's general line stays.
- **Draft in the editor.** The unsaved routine replaces the saved one (new routines stand in as id −1, draft steps as negative ids), and is compared with every saved routine. A switched-off routine has no conflicts, as on R1. The panel adds "Evening A is the other evening choice, so it is not compared." when the draft has alternates; `EditorConflictPanel` got an `alternatives` prop and `StepRow`'s conflict an `onPress` (plus a "Why this warning" accessibility action, since the row is one accessible element).
- **R1 card.** The tag moved out of the card's accessible info block so screen readers reach it as its own button ("Conflict. Tap for details."); the card's spoken label no longer repeats the word.
- **Chips.** P2 detail, P3 form and P4 sheet chips show the link icon when the ingredient, or its group, is on either side of any rule (whether or not a routine hits it). Avoid badges, the Avoid filter, red chips and the P3 dialog were already built by 012–015; a group on the list reaches them through `avoidContext`'s group map (tested).
- **Avoid list.** Moved to `src/features/conflicts/screens/AvoidListScreen.tsx` (the `ingredients` placeholder folder is gone). Rows are oldest first; Undo re-inserts the row with its own id, so it returns to the same place (skipped when the ingredient or group is gone, or was added again). Adding an item already on the list keeps its place and only takes the new note. Notes are up to 60 characters. Counts are products in use (not finished), "In 1 product" / "In no products" in sentence case like S3's "In 2 routines"; counts are red when above 0. "Products that contain these" lists products in use by name with `ProductRow`; empty: "None of your products contain these.".
- **Avoid list queries** sit under `qk.products.all` (`['products', 'avoidList', …]`) because they depend on products as much as on the list; avoid changes invalidate `qk.avoid.all`, `qk.products.all` and `qk.ingredients.all` (S2's "used in" counts).
- **Add ingredient sheet.** Search shows ingredients and groups together (groups first, as in S3) minus what is already listed; a typed name that matches no ingredient offers "Add “Linalool” as a new ingredient", which creates it. "Change" goes back to the search. The Fab hides while the list loads and when the empty state shows (one filled button).

### Check on a real device

- R1 card: tapping the Conflict tag opens the sheet and doesn't also open the editor; long press on the card still opens the menu. TalkBack/VoiceOver reach the tag as its own button.
- R2: the tag on a step row opens its sheet without starting a drag or opening the step editor; the conflict panel grows smoothly as lines are added or removed while editing, and the alternatives line wraps.
- Today: the tag under the meta line opens the sheet; "Edit the routine" switches to the Routines tab and opens the editor after the sheet has slid away.
- Player: the amber line with a long rule note wraps under the icon; "Why?" opens the sheet above the full-screen player.
- S4: × collapses the row (200 ms) while the rows below glide up; Undo fades it back in its place; the toast floats above the tab bar. The Add ingredient sheet: search field gets focus, the keyboard doesn't cover the results, and the sheet resizes without jumping when "Change" swaps the field.
- Light and dark, 360 pt and Lithuanian: panel lines ("Retinol (2 žingsnis) × …"), "Produktai, kuriuose jų yra", the avoid row counts and the sheet's create row wrap without truncation.

Note from task 024: the editor's slots are ready. `useEditorConflicts(draft)` in `src/features/routines/useRoutineConflicts.ts` returns `EditorConflictHit[]` (`{ key, stepIndex, mild, text }`) for the unsaved draft (`{ id, timeOfDay, daysOfWeek, steps }`, steps in editor order); the editor turns hits into a `ConflictTag` on each step row (mild only when every hit of that step is mild) and fills `EditorConflictPanel` (`components/EditorConflictPanel.tsx`), which opens with a height animation and already says "You can still save.". Its `onExplainMild` is a no-op in `RoutineEditorScreen.tsx` (comment "Task 030 opens the Mild conflict sheet"); wire it to the ExplainSheets Mild conflict sheet. Step rows' tags are not pressable yet.
