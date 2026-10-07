# 039 Product notes and rating

**Phase:** L. Condition and notes · **Depends on:** 015, 034 · **Spec:** P2 (My rating, Notes timeline), P8, P6 (Would buy again: No never suggested), C2 (notes that day), feature plan 11 · **Design:** [screens.md](../design/screens.md) ProductNoteSheet, ProductDetailScreen

## Goal

Personal notes on how a product works, a 1–5 rating and "would buy again", shown on the product and used by the shopping list.

## Scope

In: `src/features/products/notesRepo.ts`, tests, `components/ProductNoteSheet.tsx`, `components/RatingBlock.tsx`, `components/NotesTimeline.tsx`.

- **Data:** `listNotes(db, productId)` newest first, `addNote(db, { productId, day, text, tags })`, `updateNote`, `deleteNote`, `notesOnDay(db, day)` (for C2), `setRating(db, productId, 1–5 | null)`, `setWouldRebuy(db, productId, boolean | null)`.
- **P2 My rating** (fill task 015's slot): `Rating` stars (tap the same star again to clear), and "Would buy again" Yes / No `ToggleGroup` (no value until chosen). Saves at once.
- **P2 Notes timeline** (fill task 015's slot): dated notes, newest first, each with its tags and text; "Add note" opens P8; long press: Edit, Delete (dialog). New notes fade in at the top.
- **P8 Product note (sheet):** Date (default today), text (required, max 280, counter), quick tags (the seven skin tags in the standard order: Calm, Glow, Oily, Dry, Breakout, Redness, Itchy). Save.
- **Shopping:** task 034's suggestions already skip `wouldRebuy = false`; show the rating and "Would buy again" on linked shopping rows and suggestions ("4 stars · would buy again").
- **C2:** fill task 028's slot with notes written that day, each linking to its product.
- **Duplicate** (task 012) does not copy rating or notes (check).

Out:

- Condition log: 038.

## Acceptance criteria

- [ ] Repository tests for notes and rating functions, including clearing a rating.
- [ ] A product marked "Would buy again: No" never appears in Suggested (end-to-end test with task 034's repository).
- [ ] Notes show on P2 and on the day they were written in C2.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
