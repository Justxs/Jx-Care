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

- [x] Repository tests for notes and rating functions, including clearing a rating.
- [x] A product marked "Would buy again: No" never appears in Suggested (end-to-end test with task 034's repository).
- [x] Notes show on P2 and on the day they were written in C2.
- [ ] Light, dark, 360 pt and Lithuanian checked; `pnpm check` passes. (Lithuanian strings and `pnpm check` done; light, dark and 360 pt need a device, see below.)

## Decisions

Data (`notesRepo.ts`, tested in `notesRepo.test.ts`; no schema change, `product_note`, `product.rating` and `product.would_rebuy` already existed):

- `listNotes` sorts by day (newest first), then by when the note was written (newest first), then id. `notesOnDay` lists a day's notes in the order they were written, each with its product's name.
- Note text is trimmed and runs of spaces are tidied, but line breaks are kept (at most one blank line in a row). Tags are filtered to the seven skin tags, once each, and stored in the standard order (Calm, Glow, Oily, Dry, Breakout, Redness, Itchy) whatever order they were tapped in.
- The repository refuses an empty note, one over 280 characters, an invalid day and a rating outside 1–5 (throws); the sheet's zod schema (`noteSchema.ts`) catches the same cases first with i18n messages. A note's date can't be after today (`max` on the date field and a schema rule).
- `setRating(db, id, null)` clears the rating; `setWouldRebuy(db, id, null)` clears the choice (the UI never does that, the function allows it).
- Deleting a product deletes its notes (the existing `ON DELETE CASCADE`). Duplicate (012) already cleared rating and would buy again; notes live in their own table and are not copied (tested).
- Query hooks are in `notesApi.ts`. Notes use `qk.notes.*` (added `qk.notes.day(day)`); rating changes invalidate `products` and `shopping`; every product change now also invalidates `notes` (Day detail shows product names, and a deleted product's notes go).

UI:

- **My rating** (`RatingBlock`): a card under Used in. Stars use the shared `Rating` with a new `clearable` prop (tapping the selected star again clears it). "Would buy again" is a Yes / No `ToggleGroup` with no indicator until chosen; once chosen it can be switched but not cleared, as a segmented control never goes empty. Both save on tap; the block shows the new value at once from local state while the write runs.
- **Notes timeline** (`NotesTimeline`): heading "My notes" (to tell it apart from the product's own "Notes" field in Details) with the word action "Add note" beside it, then one card of notes: date, tag pills (accent-soft), text. Empty: "Note how your skin or hair reacts to it." Tapping a note opens it for editing (added for discoverability); long press opens an action sheet with Edit and Delete, and the same two are screen-reader actions. Delete asks in a dialog ("The note from 5 Oct is deleted for good. This can't be undone.") and has no Undo toast. New notes fade in at the top with the shared row motion (`rowEntering` / `rowLayout`); the first render doesn't animate.
- **P8 sheet** (`ProductNoteSheet`): Date (default today, max today), Note (multi-line, `maxLength` 280, the counter "22/280" sits in the reserved helper line and an error replaces it), Tags (the seven skin tag chips, multi-select). Footer button "Save". Unsaved changes ask "Discard changes?" like other sheets. Title "Add note" or "Edit note". No success toast: the note appears in place.
- **Shopping**: `Suggestion` gained `rating` and `wouldRebuy`. Linked To buy / Want to try / Bought rows and suggestions show one extra caption line from `ratingLine`: "4 stars · would buy again", "4 stars", "Would buy again" or "Would not buy again" (nothing when neither is set). Free-text items show nothing.
- **C2**: `DayNotesSection` (in products/components) renders "Product notes" with the day's notes, each row linking to its product. A day without notes shows no section (rather than an empty card), and the section fades in, placed after the skin routines. When 033 and 038 add their sections, the order should follow the spec: routines, hair, condition log, product notes, photo.

Check on a real device:

- Rating stars: tap 1–5, tap the same star to clear; 44 pt targets at 360 pt width.
- Would buy again Yes / No: indicator slides in from nothing on first choice without a jump.
- Add note sheet: keyboard with the multi-line field (sheet grows, Save stays visible), date picker on iOS (sheet over sheet) and Android (system dialog), counter and error line don't shift the tags.
- New note fades in at the top of the timeline; delete fades it out and the card height glides.
- Long press menu and delete dialog in light and dark.
- Lithuanian at 360 pt: "Mano įvertinimas", "Pirkčiau dar kartą", "Pridėti pastabą" beside "Mano pastabos" (heading wraps rather than truncating), shopping line "4 žvaigždutės · pirkčiau dar kartą".
- Day detail notes section in light and dark, tapping a note opens the product.
