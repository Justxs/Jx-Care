# Screens

Copied from the design system artifact (https://claude.ai/artifact/6wezpPoHNSQoe9bM6GUryU, v14) on 2026-10-06 so agents can read it offline. Where it differs from docs/feature-spec.md or DESIGN.md, those win; see [README.md](README.md#known-differences).

Design notes per screen, in spec order. Each names its spec ID; the spec section with that ID is the full description.

## WelcomeScreen

**Spec:** O1 · **Opens from:** First launch, and after a reset.

Logo, app name, one-line pitch, a privacy line ("Everything stays on this phone. No account needed.") and two large language choices (Lietuvių / English), pre-selected from the phone language. Continue.

- Step bar "1 of 5" sits at the top of every onboarding step; nothing is saved until O4 finishes.
- Next step: push. Picking a language re-renders the strings in place; labels wrap, buttons keep their min height.

## CreatePinScreen

**Spec:** O2 · **Opens from:** Welcome (O1).

"Create a 4-digit PIN", four dots and PinPad. Moves on by itself after the 4th digit.

- Rejects 0000, 1234 and four identical digits with an inline hint in the reserved line under the dots.
- Dots fill with the 150ms pop; the hint line never pushes the keypad.

## ConfirmPinScreen

**Spec:** O3 · **Opens from:** Create PIN (O2).

Same layout as O2, "Enter it again".

- Mismatch: dots shake (300ms) with a haptic, "PINs don't match" in the hint line, then back to O2.

## RecoveryScreen

**Spec:** O4 · **Opens from:** Confirm PIN (O3).

Picker with 5 preset questions plus "Write my own", an answer field (min 3 characters) and the helper "You'll need this if you forget your PIN."

- Finishing this step saves the PIN hash and answer hash in secure storage.

## BiometricsScreen

**Spec:** O5 · **Opens from:** Recovery question (O4). Skipped when the phone has no Face ID or fingerprint.

Icon, "Unlock with Face ID?", Turn on / Not now.

- Last onboarding step. Either button lands on Today in its first-run state (TodayFirstRunScreen).
- Reminders are not asked here; see ReminderAskSheet.

## LockScreen

**Spec:** L1 · **Opens from:** Every open, and after 1 min in the background (0 / 1 / 5 min in Security).

Logo, "Enter PIN", four dots, PinPad, biometrics button when on, "Forgot PIN?".

- The biometrics prompt opens once on arrival.
- Wrong PIN: dots shake (300ms) and a haptic. After 5 wrong in a row the PinPad is disabled with "Try again in 30 s"; after 10, 5 minutes. The countdown uses tabular numbers in the reserved hint line.
- The app switcher shows a blurred overlay with the logo while locked.
- Today is prefetched while this screen is open, so it paints complete on unlock.

## ForgotPinScreen

**Spec:** L2 · **Opens from:** "Forgot PIN?" on the lock screen.

The saved question and an answer field. The answer is compared ignoring case, accents and extra spaces.

- Correct: create a new PIN (O2/O3 layout), then Today.
- 5 wrong answers: wait 15 minutes. "Reset app and delete all data" opens a dialog that needs typing RESET.

## TodayFirstRunScreen

**Spec:** T1 (first-run state) · **Opens from:** the last onboarding step (O5), and Today until setup is done or hidden.

Greeting and date, then a "Set up Jx-Care" card: a progress bar ("1 of 3") and three rows (Add your first product, Build a routine, Set up hair care). Each row has a numbered circle that turns into a green check, and its second line changes to what was made ("Vitamin C serum added"). Below, an Optional group: weekly progress photo and ingredients to avoid.

- No streak chips or routine cards until there is a routine to show.
- When all three steps are done, the line under the card reads "You're set" and the card is removed the next day. Long press, Hide removes it at once.
- Rows keep a fixed 72px height whether done or not, so ticking a step does not move the rows below it.
- Rows open: P3 quick mode, RoutineStarterSheet, HairSetupSheet.

## TodayScreen

**Spec:** T1 · **Opens from:** Home tab, and every unlock.

Answers "what do I need to do today?". Sections, each hidden when empty: header with greeting, date and StreakChips; routine cards per time of day with ProgressRing; Expiring soon (up to 3) and the "3 to buy" chip; hair due rows; weekly photo card; "How's your skin today?" chips.

- Data is prefetched behind the lock screen, so no section pops in after the first frame.
- A finished routine card collapses to a ticked row (250ms) and the streak counts up.
- Empty Today shows three setup cards: first product, first routine, hair care.
- **Expired products show where they are used.** A routine card or done row names any expired product in it, in danger red ("SPF 50 fluid expired 2 Oct"). While anything is expired, Expiring soon moves up directly under the routine cards; otherwise it sits below hair.
- **A/B choice:** when two routines share a time of day, the card shows A/B chips and the line "Pick one. Jx-Care remembers it for Tuesdays." The chips show only before the first step is ticked; after that the card says "Continue" and the choice is fixed for the day. The button says "Start" before any tick.
- Conflicts show as a ConflictTag on the card. "Skip this week" on the photo card is a ghost button so it does not compete with "Take photo".

## RoutinePlayerScreen

**Spec:** T2 · **Opens from:** Today, Routines, or a routine reminder.

Full screen. Header with routine name, slot, close and "Step 2 of 5"; steps due today with photo, name, note and checkbox.

- Opens with the 300ms slide up; closing slides down. Leaving mid-way keeps the day's ticks.
- A wait timer floats in a fixed bar at the bottom ("Wait 0:42 before the next step") with "Skip wait". The next step's text turns ink-muted and its caption says "Next, after the wait"; text is never faded with opacity, so it keeps AA contrast.
- A step in a conflict carries a tappable ConflictTag; an amber line under the list names the other routine and the risk.
- A step whose product is expired or finished becomes a card: "Step 4 · SPF 50 fluid", a red "Expired 2 Oct" (or neutral "Finished") badge, the line "Pick another product for this step, or tick it to use this one today.", and Pick another / Buy again.
- All ticked: subtle check, updated streak and Done.

## HairDoneSheet

**Spec:** T3 · **Opens from:** Today hair rows, or a hair reminder.

Sheet titled with the task, date (today, editable), product chips pre-selected from the task, note. Mark as done.

- After saving, shows the next due date ("Next wash: Friday, 9 Oct") in place of the button, same height.

## ConditionLogSheet

**Spec:** T4 · **Opens from:** "Add note" on Today, or Day detail.

Date, skin chips and hair chips (multi-select, both optional), note up to 280 characters. Save.

- Chips, not ratings: calm, oily, dry, breakout, redness for skin.
- Sheet spring about 300ms; the keyboard scrolls the note into view without a jump.

## ProductsScreen

**Spec:** P1 · **Opens from:** Products tab.

Segmented switch My products / Shopping (count badge), search, filter button and +. ProductRows with AreaTag, status badge and Avoid badge. Footer link "Archive (N)".

- Segments: sliding indicator plus 200ms cross-fade.
- Filters open in a sheet: area, category, status, avoid only; sort by soonest expiry, name or recently added.
- Skeleton rows at 72pt while loading. Empty state: "No products yet" with Add product.

## ProductDetailScreen

**Spec:** P2 · **Opens from:** Products list, Today, or an expiry reminder.

Square photo, name, brand, AreaTag; expiry block with progress and dates; size, price and ingredient chips; Used in; rating and "Would buy again"; notes timeline; cost per day once finished; actions bar: Edit, Mark finished, Buy again, More.

- Push. The photo box is reserved at 1:1 with a placeholder colour.

## ProductFormScreen

**Spec:** P3 · **Opens from:** + on Products, Edit on detail, or "Add as new product" from Shopping.

One scrolling form; only Name and Area are required. Photo, name, brand, area, category, size + unit, price, dates, opened, period after opening chips, ingredients, notes. Live expiry preview at the bottom.

- Full-screen slide up (300ms). Every field reserves its helper line.
- Saving with an avoided ingredient shows a dialog: Save anyway / Edit ingredients.
- Size, unit and price share one row; price shows the currency suffix ("24,90 €").

## QuickAddProductScreen

**Spec:** P3 (quick mode) · **Opens from:** Today first-run step 1, and the Products empty state.

Full-screen form with three questions: name, area (Skin, Hair, Both), and "Is it open?". Open shows the opened date and Use within chips (3M, 6M, 12M, 24M) with the open-jar hint; Not yet shows the optional printed expiry. A line under the fields shows the computed expiry date. "More details" expands the rest of the P3 form (photo, brand, category, price, ingredients). One button: Save product.

- The open / not-yet area reserves 176px so switching does not move the button.
- Saving the first product with a date opens ReminderAskSheet. Later products go back to Products with a toast.
- After the first product, Add product opens the full P3 form with "More details" already open.

## IngredientPickerSheet

**Spec:** P4 · **Opens from:** Ingredients field in the product form.

Search the ingredient list, tap to add chips, "Add 'niacinamide'" when not found. "One per line" mode: a multi-line field where each line becomes one ingredient chip, so names typed with a comma stay whole. Blank lines are ignored, extra spaces trimmed, duplicates merged case-insensitively.

- Conflicting chips show a link icon; avoided ones are red.
- **Pasted lists:** when a paste contains a line with two or more commas (a list copied from a pack or a shop), that line is split at the commas and the hint says "Pasted list split at commas into 5 lines." with Undo. Typing is never split. The chip preview and the Save button count ("Save 5 ingredients") always match the lines.

## ArchiveScreen

**Spec:** P5 · **Opens from:** "Archive (N)" on Products.

Finished products, newest first, with finished date and cost per day. Sort by date or cost per day. Restore, Buy again, Delete (confirm). Marking a product finished shows "Name moved to Archive" with Undo.

## ShoppingScreen

**Spec:** P6 · **Opens from:** Shopping segment on Products, or the "to buy" chip on Today.

Suggested (collapsible), To buy with All/Skin/Hair chips, Want to try, Bought. + Add item and Share.

- Ticking a linked item asks "Add as new product?"; Add opens the product form pre-filled.
- Clear bought shows a toast with Undo; rows collapse with fade plus height (200ms).

## ShoppingItemSheet

**Spec:** P7 · **Opens from:** + Add item on Shopping.

Toggle Buy again (pick product) / New item. New item: name, brand, area, list (To buy / Want to try), note.

## ProductNoteSheet

**Spec:** P8 · **Opens from:** + Add note on product detail.

Date, text (required, max 280) and quick tags: breakout, irritation, calm, glow. Save.

## HairScreen

**Spec:** R1 · **Opens from:** Hair segment on the Routines tab.

Two groups, Washes and Other care (trims, colour, scrubs). Rows show frequency, last done as a date ("Last 18 Aug") and next due. + New hair task.

- Washes count toward the hair streak; events do not.

## RoutinesScreen

**Spec:** R1 · **Opens from:** Routines tab.

Skin / Hair switch. Routines grouped by time of day; each card shows name, WeekdayDots, "Reminder at 07:30" or "No reminder", step count, ConflictTag, active switch and a Start button. + New routine.

- Long-press: Duplicate as variant, Delete. Empty: see EmptyStates.
- WeekdayDots show scheduled days in soft pink, so the dots never outweigh the routine name or the Start button.
- Two routines at the same time of day (Evening A and B) are alternatives: on a day both are scheduled, Today asks which one, and they are never checked against each other for conflicts.

## RoutineEditorScreen

**Spec:** R2 · **Opens from:** A routine card or + New routine.

Name, time-of-day chips, weekday toggles with "Every day", reminder, and a reorderable step list. Tapping a step opens the step editor sheet (R3).

- Dragging lifts the step (scale 1.03, shadow); others slide aside.
- The conflict panel animates its height open after a save check; saving is still allowed.
- Leaving with changes asks Discard / Keep editing.
- Steps in a conflict show a ConflictTag under the name, next to their schedule chips ("Mild conflict" for every-few-days steps). Conflicts are checked only against routines on the same weekday that are not alternatives at the same time of day; the panel says so ("Evening A is the other evening choice, so it is not compared.").

## RoutineStarterSheet

**Spec:** R2 (starter) · **Opens from:** Today first-run step 2 and the Routines empty state.

Morning / Evening toggle, then three templates as a radio list (Evening: Treatment, Basics, Start empty; Morning: Basics, Light, Start empty). Below, the steps filled from the user's products; a step with no matching product says "Pick a product later" in amber. Create routine opens the full R2 editor for days, time and reminder.

- The step preview reserves 176px; swapping templates fades it in place.
- Products are matched by category (cleanser, serum, moisturiser, SPF). Nothing is made until Create routine.

## StepEditorSheet

**Spec:** R3 · **Opens from:** A step in the routine editor.

Product (opens the product picker), note, schedule (Every time / Set days / Every few days) and wait after the step.

- The schedule panels cross-fade inside a min-height box, so the sheet does not jump.

## ProductPickerSheet

**Spec:** R4 · **Opens from:** Step editor, or hair task editor.

Search, category filters, rows with status badge; expired ones are shown but marked. + Add new product opens the form and returns with it selected.

## HairSetupSheet

**Spec:** R5 (quick setup) · **Opens from:** Today first-run step 3 and the Routines, Hair empty state.

Wash frequency chips (Every day, Every 2 days, Every 3 days, Twice a week, Once a week, Other), last wash chips (Today, Yesterday, 2 days ago, Pick a date), a live "Next wash" line, and an optional "Also track trims" switch (every 8 weeks). Save creates the wash task, and the trim task when on.

- Trims do not count toward the hair streak.
- Products, colour and masks are added later in the full R5 editor.

## HairTaskEditorScreen

**Spec:** R5 · **Opens from:** Hair rows or + New hair task.

Type (Wash / Other care), name, products (washes only), how often (Every few days / Set days), last done, reminder. Preview line "Next due: Friday, 9 Oct".

## CalendarScreen

**Spec:** C1 · **Opens from:** Calendar tab.

Skin / Hair / Condition / Progress switch. Month grid always 6 rows, Monday first; 1 October 2026 is a Thursday. Skin: done, partly, missed dots with the streak card. Hair: washes and event icons. Condition: coloured chips with a legend. Progress opens the timeline (C3).

- Swiping months never changes the grid height. "Today" returns to the current month.
- Day status marks are 10px, and each day's spoken label includes its status ("5 October, partly done"). The selected day is soft pink with ink text, so it never looks like the "done" fill; today has an accent outline.

## DayDetailScreen

**Spec:** C2 · **Opens from:** A day on the calendar.

Skin routines with each step, hair tasks, condition log, product notes and the week's photo thumbnail.

- Editable up to 7 days back; older days are read-only.

## ProgressPhotosScreen

**Spec:** C3 · **Opens from:** Progress segment on Calendar.

Skin / Hair switch (Hair only when the album is on). Weekly tiles in 3:4 boxes with week label and stars; missing weeks show "No photo". Take this week's photo and Compare.

- Empty: "Take a photo each week to see your skin change".

## ProgressCameraScreen

**Spec:** C4 · **Opens from:** Timeline, Today's weekly card, or the weekly reminder.

Full-screen camera with last week's photo at 30% overlay, a face oval guide, angle label and the tips row "Same light · no makeup · hair back".

- Slide up 300ms. After each angle, the next; after the last, review.

## PhotoReviewScreen

**Spec:** C5 · **Opens from:** Progress camera.

All angles, rating 1 to 5, tags, note. Save shows "Saved privately in Jx-Care".

- Photos never go to the phone gallery.

## WeekDetailScreen

**Spec:** C6 · **Opens from:** A week tile on the timeline.

Angles full width, rating, tags, note and "What changed this week". Compare with…, Retake, Delete.

## PhotoCompareScreen

**Spec:** C7 · **Opens from:** Week detail or the timeline.

Side by side or slider modes, week pickers, the "4 weeks ago vs now" chip and an angle switcher. Pinch zooms both in sync.

- Full-screen slide up 300ms.

## SettingsScreen

**Spec:** S1 · **Opens from:** Settings tab.

Grouped rows: Care data (Ingredients, Conflicts, Avoid list), Notifications (Reminders), Security, Preferences (Language, Currency, Progress photos), Data (Backup and restore, Reset app), About.

- Tab cross-fade 150ms; rows push.

## IngredientsScreen

**Spec:** S2 · **Opens from:** Settings.

Ingredients / Groups segments. Ingredient rows show the group chip and "in 4 products"; group rows show member counts.

- Select mode merges duplicates such as "Niacinamide" and "niacinamide".

## ConflictsScreen

**Spec:** S3 · **Opens from:** Settings.

Rules like "Retinol × AHA" (a group side shows a group icon), the note and how many routines it affects. The editor is a sheet with two side pickers and a note.

- Saving re-checks every routine and shows "Affects 2 routines" in a callout that animates its height open.
- Each rule shows how many routines it currently fires in, or "No clashes" when its two sides never fall on the same day.

## AvoidListScreen

**Spec:** S4 · **Opens from:** Settings.

Ingredient or group rows with a note and an "in 1 product" count. + Add. Products containing them are listed below.

- Removing a row collapses it (200ms). Matching products show the red Avoid badge everywhere.

## RemindersScreen

**Spec:** S5 · **Opens from:** Settings.

Expiry warning (7 / 14 / 30 / 60 days, time), expiry day, routine and hair master switches, weekly photo, weekly digest and snooze length.

- When phone permission is off, an amber card says "Notifications are off in phone settings" and "Your choices below are kept, but nothing is sent until notifications are on.", with the filled button "Open phone settings". Every switch is replaced by its saved state as text ("Paused" or "Off"), so nothing looks on when it is not. The card's space is reserved, so the list does not jump when permission comes back.
- Sub-rows under a switch open and close with fade plus height.

## SecurityScreen

**Spec:** S6 · **Opens from:** Settings.

Change PIN (old, new, confirm), recovery question (needs PIN), biometrics switch, auto-lock Immediately / 1 min / 5 min.

## PreferencesScreen

**Spec:** S7 · **Opens from:** Settings.

Language (applies at once), currency (EUR, USD, GBP, PLN, others), tracked skin angles, hair album, hair angles and overlay opacity.

- Hair angles keep a reserved row so switching the album never jumps the card.

## BackupScreen

**Spec:** S8 · **Opens from:** Settings, or the monthly backup reminder.

Export as JSON or zip with photos through the share sheet; last backup with a reminder after 30 days. Import shows counts first, then "Replace all data" with a confirm dialog. Reset app needs the PIN, then typing RESET.

- Import never merges.

## ReminderAskSheet

**Spec:** replaces O6 · **Opens from:** saving the first product that has an expiry date.

Sheet over the product: "Get a reminder before it expires?", one line naming the product and when it would fire, an example notification, then Allow reminders / Not now.

- Allow shows the phone's permission prompt next; only expiry reminders (30 days and on the day) are switched on.
- Not now leaves reminders off and does not ask again. Settings, Reminders can turn them on, and routine reminders ask the same way the first time one is set.
- Never shown during onboarding.

## EmptyStates

What each list says before it has anything in it. All use EmptyState: bare icon, title, one line, and at most one filled button.

| Screen | Title | Action |
|---|---|---|
| Products | No products yet | Add product (opens P3 quick mode) |
| Shopping list | Nothing to buy | Add item |
| Routines, skin | No routines yet | New routine (RoutineStarterSheet) |
| Routines, hair | Hair care is not set up | Set up hair care (HairSetupSheet) |
| Calendar | Your month fills in as you go | none |
| Progress | No photos yet | Take first photo |
| Archive | Nothing finished yet | none |
| Avoid list | Nothing to avoid yet | Add ingredient |
| Conflicts | No conflict rules | Add common rules, then Add a rule (ghost) |

- "Add common rules" adds a starter set (retinoids with AHA/BHA, retinoids with benzoyl peroxide, vitamin C with AHA/BHA) the user can edit or delete.
- Lithuanian strings go through the same i18n keys; titles stay one line at 360px.
