# 029 Ingredients, groups and conflict rules

**Phase:** H. Conflicts · **Depends on:** 011, 012, 022 · **Spec:** S2, S3 (list, "No clashes", editor), Empty states (Conflicts, "Add common rules"), feature plan 7 · **Design:** [screens.md](../design/screens.md) IngredientsScreen, ConflictsScreen

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

- Rule rows: "Retinol × AHA/BHA" (a group side shows a small group icon and the word "group" in its spoken label), the note ("Can cause flushing"), and either "In 2 routines" (the number of routines where the rule currently fires, from `weeklyConflicts`) or **"No clashes"** when its two sides never fall on the same day.
- **Empty:** "No conflict rules" / "Start with common pairs, like retinol with AHA, or write your own." / "Add common rules" (primary) and "Add a rule" (ghost).
- **Editor sheet** (`ConflictRuleSheet`): left side picker, right side picker (each searches ingredients and groups together, groups marked), note (max 120). Saving re-checks all routines and shows "Affects 2 routines" (or "Doesn't affect any routine now") in a callout that animates its height open, then closes after the person taps Done. Delete rule in the sheet for existing rules.

Out:

- Warnings on Today, Routines, the editor, the player and products, and the avoid list: 030.

## Acceptance criteria

- [ ] Repository tests: merge moves product links, rules and avoid references and removes duplicates; rename into an existing name merges; deleting a group cleans up members and rules; `addCommonRules` is idempotent and links existing ingredients by normalized name.
- [ ] S3 shows "In N routines" or "No clashes" correctly for a seeded set of routines (A/B alternates not counted against each other).
- [ ] Editor saves and shows the affected count callout without jumping the sheet.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
