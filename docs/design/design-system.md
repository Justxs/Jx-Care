# Design system

Copied from the design system artifact (https://claude.ai/artifact/6wezpPoHNSQoe9bM6GUryU, v18) on 2026-10-07 so agents can read it offline. Where it differs from docs/feature-spec.md or DESIGN.md, those win; see [README.md](README.md#known-differences).

Jx-Care is a calm, private companion, fronted by a pink spa-day frog, for one person's skin and hair care: products with their dates, daily routines, streaks and reminders, all kept on the phone. The UI should feel like a tidy bathroom shelf: soft blush neutrals, one pink accent that matches the logo, and two area colours that tell skin from hair at a glance.

## Content fundamentals

- Two languages, Lithuanian and English, chosen at first launch and switchable in Settings. Write every string for both; Lithuanian runs about 20% longer, so never size a control to the English word.
- Address the person as "you" in English and with the polite plural "jūs" forms in Lithuanian. The app never says "I" or "we".
- Sentence case everywhere, including buttons and titles: "Buy again", "Mark washed today".
- Buttons start with a verb and say exactly what happens. Confirmations repeat the verb: "Reset app", not "OK".
- Dates are human and relative first, absolute second: "Expires in 9 days · 15 Oct". Use the phone's locale for formats (`lt`: 2026-10-15 style, `en`: "15 Oct", with the year only when it is not this year, "1 Mar 2027"). Date fields read "Today, 6 Oct" when the value is today.
- No emoji, no exclamation marks, no medical claims. Conflicts are warnings, never orders: "Retinol conflicts with Glycolic acid toner in your Morning routine today."

### Words we use

One word per idea, everywhere: on buttons, in toasts, in notifications and in Settings.

| Idea | Say | Not |
|---|---|---|
| Put a product on the shopping list | Buy again | To list, Add to list |
| Product is used up | Mark finished (action), Finished (state), Archive (the place) | Archived, Done, Empty |
| Start a routine | Start | Play, Go |
| Morning, evening, custom | Time of day | Slot |
| Step or task schedule | Every time, Set days, Every few days | Only on, On weekdays, Every N days |
| Trims, colour, scrubs | Other care | Events |
| Two ingredients that should not meet on a day | Conflict; Mild conflict when an every-few-days step only meets the other on some days | Clash, may clash |
| Skin and hair tags | Calm, Glow, Oily, Dry, Breakout, Redness, Itchy | Dryness, Oiliness, Irritation |
| The weekly photo | Weekly photo, progress photo | Check-in |
| The last photo shown while shooting | Last photo as a guide | Overlay |
| Tick every step at once | All done | Complete all, Finish |
| A past day with routines set and none finished | Not done | Missed, Failed |
| A photo | Its date: "6 Oct" | Week 41 |
| Today's check-in card (weekly photo and condition) | Check-in | Daily log |

### Errors and warnings

- Say what happened, then what to do: "1234 is too easy to guess. Try another." Never guess at a cause the app does not know.
- Field errors sit under the field and name the fix: "Enter a name." They replace the hint in the same space, so nothing moves.
- Warnings that do not block say so: "2 conflicts this week. You can still save." Warnings that lead to a confirm say that: "Parfum is on your avoid list. Saving asks you to confirm."
- Destructive actions say what is lost and whether it can be undone: "Asks first. This cannot be undone."

### States

- Empty: what the list will hold, and the one action that fills it (see EmptyStates).
- Success: a toast that names the thing and offers Undo: "Parfum removed · Undo". A next step that needs a decision sits inline on the row instead (Shopping: "Add it to your products to track when it expires." with an Add button), so it does not time out. Toasts stay 8 seconds; while a screen reader is on they stay until the next action or until dismissed.
- Done: the end of a routine and the end of setup are designed moments (RoutineDoneScreen, the "You're set" card): the frog, what was done, the streak, and what comes next. No confetti.
- Explaining: any warning or number the user might not understand opens a short sheet when tapped (ExplainSheets): the Conflict and Mild conflict tags, the streak chips, and "About A and B" on Today.
- Waiting: name what is waiting and how long: "Wait 0:42 before the next step", with "Skip wait", never a bare "Skip".
- Icon-only buttons always have a spoken label that says the action: "Delete last digit", "More actions", "Show last photo as a guide". Icon-only is kept for the few icons everyone knows (back, close, more, search, filter, calendar arrows); any other header action is a word: Select, Share, Compare.

## Visual foundations

**Colour.** The camera screen is always dark and uses its own `camera-*` tokens in both themes. Screens sit on `canvas`; content groups sit in `surface` cards. Text is `ink`, secondary text `ink-muted`. `brand-pink` is the logo pink: use it for the logo and large decorative shapes only, never for text or small icons. `accent` (pink) marks the one primary action per screen, the active tab, checked controls and links; text on an accent fill is `on-accent`. `skin` and `hair` (with their `-soft` fills) mean care area only. `ok`, `warning`, `danger` and `neutral` mean expiry status only, and always come with a word. `border` is for hairlines; use `border-strong` for the edge of anything you can press or type into. Both themes are designed; every text pair named in a token's usage note reaches 4.5:1 in light and dark.

**Type.** One family, Figtree (Google Fonts, chosen by Justas on 2026-10-06 in place of Plus Jakarta Sans), which covers Lithuanian diacritics (ą č ę ė į š ų ū ž). Screen titles `title-l`, pushed-screen titles `title-m`, section headings `title-s`, product and step names `body-strong`, everything else `body`, `label` or `caption`. Group labels inside a card use `overline` (13px semibold, sentence case, never uppercase); a Card title sits above the card. Nothing smaller than 13px except tab bar labels and single-letter weekday dots (12px). Streak numbers use `display`.

**Spacing and layout.** Phone-first at 390 × 844. Screen gutter `space-4` (onboarding and lock: `space-6`). Cards are `space-4` apart with `space-4` padding; rows inside cards are `space-3` apart. Touch targets are at least 44px; buttons are 52px. Chips (36px), switches and checkboxes draw smaller but get `hitSlop` up to 44px.

**Shape and depth.** Cards `radius-lg`, buttons and inputs `radius-md`, thumbs `radius-sm`, checkboxes 7px (square, so they never read as radio buttons), everything round (badges, chips, radio marks, keys) `radius-full`. Cards lift with `shadow-card`; only dialogs and menus use `shadow-raised`. No borders on cards, and never a border plus a wide shadow on the same surface.

**States.** Focus is a 2px `focus` ring with 2px offset. Pressed lowers opacity to 85%. Disabled is 45% opacity and not pressable. Done routine steps keep their row and turn the name `ink-muted`.


## Components and rn-primitives

The app's base components come from rn-primitives (https://rnprimitives.com/), styled with these tokens. Map them like this:

| Here | rn-primitives |
| --- | --- |
| Checkbox | `Checkbox` (square) |
| RadioList | `RadioGroup`; round marks, one row per option |
| Fab | `Pressable` + `Text` (no primitive) |
| Switch | `Switch` |
| ToggleGroup | `ToggleGroup` (type single); `Tabs` when panels stay mounted |
| Progress | `Progress` |
| Separator | `Separator` |
| Input | `Label` + RN `TextInput` |
| AlertDialog | `AlertDialog` |
| Button, Badge, AreaTag | `Slot` + `Pressable` / `Text` (no primitive) |
| Select for expiry warning days, auto-lock | `Select` |
| Product and routine actions menu | `DropdownMenu` |
| Chip | `Toggle`; a set of tags is `ToggleGroup` type multiple |
| Rating, WeekdayPicker | `ToggleGroup` (single / multiple) |
| SelectField | `Select` + `Label` |
| ListRow | `Pressable`, with `Switch` when it toggles |
| Toast | `Portal` + Reanimated (floats above the tab bar) |
| ProgressRing | `react-native-svg` circle |

TabBar is Expo Router's `Tabs` with a custom bar. ScreenHeader replaces the native stack header; SheetFrame wraps modal routes. ProductRow, RoutineStep, StreakCard, PinPad, PhotoTile, StepDots and Skeleton are app components composed from the above.

## Motion

Every screen change and every state change animates, briefly and the same way everywhere, using Reanimated 4 and Expo Router's native transitions. Nothing on screen ever jumps. The Transitions card plays each one; `JxCare.motion` and the CSS variables `--dur-*` / `--ease-*` carry the values. Timings follow the feature spec.

| Movement | Animation | Time |
| --- | --- | --- |
| Bottom tabs | Cross-fade, no slide | 150ms |
| Push a screen | Native: slide from right on iOS, fade-through on Android | System default |
| Full-screen flows (routine player, camera, compare) | Slide up; close slides down | 300ms |
| Sheets | Slide up with backdrop fade; drag down to dismiss | Spring, about 300ms (`motion.spring`, critically damped: no overshoot) |
| Dialogs | Fade in and scale 0.96 to 1 | 200ms |
| Segmented switch inside a tab | Indicator slides; content cross-fades | 200ms |
| List item added or removed | Fade plus height open or close | 200ms |
| Dragging a routine step | Lifts (scale 1.03, `shadow-raised`), others slide aside | Live |
| Ticking a step | Checkbox fills, light haptic | 150ms |
| Routine finished | Card collapses to a ticked row; streak counts up | 250ms |
| Wrong PIN | Dots shake | 300ms |

- Easing: `enter` (ease-out) when things arrive, `exit` (ease-in) when they leave, `standard` for things moving on screen.
- Reduce Motion on: slides and scales become 100ms fades, and counters show the final number at once.

## Layout stability

Content must not shift after it appears. The rules that keep it still:

- **Skeletons, not spinners.** While data loads, each list and card shows a Skeleton at the exact final size (product row 72pt, routine card, calendar grid). Content replaces it in place with a 150ms fade.
- **Paint Today complete.** Today's data is prefetched while the lock screen is open, so no section pops in after the first frame.
- **Fonts first.** Keep the splash screen up until Figtree has loaded.
- **Reserved image boxes.** Product thumbnail 48 × 48, product photo 1:1, progress photos 3:4, each with a placeholder fill before the image decodes.
- **Reserved helper line.** Every form field keeps a one-line slot under it for helper or error text (Input and SelectField do this by default), so a validation message never pushes the fields below.
- **Stable numbers.** Countdowns, day counts and prices use tabular figures, and badges have a minimum width, so "9 days" to "10 days" does not shift the row.
- **Fixed calendar height.** The month grid always has 6 rows.
- **Overlays float.** Toasts, the wait-timer bar and the Undo bar float above the tab bar instead of being inserted between items.
- **Late sections open smoothly.** A section that appears after an action (a conflict panel after save) animates its height open.
- **Lithuanian text.** Layouts use minimum heights, never fixed ones, so longer Lithuanian labels wrap to two lines instead of truncating or overlapping. Tab bar labels are sized for the Lithuanian words.
- **Keyboard.** Forms scroll the focused field into view smoothly; the screen never jumps when the keyboard opens.

## Screens and navigation

The Screens group follows the feature spec's screen inventory; each card's subtitle carries its spec ID (O1–O5, L1–L2, T1–T4, P1–P8, R1–R5, C1–C7, S1–S8). Five bottom tabs: Today, Products (My products and Shopping), Routines (Skin and Hair), Calendar (Skin, Hair and Condition, with Progress photos as a row that opens its own screen) and Settings.

**Where actions sit.** Everything the thumb needs is at the bottom. A list screen's one add action is a Fab (labelled pill, bottom right, above the tab bar), never a + in the header. A form screen's Save is a full-width button in a bar pinned to the bottom (sheets already have it in their footer). The header holds back or close, the title, and at most one word action (Select, Share, Compare) or the More menu. Lists keep 96px of empty space at their end so the last row can scroll clear of the Fab.

**Choices.** Two short options: ToggleGroup. Three or more, or labels that run long in Lithuanian: RadioList. Long value lists (wait times, currencies): SelectField with a picker. The LithuanianCheck card shows the longest Lithuanian labels in their real controls at 360px. Pushed screens use ScreenHeader, forms in sheets use SheetFrame, and the routine player, camera and compare are full-screen flows. Styling in the app is NativeWind; see the NativeWind section for the theme config.

## First run

Onboarding is five steps (language, PIN, confirm, recovery question, Face ID) and asks for nothing else. Notification permission is asked in context, right after the first product with an expiry date is saved (ReminderAskSheet), so the phone's prompt has a reason next to it.

- **Today, first run (T1):** a "Set up Jx-Care" card with three steps: first product, first routine, hair care. The next step is open with a filled button; the others are rows. Each opens the short version of its form. Done steps turn into a green check with what was made. When all three are done the card becomes "You're set" with the frog and a "See today" button, and goes away the next day. Every step can be skipped.
- **Add product (P3):** every new product, not only the first, opens the short form: name, area, whether it is open, and the open-jar period or printed expiry. A live line shows the expiry date. Photo, brand, price and ingredients sit behind "More details". "Save and add another" keeps the form open for the next bottle. The full form (ProductFormScreen) is for editing.
- **First routine (R2, starter):** pick morning or evening, then a template. Steps are filled from the user's products; a gap says "Pick a product later" in amber.
- **Hair care (R5, quick setup):** wash frequency, last wash, and an optional trim reminder, with a live "Next wash" line.
- **Empty states:** every list says what it will hold and offers the one action that fills it (EmptyStates card). Conflicts offers a pack of common rules before a blank form.

## What we avoid

Checked against the impeccable.style anti-pattern list (2026-10-06 review). These read as generated rather than designed, so the app does not use them:

- **Icon tiles.** No icon inside a tinted square or circle beside a row or above a heading. Row icons are bare `ink-muted`; onboarding steps lead with the words, not a big icon badge.
- **Uppercase overlines and labels above titles.** No small caps label over a heading. Counts and dates go under the title or into the content.
- **Sparkle as a stand-in for "skin".** Area is a word in a coloured pill. Product placeholders use a category glyph on a neutral square; photo placeholders are a plain tone.
- **Cards for everything.** Never a card in a card. Helper lines, notes and "next due" lines sit on the canvas as text, not in tinted callout boxes. Callouts are only for warnings that need action (old backup, conflict, avoided ingredient).
- **Filled accent everywhere.** One filled accent button per screen (the Fab counts as it on list screens). Header actions are a word, never a filled or tinted circle; back and close have no circle.
- **Guilt.** Streaks use `calendar-check`, never a flame. A broken streak says "Started again. Your best is still 21 days." and a past day with nothing done is "Not done", never "Missed".
- **Overshoot.** No bounce or elastic easing; sheets use a critically damped spring.
- **Tiny text.** Nothing under 13px except tab bar labels and weekday dots.
- **Generic copy.** No "supercharge", no slogans, no em-dashes in UI strings; say what happens.

## Iconography

Lucide icons (`lucide-react-native` in the app), stroke 2, round caps and joins, 16 to 24px, coloured with the text colour they sit beside. The Icons group holds the set in use; the files are drawn in `ink` (#1F2421) because an `<img>` cannot inherit colour. Care area has no icon of its own (it is a word); product placeholders use category glyphs: `pipette`, `droplet`, `sun`, `spray-can`, `flask-round`. Hair tasks use `droplets` (wash), `flask-round` (mask), `scissors` (trim), `palette` (colour). Streaks use `calendar-check`; All done uses `check-check`; Products shelf and list views use `layout-grid` and `list`; Share uses `share-2`; showing a hidden answer uses `eye` / `eye-off`; help uses `circle-help`.

## Logo

The mark is a minimal frog with cucumber slices on its eyes, a spa-day frog, in `brand-pink` (Logos group). It is the app icon and sits above the title on the lock screen and onboarding, at 64px or more. Keep it single-colour `brand-pink`; it reads on `canvas` and `surface` in both themes. Never recolour it to `accent`. Beside the mark, set the name "Jx-Care" in `title-l`.
