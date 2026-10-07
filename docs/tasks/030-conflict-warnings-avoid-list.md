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
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
