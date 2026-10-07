# Screens

Copied from the design system artifact (https://claude.ai/artifact/6wezpPoHNSQoe9bM6GUryU, v16) on 2026-10-07 so agents can read it offline. Where it differs from docs/feature-spec.md or DESIGN.md, those win; see [README.md](README.md#known-differences).

Design notes per screen, in spec order. Each names its spec ID; the spec section with that ID is the full description.

## WelcomeScreen

**Spec:** O1 · **Opens from:** First launch, and after a reset.

Logo, app name, one-line pitch, a privacy line ("Everything stays on this phone. No account needed.") and two large language choices (Lietuvių / English), pre-selected from the phone language. Continue.

- Step bar "1 of 5" sits at the top of every onboarding step; nothing is saved until O4 finishes.
- Next step: push. Picking a language re-renders the strings in place; labels wrap, buttons keep their min height.
- The two languages are a RadioList (round marks, native name with the other language under it). No LT/EN squares: they read as icon tiles.

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
- The answer is hidden as it is typed (`secret` Input) with an eye button to show it ("Show answer" / "Hide answer").

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
- The answer field is hidden as typed, with the same eye button as O4.

## TodayFirstRunScreen

**Spec:** T1 (first-run state) · **Opens from:** the last onboarding step (O5), and Today until setup is done or hidden.

Greeting and date, then a "Set up Jx-Care" card: a progress bar ("1 of 3") and three rows (Add your first product, Build a routine, Set up hair care). Each row has a numbered circle that turns into a green check, and its second line changes to what was made ("Vitamin C serum added"). Below, an Optional group: weekly progress photo and ingredients to avoid.

- No streak chips or routine cards until there is a routine to show.
- When all three steps are done, the line under the card reads "You're set" and the card is removed the next day. Long press, Hide removes it at once.
- Rows keep a fixed 72px height whether done or not, so ticking a step does not move the rows below it.
- Rows open: P3 quick mode, RoutineStarterSheet, HairSetupSheet.
- The next step to do is opened up with a filled button ("Build a routine"); the others stay as rows. When all three are done the card becomes "You're set" with the frog and a "See today" button.

## TodayScreen

**Spec:** T1 · **Opens from:** Home tab, and every unlock.

Answers "what do I need to do today?". Five blocks, each hidden when empty: header with greeting, date and StreakChips; routine cards per time of day; Expiring soon (up to 3) with a Shopping list row at its foot ("3 to buy"); Hair due; Check-in (this week's photo, then "How's your skin today?").

- Data is prefetched behind the lock screen, so no section pops in after the first frame.
- **One tap to finish.** Each routine card has Start (filled) and All done (secondary, `check-check`). All done ticks every due step at once and shows "Evening done · Undo"; Start opens the player for step-by-step ticking. A finished card collapses to a ticked row (250ms) and the streak counts up.
- **Expired products show where they are used.** A routine card or done row names any expired product in it, in danger red ("SPF 50 fluid expired 2 Oct"). While anything is expired, Expiring soon moves up directly under the routine cards; otherwise it sits below hair. The expired row's badge carries the date ("Expired 2 Oct"); the date is never written twice in one row.
- **A/B choice:** when two routines share a time of day, the card shows A/B chips and "Pick one for tonight; Jx-Care remembers it for Tuesdays. About A and B". The link opens the Evening A or B sheet (ExplainSheets). The chips show only before the first tick; after that the button says "Continue" and the choice is fixed for the day.
- StreakChips are tappable and open the streak sheet; the ConflictTag opens the conflict sheet.
- **Check-in:** "Take photo" is a secondary button on the photo row; "Skip this week" is a plain text link under it, so the two never look equal. Below a separator, the 7 skin tags in the standard order (Calm, Glow, Oily, Dry, Breakout, Redness, Itchy); "Hair and note" opens the condition sheet (T4) for hair tags and a note. The photo row shows only in the week it is due.

## RoutinePlayerScreen

**Spec:** T2 · **Opens from:** Today, Routines, or a routine reminder.

Full screen. Header with routine name, close and "Step 2 of 5"; steps due today with photo, name, note and a square checkbox.

- Opens with the 300ms slide up; closing slides down. Leaving mid-way keeps the day's ticks.
- The whole step row toggles its checkbox, not only the 26px box, so wet hands can hit it.
- "All done" (ghost, `check-check`) under the list ticks every remaining step at once.
- A wait timer floats in a fixed bar at the bottom ("Wait 0:42 before the next step") with a real "Skip wait" button (secondary, 44px), not a link. The next step's caption says "Next, after the wait"; text is never faded with opacity.
- A step in a conflict carries a tappable ConflictTag; an amber line under the list names the other routine and the risk and ends with "Why?", which opens the conflict sheet (ExplainSheets).
- A step whose product is expired or finished becomes a card: "Step 4 · SPF 50 fluid", a red "Expired 2 Oct" (or neutral "Finished") badge, the line "Pick another product for this step, or tick it to use this one today.", and Pick another / Buy again.
- All ticked: the player hands over to RoutineDoneScreen.

## RoutineDoneScreen

**Spec:** T2 (finished state) · **Opens from:** The last tick in the routine player, or All done in the player.

The designed end of a routine: the frog (88px, fades in), "Evening done", "All 4 steps, finished at 21:52.", the StreakCard counting up to the new number, then what comes next ("Next: Morning · Tomorrow at 07:30") and anything that needs attention ("SPF 50 fluid expired 2 Oct · On your shopping list"). Back to Today (filled) and Add a note (ghost).

- Calm, no confetti, no exclamation marks. Reduce Motion shows the final streak number at once.
- If the streak had broken, the StreakCard says "Started again. Your best is still 21 days."
- All done on the Today card skips this screen and shows a toast with Undo instead.

## HairDoneSheet

**Spec:** T3 · **Opens from:** Today hair rows, or a hair reminder.

Sheet titled with the task, date (today, editable), product chips pre-selected from the task, note. Mark as done.

- After saving, shows the next due date ("Next wash: Friday, 9 Oct") in place of the button, same height.

## ConditionLogSheet

**Spec:** T4 · **Opens from:** "Add note" on Today, or Day detail.

Date, a Skin / Hair switch over the tag chips (multi-select, both optional), note up to 280 characters. Save.

- Chips, not ratings.
- Sheet spring about 300ms; the keyboard scrolls the note into view without a jump.
- Skin / Hair switch with a count of picked tags on each side, so only 7 or 5 chips show at once. Tags use the standard order: skin Calm, Glow, Oily, Dry, Breakout, Redness, Itchy; hair Shiny, Frizzy, Oily roots, Dry ends, Flaky scalp.

## ProductsScreen

**Spec:** P1 · **Opens from:** Products tab.

Segmented switch My products / Shopping (count badge), search, list or shelf view, filter button. ProductRows with AreaTag-coloured thumbs, a status badge only when the status is not OK, and the Avoid badge. Footer link "Archive (N)". The add action is the Fab "Add product" at the bottom right.

- **Each fact once.** The third line is the date ("Expires 15 Oct"); the badge only names a status that needs attention (Expired 2 Oct, Expiring soon, Not opened, No date, Avoid). An OK product has no badge.
- **Shelf view** (`layout-grid`): two columns of product tiles, photo or category glyph on the area's soft colour, name, date and the status badge. It is for recognising bottles by sight; list view (`list`) is the default. The choice is remembered.
- **Select** (header word): rows get square checkboxes and a bar above the tab bar offers Mark finished and Buy again for all selected; the header word becomes Done.
- Segments: sliding indicator plus 200ms cross-fade. Filters open in a sheet: area, category, status, avoid only; sort by soonest expiry, name or recently added.
- Skeleton rows at 72pt while loading. Empty state: "No products yet" with Add product.

## ProductDetailScreen

**Spec:** P2 · **Opens from:** Products list, Today, or an expiry reminder.

Square photo, name, brand, AreaTag; expiry block with progress and dates; size, price and ingredient chips; Used in; rating and "Would buy again"; notes timeline; cost per day once finished. Action bar with three actions: Edit, Mark finished, Buy again. Everything else (Duplicate, Delete) is in the header's More menu.

- Push. The photo box is reserved at 1:1 with a placeholder colour.
- Three actions, not four, so "Pažymėti baigtu" fits on one line at 360px (see LithuanianCheck).

## ProductFormScreen

**Spec:** P3 (all fields) · **Opens from:** Edit on product detail.

One scrolling form with every field; only Name and Area are required. Photo, name, brand, area, category, size + unit, price, dates, opened, period after opening chips, ingredients, notes. Live expiry preview at the end. "Save changes" sits in a bar pinned to the bottom.

- New products use the short form (QuickAddProductScreen); this full form is for editing, and is what "More details" expands into.
- Every field reserves its helper line. Saving with an avoided ingredient shows a dialog: Save anyway / Edit ingredients.
- Size, unit and price share one row; price shows the currency suffix ("24,90 €").

## QuickAddProductScreen

**Spec:** P3 · **Opens from:** The Add product Fab, Today first-run step 1, the Products empty state, and "Add" on a bought shopping item.

Full-screen form with three questions: name, area (Skin, Hair, Both), and "Is it open?". Open shows the opened date and Use within chips (3M, 6M, 12M, 24M) with the open-jar hint; Not yet shows the optional printed expiry. A line under the fields shows the computed expiry date. "More details" expands the rest of the form in place (photo, brand, category, price, ingredients).

- Used for every new product, not only the first. The first time, the title is "Your first product".
- Bottom bar: Save product (filled) and "Save and add another" (ghost), which saves, shows a toast and clears the form for the next bottle.
- The open / not-yet area reserves 176px so switching does not move anything.
- Saving the first product with a date opens ReminderAskSheet. Later products go back to Products with a toast.

## IngredientPickerSheet

**Spec:** P4 · **Opens from:** Ingredients field in the product form.

Search the ingredient list, tap to add chips, "Add 'niacinamide'" when not found. "One per line" mode: a multi-line field where each line becomes one ingredient chip, so names typed with a comma stay whole. Blank lines are ignored, extra spaces trimmed, duplicates merged case-insensitively.

- Conflicting chips show a link icon; avoided ones are red.
- **Pasted lists:** when a paste contains a line with two or more commas (a list copied from a pack or a shop), that line is split at the commas and the hint says "Pasted list split at commas into 5 lines." with Undo. Typing is never split. The chip preview and the Save button count ("Save 5 ingredients") always match the lines.

## ArchiveScreen

**Spec:** P5 · **Opens from:** "Archive (N)" on Products.

Finished products, newest first, with finished date and cost per day. Sort by date or cost per day. The More button on a row opens an action sheet: Restore to Products, Buy again, Delete (asks first).

- The actions are a sheet over a scrim (rn-primitives `DropdownMenu` on tablets), never drawn inline in the list.
- Toasts: "Clay mask restored to Products · Undo" here. "Name moved to Archive · Undo" shows on Products and product detail, where Mark finished happens.

## ShoppingScreen

**Spec:** P6 · **Opens from:** Shopping segment on Products, or the Shopping list row on Today.

Suggested (collapsible), To buy with All/Skin/Hair chips, Want to try, Bought. Header word Share (`share-2`, opens the share sheet with the list as text); add is the Fab "Add item".

- A bought item that is not yet a product shows an inline line under it: "Add it to your products to track when it expires." with an Add button, which opens Add product pre-filled. It stays until the item leaves the list, so it never times out like a toast.
- Clear bought shows a toast with Undo; rows collapse with fade plus height (200ms).

## ShoppingItemSheet

**Spec:** P7 · **Opens from:** The Add item Fab on Shopping.

Toggle Buy again (pick product) / New item. New item: name, brand, area, list (To buy / Want to try), note.

## ProductNoteSheet

**Spec:** P8 · **Opens from:** Add note on product detail.

Date, text (required, max 280) and quick tags. Save.

- Quick tags are the 7 skin tags in the standard order (Calm, Glow, Oily, Dry, Breakout, Redness, Itchy).

## HairScreen

**Spec:** R1 · **Opens from:** Hair segment on the Routines tab.

Two groups, Washes and Other care (trims, colour, scrubs). Rows show frequency, last done as a date ("Last 18 Aug") and next due. The add action is the Fab "New hair task".

- Washes count toward the hair streak; other care does not.

## RoutinesScreen

**Spec:** R1 · **Opens from:** Routines tab.

Skin / Hair switch. Each card shows the routine name, WeekdayDots, "Reminder at 07:30" or "No reminder", step count, ConflictTag, active switch and a Start button. The add action is the Fab "New routine".

- No heading repeats a card's name: a single Morning routine has no "Morning" heading above it. Alternatives get a heading that explains them: "Evening, A or B" with "On nights both are set, you pick one on Today. A and B are never checked against each other for conflicts." Custom routines sit under "Custom".
- Long-press: Duplicate as variant, Delete. Empty: see EmptyStates.
- WeekdayDots show scheduled days in soft pink, so the dots never outweigh the routine name or the Start button.

## RoutineEditorScreen

**Spec:** R2 · **Opens from:** A routine card, or Create routine in the starter sheet.

Name, time-of-day chips, weekday toggles with "Every day", reminder, and a reorderable step list. Tapping a step opens the step editor sheet (R3). "Save routine" sits in a bar pinned to the bottom.

- Dragging lifts the step (scale 1.03, shadow); others slide aside.
- The conflict panel animates its height open after a save check; saving is still allowed. It ends with "What does mild mean?", which opens the Mild conflict sheet.
- Leaving with changes asks Discard / Keep editing.
- Steps in a conflict show a ConflictTag next to their schedule chips ("Mild conflict" for every-few-days steps). Conflicts are checked only against routines on the same weekday that are not alternatives at the same time of day; the panel says so ("Evening A is the other evening choice, so it is not compared.").

## RoutineStarterSheet

**Spec:** R2 (starter) · **Opens from:** Today first-run step 2 and the Routines empty state.

Morning / Evening toggle, then three templates as a radio list (Evening: Treatment, Basics, Start empty; Morning: Basics, Light, Start empty). Below, the steps filled from the user's products; a step with no matching product says "Pick a product later" in amber. Create routine opens the full R2 editor for days, time and reminder.

- The step preview reserves 176px; swapping templates fades it in place.
- Products are matched by category (cleanser, serum, moisturiser, SPF). Nothing is made until Create routine.
- Templates are a RadioList (round marks), so they never look like checkboxes.

## StepEditorSheet

**Spec:** R3 · **Opens from:** A step in the routine editor.

Product (opens the product picker), note, schedule and wait after the step.

- Schedule is a RadioList with one line of explanation per option: Every time ("Each time the routine runs"), Set days ("Only on the days you pick"), Every few days ("For example every 3 days"). A 3-way segmented control did not fit the Lithuanian labels.
- Wait after this step is a SelectField (None, 30 s, 1, 2, 5, 10, 15, 20 min) instead of nine chips.
- The schedule detail (weekday picker or interval fields) sits in a min-height box, so the sheet does not jump.

## ProductPickerSheet

**Spec:** R4 · **Opens from:** Step editor, or hair task editor.

Search, then Recent (the products last used in any step, up to 5), then all products by name as you type. No category chips. A group "Can't be picked" lists expired products with their red badge and the line "Expired products stay out of new steps. Buy it again from Products."

- Expired rows are `aria-disabled` and say why in their spoken label. Their text is not faded.
- Add new product opens Add product and returns with it selected.

## HairSetupSheet

**Spec:** R5 (quick setup) · **Opens from:** Today first-run step 3 and the Routines, Hair empty state.

Wash frequency chips (Every day, Every 2 days, Every 3 days, Twice a week, Once a week, Other), last wash chips (Today, Yesterday, 2 days ago, Pick a date), a live "Next wash" line, and an optional "Also track trims" switch (every 8 weeks). Save creates the wash task, and the trim task when on.

- Trims do not count toward the hair streak.
- Products, colour and masks are added later in the full R5 editor.

## HairTaskEditorScreen

**Spec:** R5 · **Opens from:** Hair rows or the New hair task Fab.

Type (Wash / Other care), name, products (washes only), how often (Every few days / Set days), last done, reminder. Preview line "Next due: Friday, 9 Oct". "Save task" sits in a bar pinned to the bottom.

## CalendarScreen

**Spec:** C1 · **Opens from:** Calendar tab.

Skin / Hair / Condition switch. Month grid always 6 rows, Monday first; 1 October 2026 is a Thursday. Skin: done, partly done and not done marks with the streak card ("12 days in a row · Best 21 days"). Hair: washes and other-care icons. Condition: coloured bars with a legend. Under the grid, "Open Tuesday, 6 October" and a Progress photos row ("Last photo 29 Sep · next one Sunday") that opens C3.

- Swiping months never changes the grid height. "Today" returns to the current month.
- Day marks are 12px and differ by shape as well as colour: filled (done), half (partly done), ring (not done). Each day's spoken label includes its status ("5 October, partly done"). The selected day is soft pink with ink text; today has an accent outline.
- The streak card uses `calendar-check`, never a flame. A past day with nothing done is "Not done".

## DayDetailScreen

**Spec:** C2 · **Opens from:** A day on the calendar.

Skin routines with each step, hair tasks, condition log, product notes and the week's photo thumbnail.

- Editable up to 7 days back; older days are read-only.
- The progress photo is named by its date ("Skin photo, taken 6 Oct"), never a week number.

## ProgressPhotosScreen

**Spec:** C3 · **Opens from:** The Progress photos row on Calendar, the Check-in card on Today, and the weekly photo reminder.

A pushed screen (no longer a Calendar segment). Skin / Hair switch (Hair only when the album is on), Take this week's photo, and one 3:4 tile per week labelled with the date it was taken ("6 Oct"); a missed week shows a dashed "No photo" tile and "Skipped". Header word Compare opens C7.

- No stars on the tiles: ratings show at full size on the week's screen (C6).
- Empty: "Take a photo each week to see your skin change".

## ProgressCameraScreen

**Spec:** C4 · **Opens from:** Progress photos, the Check-in card on Today, or the weekly photo reminder.

Full-screen camera with last week's photo at 30% as a guide ("Show last photo as a guide"), a face oval guide, angle label and the tips row "Same light · no makeup · hair back".

- Slide up 300ms. After each angle, the next; after the last, review.
- Colours come from the `camera-*` tokens (always dark): `camera-bg`, `camera-control`, `camera-guide` (the last photo), `camera-frame` (the face outline). No hard-coded colours.

## PhotoReviewScreen

**Spec:** C5 · **Opens from:** Progress camera.

All angles, rating 1 to 5, tags, note. Save shows "Saved privately in Jx-Care".

- Photos never go to the phone gallery.
- The title names the photo by date ("Skin photo, 6 Oct"). Tags are the 7 skin tags in the standard order.

## WeekDetailScreen

**Spec:** C6 · **Opens from:** A photo tile on Progress photos.

Angles full width, rating, tags, note and "What changed this week". Compare with…, Retake, Delete.
- Titled by the date taken ("Skin photo, 6 Oct"), never a week number.

## PhotoCompareScreen

**Spec:** C7 · **Opens from:** Week detail or Progress photos (header word Compare).

Side by side or slider modes, week pickers, the "4 weeks ago vs now" chip and an angle switcher. Pinch zooms both in sync.

- Full-screen slide up 300ms.
- The pickers are Before and After and show dates ("8 Sep", "6 Oct") with the photo as a thumbnail in the picker list; labels on the photos are dates too.

## SettingsScreen

**Spec:** S1 · **Opens from:** Settings tab.

Grouped rows: Care data (Ingredients, Conflicts, Avoid list), Notifications (Reminders), Security, Preferences (Language, Currency, Progress photos), Data (Backup and restore, Reset app), About.

- Tab cross-fade 150ms; rows push.

## IngredientsScreen

**Spec:** S2 · **Opens from:** Settings.

Ingredients / Groups segments. Ingredient rows show the group chip and "in 4 products"; group rows show member counts.

- Select mode merges duplicates such as "Niacinamide" and "niacinamide".
- Merging starts from the header word "Select", not an icon.

## ConflictsScreen

**Spec:** S3 · **Opens from:** Settings.

Rules like "Retinol × AHA" (a group side shows a group icon), the note and how many routines it affects. The editor is a sheet with two side pickers and a note.

- Saving re-checks every routine and shows "Affects 2 routines" in a callout that animates its height open.
- Each rule shows how many routines it currently fires in, or "No conflicts" when its two sides never fall on the same day.
- The intro explains mild: "Mild means one of the steps runs every few days, so they only meet on some days." Rules themselves have no strength; mild comes from the step schedules. New rule is a Fab at the bottom right.

## AvoidListScreen

**Spec:** S4 · **Opens from:** Settings.

Ingredient or group rows with a note and an "in 1 product" count. Add ingredient (Fab). Products containing them are listed below.

- Removing a row collapses it (200ms). Matching products show the red Avoid badge everywhere.
- Removing an entry with × shows "Parfum removed · Undo" for 8 seconds; Undo puts it back in the same place. Add ingredient is a Fab at the bottom right.

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

Language (applies at once), currency (EUR, USD, GBP, PLN, others), tracked skin angles, hair album, hair angles, and last photo as a guide (on/off and opacity).

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

## ExplainSheets

Short sheets that answer "what does this mean?" for the things the critique found unexplained. Each opens by tapping the thing it explains, closes with Close or a drag, and uses the user's own data.

- **Why this warning** (ConflictTag, or "Why?" in the player): the pair, where and on which days they meet, the rule's note, and that A/B alternatives are never compared. Edit the routine or see the rule.
- **Mild conflict** (a Mild conflict tag, or "What does mild mean?" in the editor): one step runs every few days, so they only meet some weeks; on those days the tag is a normal Conflict.
- **Skin streak** (StreakChip): a day counts when you finish a skin routine set for it (A or B is enough); days with nothing set are skipped; today never breaks it; an earlier day with a routine set and none finished starts it again, and the best stays. The hair streak counts washes on or before their day.
- **Evening A or B** ("About A and B" on Today): two routines at one time of day are options; the other is not missed; the pick is remembered per weekday; they are never compared with each other.

Copy follows the streak and conflict rules in the feature spec (refinements 2, 3 and 5). No icons in tinted circles; bare `ink-muted` icons lead each line.

## LithuanianCheck

The controls most likely to break in Lithuanian, shown with real Lithuanian copy at the 360px minimum width: tab bar, Today's evening card, the product action bar, the Calendar switch, the Products switch and Fab, the step schedule, quick add, and paused reminders.

- Everything fits without truncation. "Kalendorius" and "Nustatymai" fit the tab bar at 12px; "Pažymėti baigtu" fits once the action bar has three items.
- What changed to make it fit: the step schedule became a RadioList, the wait time a SelectField, the Calendar switch lost Progress (now its own screen), and the product action bar dropped More (it is in the header).
- Lithuanian dates use the ISO style ("2026-04-06"). Translators: keep these strings within about 30% of the English length, or check them here.
