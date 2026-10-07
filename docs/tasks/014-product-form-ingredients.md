# 014 Product form and ingredient entry

**Phase:** C. Products · **Depends on:** 010, 012 · **Spec:** P3 (Add product short form, Edit product full form, live preview, avoid warning, reminder ask hook), P4 (one per line, pasted lists), Words and copy (errors), refinements 12 and 14 · **Design:** [screens.md](../design/screens.md) ProductFormScreen, QuickAddProductScreen, IngredientPickerSheet

## Goal

Adding a product with the three-question short form (every new product) and editing it in the full form, with ingredients entered one per line, a live expiry preview and the photo.

## Scope

In: `npx expo install expo-image-picker expo-image-manipulator expo-file-system`. Files: `src/features/products/screens/ProductFormScreen.tsx`, `components/QuickFields.tsx`, `components/IngredientEntrySheet.tsx`, `photo.ts`.

### Full form (P3, Edit product)

- Route `/product-form` (full-screen modal, slide up 300 ms): with `id` it is **Edit product** (this full form, opened from Edit on product detail); without `id` it is Add product (the short form below), with `prefill` from a shopping item (task 034); prefilled fields the short form doesn't show (size, unit) are saved as given and editable later in Edit product. `ScreenHeader` with close (X); the **only** save action is "Save changes" in the `BottomBar` pinned to the bottom (task 009; no header Save).
- One scrolling form built with `useAppForm` and task 012's zod schema, fields in the order and with the controls of the P3 table: Photo, Name, Brand (suggestions from `useBrandSuggestions`), Area (Skin / Hair / Both), Category, Size + unit and Price on one row (price with currency suffix, "24,90 €"), Purchase date (default today), Printed expiry date, Opened toggle revealing Opened date (≤ today), Period after opening chips 3M, 6M, 9M, 12M, 18M, 24M, 36M + custom, Ingredients (opens P4; shows the chips and "Edit list"), Notes (max 500).
- Every field keeps its helper line reserved; errors replace it in place ("Enter a name.").
- **Live preview** at the bottom: "Expires on 6 Apr 2027 (in 182 days)" from task 006 `effectiveExpiry`; when there's no date, "No expiry date yet". Uses `tabular-nums`; its height is fixed.
- **Avoid warning:** when an ingredient matches the avoid list (task 007 `parsedLinesAvoidMatches`; empty until task 030 adds avoid items), a warning line under Ingredients: "Parfum is on your avoid list. Saving asks you to confirm." Saving then opens an AlertDialog: Save anyway / Edit ingredients.
- **Unsaved changes:** closing a dirty form asks Discard / Keep editing.
- **After save:** edit → back to P2. New product (short form) → back to where it was opened from with the toast "Vitamin C serum added". Call `onProductSaved(product, { isFirstWithExpiry })` so task 021 can show the reminder ask; it does nothing yet.
- **Photo:** "Add photo" offers Take photo / Choose from library (`expo-image-picker`, square crop, `allowsEditing`), resized to 1200 px and saved into app storage `Paths.document/products/<uuid>.jpg` (`photo.ts`); never saved to the gallery. Replacing or removing a photo deletes the old file after save. The photo box is reserved at 1:1.

### Add product (P3 short form, QuickAddProductScreen)

Used for **every** new product, not only the first: the Products `Fab`, the Today setup card, the Products empty state, a bought shopping item (pre-filled, task 034) and Add new product in the product picker. Title "Your first product" while `hasAnyProduct` is false, otherwise "Add product". Fields: Name, "Used on" (Skin / Hair / Both), "Is it open?" (Yes, I use it / Not yet). Yes shows Opened on (default today) and "Use within" chips 3M, 6M, 12M, 24M; Not yet shows the optional printed expiry. The open / not-yet area reserves 176 pt so switching doesn't move anything. Live "Expires on" line. "More details" expands (`Collapsible`) photo, brand, category, price and ingredients in place. `BottomBar`: Save product (filled) and "Save and add another" (ghost), which saves, shows the toast and keeps the form open, cleared, for the next bottle.

### Ingredient entry (P4, sheet)

- Multi-line field, one ingredient per line; Enter starts a new line.
- Suggestions above the keyboard for the current line (`suggestIngredients`, task 006); tapping fills the line.
- **Paste:** intercept paste (compare the new text with the previous value: a single change that inserts more than one character and contains a newline or commas counts as a paste) and run `splitPastedText` (task 006). When it split something, the hint reads "Pasted list split at commas into 5 lines." with an Undo link that restores the pasted text as it was. Typing is never split.
- Live chip preview under the field from `parseIngredientLines` + `classifyIngredients`: "New" tag for unknown ingredients, red for avoided, a link icon for ones in a conflict rule (from task 029 data when it exists). The preview area animates its height.
- Footer button counts the lines: "Save 5 ingredients" (always matches the chips). Done returns the parsed lines to the form; the product save writes them (task 012 `saveIngredients`).

Out:

- Reminder ask sheet: 021. Avoid list data: 030. Shopping prefill source: 034.

## Acceptance criteria

- [ ] Add works for every short-form and "More details" field, and edit for every field; validation messages show in place without shifting fields (test).
- [ ] Add product (short form) creates a product with name, area and an expiry from opened date + PAO or printed date, for the first and every later product; nothing moves when switching Yes / Not yet.
- [ ] "Save and add another" saves, shows the toast and leaves an empty short form; the title is "Your first product" only when there are no products.
- [ ] Edit product shows every field with "Save changes" in the bottom bar; neither form has a Save in the header.
- [ ] Ingredient entry: typed commas stay in one line; pasting "Aqua, Glycerin, Niacinamide, Parfum" splits into 4 lines with the hint and Undo restores it; the Save button count matches the chips (tests on the pure paste-detection helper plus a render test).
- [ ] Photos are stored in app storage, replaced files are deleted, nothing goes to the gallery.
- [ ] Dirty form asks before closing.
- [ ] Light, dark, 360 pt, Lithuanian and keyboard behaviour checked.
- [ ] `npm run check` passes.

## Decisions

- **Files:** the form is `screens/ProductFormScreen.tsx` (AddProduct short form, EditProduct full form, one `ProductForm`). Shared fields are in `components/ProductFields.tsx` (AreaField, MonthsField, ExpiryPreview, BrandField, PhotoField); the short form's open / not-yet block is `components/QuickFields.tsx`; ingredient entry is `components/IngredientEntrySheet.tsx` with read-only chips in `components/IngredientPills.tsx`; paste detection is the pure `ingredientInput.ts` (tested).
- **Short form defaults:** "Is it open?" starts on "Yes, I use it" with Opened on = today (most products added are in use). Switching clears the hidden side (Yes clears the printed expiry; Not yet clears opened date and Use within) so the "Expires on" line never uses a value you can't see. Purchase date is saved as today and unit as ml (only used when a size is given).
- **Prefill** (task 034): `/product-form?prefill=<JSON of form values>`; anything the short form doesn't show is saved as given.
- **Brand suggestions** are an overlay list under the field while it is focused, so nothing below moves.
- **Period after opening:** chips 3M–36M plus Custom, which reveals a months field (`Collapsible`). The short form's "Use within" has 3M, 6M, 12M, 24M.
- **Avoid confirm:** the AlertDialog's cancel button is "Edit ingredients" and opens the ingredient sheet (expanding More details on the short form).
- **Photos:** `photo.ts` picks with a square crop, resizes the longest side to 1200 px, saves a JPEG at 0.85 to `documents/products/<random>.jpg`. Every picked file is tracked; after saving, the ones not kept are deleted, and on Edit the replaced or removed old file is deleted when no other product uses it (Duplicate shares photo files). Discard deletes every photo picked in the form. Camera permission denied shows a toast. The expo-image-picker plugin is in app.json with photo and camera permission texts (no microphone).
- **Leaving:** Close (X) and any navigation away (Android back) go through "Discard changes?" while the form is dirty (`beforeRemove` listener).
- **Ingredient suggestions** sit in the sheet's footer above Save, in a row whose 40 pt height is always reserved, so they are above the keyboard and never move the button. Choosing one replaces the cursor's line. The split hint replaces the "Press Enter after each ingredient." hint in the same reserved line, with Undo; any further edit drops the Undo. Inside sheets `Input` now uses `BottomSheetTextInput`.
- **Dates can't be cleared yet:** DateField has no clear action, so a printed expiry set by mistake can only be changed, not removed (on the short form, switching Yes/Not yet clears it). Worth a small Clear action in task 041 if it bothers on device.
- `ToggleGroup` shows no indicator when nothing is chosen (Used on has no default). Jest host views now return a fixed frame from `measure` so DropdownMenus open in tests.
- **Device checks needed:** camera and library picking with the square crop on iOS and Android, the saved photo size, permission texts; the ingredient sheet with the keyboard open (sheet rises, suggestions row above the keyboard, multi-line field grows to 160 pt); paste splitting with a real clipboard; the brand overlay above the fields below it on Android; the 176 pt open / not-yet area at 360 pt in Lithuanian; Android back on a dirty form; light and dark.
- **Catalogue suggestions (added 2026-10-07).** `suggestIngredients(query, known, limit, catalog = ingredientCatalog)` also suggests from the built-in catalogue (`src/lib/ingredientCatalog.ts`, about 420 INCI names with aliases). Order: an alias typed in full, then name prefix, alias prefix, name substring, alias substring; the person's own ingredients first within each, and catalogue entries they already have appear once with their spelling (still found by the catalogue's aliases). A suggestion found by an alias reads "Ascorbic acid (Vitamin C)" and fills the line with the INCI name. The "New" tag still means "not in your list yet".
