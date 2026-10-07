# 029 Ingredients, groups and conflict rules

**Phase:** H. Conflicts · **Depends on:** 011, 012, 022 · **Spec:** S2, S3 (list, "No conflicts", mild intro, New rule Fab, editor), Empty states (Conflicts, "Add common rules"), feature plan 7 · **Design:** [screens.md](../design/screens.md) IngredientsScreen, ConflictsScreen; [components.md](../design/components.md) Fab

## Goal

The person's own ingredient list with groups, and the conflict rules between ingredients or groups, including a starter pack of common rules. Task 030 then shows the warnings across the app.

## Scope

In: `src/features/conflicts/repo.ts`, `repo.test.ts`, `api.ts`, `commonRules.ts`, `screens/IngredientsScreen.tsx`, `screens/ConflictsScreen.tsx`, `components/ConflictRuleSheet.tsx`, `components/SidePicker.tsx`.

### Data (`repo.ts`)

| Function | Does |
| --- | --- |
| `listIngredients(db)` | Each with group, product count ("in 4 products") |
| `renameIngredient(db, id, name)` | Updates `name` and `normalizedName`; if the new normalized name already exists, merges instead |
| `setIngredientGroup(db, id, groupId \| null)` | |
| `mergeIngredients(db, keepId, mergeIds)` | Moves product links, conflict and avoid references to `keepId` (dropping duplicates), deletes the others; one transaction |
| `deleteIngredient(db, id)` | Only when used in no product, rule or avoid item |
| `listGroups(db)` / `saveGroup(db, { id?, name, memberIds })` / `deleteGroup(db, id)` | Deleting a group clears members' `groupId` and deletes rules and avoid items that point at it (the UI warns first) |
| `listRules(db)` | Rules with both sides resolved to names and kinds |
| `saveRule(db, rule)` / `deleteRule(db, id)` | A rule's two sides must differ |
| `addCommonRules(db)` | See below; idempotent (running twice adds nothing new) |
| `conflictInput(db)` | Everything `weeklyConflicts` / `dayConflicts` need (task 007): active routines, steps, product → ingredient ids, ingredient → group, rules |

### Common rules (`commonRules.ts`)

"Add common rules" creates editable groups and rules, matching existing ingredients by `normalizedName` and creating missing ones:

- Group **Retinoids**: retinol, retinal, retinyl palmitate, hydroxypinacolone retinoate, adapalene, tretinoin.
- Group **AHA/BHA**: glycolic acid, lactic acid, mandelic acid, malic acid, salicylic acid.
- Group **Vitamin C**: ascorbic acid, sodium ascorbyl phosphate, magnesium ascorbyl phosphate, ascorbyl glucoside, ethyl ascorbic acid, 3-o-ethyl ascorbic acid.
- Ingredient **benzoyl peroxide**.
- Rules: Retinoids × AHA/BHA ("Can irritate when used on the same day"), Retinoids × benzoyl peroxide ("Benzoyl peroxide can make retinoids less effective"), Vitamin C × AHA/BHA ("Can irritate when used on the same day"). Notes and group names are i18n strings at creation time.

### S2 Ingredients + groups

- `ToggleGroup` Ingredients / Groups.
- Ingredient row: name, group `Chip`, "in 4 products". Tap: sheet to rename, set group (picker), and see products (tappable to P2). Select mode (header "Select"): pick several, then "Merge" (choose which name to keep) for duplicates like "Niacinamide" + "niacinamide".
- Group row: name, member count. Tap: editor sheet listing members with add (ingredient picker with search) and remove; name field; Delete group (dialog names what goes with it).
- Search field over both lists.

### S3 Conflicts

- Rule rows: "Retinol × AHA/BHA" (a group side shows a small group icon and the word "group" in its spoken label), the note ("Can cause flushing"), and either "In 2 routines" (the number of routines where the rule currently fires, from `weeklyConflicts`) or **"No conflicts"** when its two sides never fall on the same day.
- Intro line above the rules: "Mild means one of the steps runs every few days, so they only meet on some days." Rules have no strength of their own.
- New rule is the `Fab` "New rule" (task 008), opening the editor sheet. The list keeps 96 pt at its end so the last rule scrolls clear of it.
- **Empty:** "No conflict rules" / "Start with pairs that drug labels warn about, like tretinoin with benzoyl peroxide, or write your own." / "Add common rules" (primary) and "Add a rule" (ghost).
- **Editor sheet** (`ConflictRuleSheet`): left side picker, right side picker (each searches ingredients and groups together, groups marked), note (max 120). Saving re-checks all routines and shows "Affects 2 routines" (or "Doesn't affect any routine now") in a callout that animates its height open, then closes after the person taps Done. Delete rule in the sheet for existing rules.

Out:

- Warnings on Today, Routines, the editor, the player and products, and the avoid list: 030.

## Acceptance criteria

- [ ] Repository tests: merge moves product links, rules and avoid references and removes duplicates; rename into an existing name merges; deleting a group cleans up members and rules; `addCommonRules` is idempotent and links existing ingredients by normalized name.
- [ ] S3 shows "In N routines" or "No conflicts" correctly for a seeded set of routines (A/B alternates not counted against each other).
- [ ] Editor saves and shows the affected count callout without jumping the sheet.
- [ ] Light, dark, 360 pt and Lithuanian checked; `pnpm check` passes.

## Decisions

- **Where it lives.** Everything is in `src/features/conflicts/` as the scope lists. The S2/S3 placeholders in `src/features/ingredients/screens/` are deleted and `app/(tabs)/settings/ingredients.tsx` and `conflicts.tsx` now render the new screens. The S4 placeholder (`AvoidListScreen`) stays for task 030.
- **Extra components** beyond the scope list: `IngredientSheet` (rename, group, products, delete), `GroupSheet` (group editor) and `MergeSheet` (choose the name to keep), all in `components/`.
- **"In N routines"** counts the distinct routines on either side of the rule's hits from `weeklyConflicts` (a pure `routinesPerRule()` added to `src/lib/conflicts.ts`, tested). A/B alternates are never compared, so they never add to the count. The editor's "Affects N routines" is the same count for the saved rule (`ruleRoutineCount`).
- **Rule list freshness.** Routine edits (task 022's hooks) don't invalidate `qk.conflicts.*`, so `useRules()` re-reads on every mount (`refetchOnMount: 'always'`). Task 030 should invalidate `qk.conflicts.all` from `onRoutineChanged` (or the routine hooks) once its warnings depend on it. `useConflictInput()` (`qk.conflicts.input`) is ready for 030.
- **Rules are unordered pairs.** `saveRule` refuses equal sides (`SameSidesError`) and a second rule with the same two sides either way round (`DuplicateRuleError`, shown as "This rule already exists."). Notes are tidied and cut at 120 characters; an empty note is null.
- **Rename into an existing name** merges into the existing ingredient, which takes the typed spelling. **Merge** keeps `keepId`'s group, or the first merged one's when it has none; product links that would repeat are dropped, rules that become "X × X" are deleted, repeated rule pairs and avoid items keep the oldest. The merge sheet defaults to the name in the most products.
- **Delete ingredient** shows only when nothing uses it (no product, rule or avoid item); otherwise the sheet says why it can't be deleted. Ingredients have no Fab: they come from products.
- **Groups.** An ingredient has one group, so adding a member in the group editor moves it from its old group (the picker says "In Retinoids" for those). New group is the Fab on the Groups segment. Delete group warns with the member, rule and avoid counts as saved.
- **Common rules.** Group names and notes come from i18n at creation time. A group is reused when one already has its name in any app language (EN or LT), so switching language between runs adds nothing. Members already in another group of the person's are left there (only ungrouped ones join). Rules are skipped when the pair exists, so a deleted common rule comes back on the next run. Ingredient display names are the INCI names ("Retinol", "3-O-ethyl ascorbic acid"), the same in both languages.
- **Empty S3** hides the New rule Fab: the empty state already has Add common rules (filled) and Add a rule (ghost), and a screen keeps one filled accent button. A toast confirms "Added 3 common rules".
- **Side pickers** open inline under their field (search plus up to 30 results, groups first and tagged "Group") instead of a second stacked sheet; the group editor reuses the same results list for "Add ingredient". After Save the pickers and note lock, the callout opens with `Collapsible`, and the footer button becomes Done.
- **Group icon:** Lucide `Layers` (added to `src/components/ui/icon.tsx` as `layers`). A group side reads "Retinoids group" to screen readers.
- **LT counts** use the "Produktuose: 4" / "Rutinose: 2" form for every plural so no locative-plural genitive phrasing is needed.
- **Ingredient chips' conflict flag** (`IngredientPills.conflict`) is left for task 030, as the task doesn't ask for it.

### Check on a real device

- S3 editor: after Save rule, the "Affects 2 routines" callout grows the dynamic-height sheet smoothly (no jump or snap), and Done closes it.
- Inline side pickers in the rule sheet: the search field gets focus and the keyboard doesn't cover the results; the sheet grows and shrinks without jumping as the results open and close.
- The Group select (menu) inside the ingredient sheet opens above the sheet, and the Delete dialogs (rule, ingredient, group) show above their sheets.
- Tapping a product in the ingredient sheet closes the sheet and opens P2 in the Products tab.
- Light and dark, 360 pt wide, and Lithuanian: rule rows with long group names wrap ("Retinoidai × AHA/BHA"), the group chip on ingredient rows truncates, the selection bar with Merge sits above the tab bar, and the last rule clears the New rule Fab.

### Default rules and the catalogue (added 2026-10-07)

- **Default rules.** Justas asked for typical conflicts out of the box, based on scientific research (2026-10-07). The pack in `commonRules.ts` is now 9 rules, each with its sources (FDA tretinoin and adapalene labels, the OTC acne monograph 21 CFR 333.350, a tretinoin and benzoyl peroxide stability study, hydroquinone drug information); see the spec, Empty states. The old Retinoids × AHA/BHA, Vitamin C × AHA/BHA and Retinoids × benzoyl peroxide rules are gone: no label or study backs them in that breadth (adapalene is stable with benzoyl peroxide). The one group is Prescription retinoids (tretinoin, adapalene). The section above keeps the original pack for history.
- **Seeding.** `seedCommonRules(db, labels)` runs `addCommonRules` once per `COMMON_RULES_VERSION` and records it in `settings.common_rules_version` (migration 0002). `saveOnboarding` calls it right after creating the settings row, named in the chosen language; `bootstrapAfterMigrations` calls it for existing installs (a no-op afterwards, never blocks the launch). Deleted defaults stay deleted until "Add common rules" or a version bump. `commonRuleLabels(t, language, languages)` builds the translated names for the hook, the seed and the story fixtures.
- **Catalogue in the ingredient sheet.** For an ingredient in `src/lib/ingredientCatalog.ts`, `IngredientSheet` shows "What it does" with the translated category and "Also called …" with its aliases.
