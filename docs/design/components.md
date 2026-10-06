# Components

Copied from the design system artifact (https://claude.ai/artifact/6wezpPoHNSQoe9bM6GUryU, v14) on 2026-10-06 so agents can read it offline. Where it differs from docs/feature-spec.md or DESIGN.md, those win; see [README.md](README.md#known-differences).

Props for each component are in [components.d.ts](components.d.ts). The web previews in the artifact are React DOM, not React Native: rebuild each component with rn-primitives and NativeWind, keeping the props, sizes, tokens and states described here.

## AlertDialog

Confirmation for destructive or irreversible actions: Reset app, Delete product, Clear bought items.

**Built on:** rn-primitives `AlertDialog` (`Root`, `Portal`, `Overlay`, `Content`, `Title`, `Description`, `Cancel`, `Action`).

**Consumer provides:** `title` (the question), `description` (what will be lost), `actionLabel` (the verb), `destructive`, `onAction`, `onCancel`.

- Reset app asks twice: the second dialog names that all products, routines and logs are deleted and suggests exporting a backup first.
- Action label repeats the verb ("Reset app"), never "OK".

- Reset copy names what is lost, with real counts, and never suggests something the person cannot do from where they are. From Forgot PIN (locked out): "This deletes 84 products, 6 routines and 52 progress photos. Progress photos are not in your gallery, so they are lost too. Your last backup is from 1 Sep; you can restore it after the reset." From Settings, Reset app (unlocked) it adds an Export backup button above Reset app. Both then ask the person to type RESET.

## AreaTag

Skin or hair tag that marks which care area a product, routine or streak belongs to.

**Built on:** same Slot + Text pattern as Badge.

**Consumer provides:** `area`: `skin` | `hair` | `both` ("Skin + hair").

- Text only, no icon: skin is peach (`skin` on `skin-soft`), hair is lavender (`hair` on `hair-soft`). The word carries the meaning; a decorative glyph next to it only adds noise. Use these two hues only for area, never for status.

## Badge

Expiry status pill on products: OK, Expiring soon, Expired, Not opened.

**Built on:** rn-primitives `Slot` around a `View` + `Text` (react-native-reusables Badge pattern).

**Consumer provides:** `status`: `ok` | `expiring` | `expired` | `unopened`. Optional `children` overrides the word (use for LT copy: "Gerai", "Baigia galioti", "Nebegalioja", "Neatidaryta").

- Status comes from the effective expiry: the earlier of the printed date and opened date + PAO. Expiring soon = inside the warning window (30 days by default).
- Every status shows a word, never just the colour dot, so ok and danger are never told apart by hue alone.
- Tone pairs: `ok` on `ok-soft`, `warning` on `warning-soft`, `danger` on `danger-soft`, `neutral` on `neutral-soft`.

## Button

Full-width action button for the one thing a screen is for.

**Built on:** `Pressable` wrapped in rn-primitives `Slot` (react-native-reusables Button pattern); no rn-primitives Button exists.

**Consumer provides:** `children` (label text, verb first, sentence case), `variant`, `onPress`, optional `icon` name from the Icons group.

- `primary` (accent fill, `on-accent` text): at most one per screen. "Save routine", "Continue".
- `secondary` (surface, `border-strong` edge, accent text): alternatives beside or under a primary. "Buy again".
- `ghost`: low-emphasis links such as "Forgot PIN?".
- `danger` (`danger-soft` fill, `danger` text): destructive actions, only behind an AlertDialog ("Reset app").
- Height 52, radius `radius-md`, label in `body-strong`. Full width by default inside the 16px gutter; pass `block={false}` in rows.
- Don't put two primary buttons on one screen; don't use colour alone for danger, the label says what happens.

## Card

White container that groups related content on the canvas.

**Built on:** a plain `View`; no primitive.

**Consumer provides:** `children`, optional `title` (a sentence-case heading drawn above the card, not inside it), `flush` for full-bleed lists of rows.

- `surface` fill, radius `radius-lg`, padding `space-4`, `shadow-card`. Cards sit `space-4` apart. Never nest a card in a card; inside a card, group with Separators and spacing. Not every section needs a card: helper text and one-line notes sit straight on the canvas.

## Checkbox

Round tick used for routine steps, shopping items and hair tasks.

**Built on:** rn-primitives `Checkbox` (`Checkbox.Root` + `Checkbox.Indicator`), controlled with `checked` / `onCheckedChange`.

**Consumer provides:** `checked`, `onCheckedChange`, and a `label` or `aria-label`.

- 26px circle: unchecked is `surface` with a 2px `border-strong` ring; checked fills `accent` with an `on-accent` check.
- Keep the hit area at least 44px by giving the row the press handler too.

## Chip

A pressable pill for filters (Products), tags (condition log) and quick picks (wait timers).

**Built on:** rn-primitives `Toggle` (single chip) or `ToggleGroup` type multiple (a set of tags).

**Consumer provides:** `selected`, `onPressedChange`, label, optional `icon` and `count`, `tone="danger"` for avoid-list chips.

- 36px tall; put chips in a horizontally scrolling row (filters) or a wrapping row (tags).
- Selected is `accent-soft` with an `accent` border and text. Counts use tabular numbers so the chip width does not change as numbers change.

## ConflictTag

The one way a conflict is shown: an amber pill with a triangle and the word "Conflict", or "Mild conflict" for steps that only sometimes meet (every-few-days schedules). Used on Today routine cards, Routines cards, routine player steps and routine editor steps.

**Built on:** RN `Pressable` (when `onPress` is set) or `View`, Icon, `warning` and `warning-soft` tokens.

**Consumer provides:** `mild`, `onPress`, optional `label`.

- Amber, never red. Red is for expiry and the avoid list only.
- Always carries the word, never colour alone, so it reads for screen readers and colour-blind users.
- Tappable version has a 44pt hit area (`hitSlop`) and opens a sheet with the full line, for example "Glycolic acid toner (Evening B) and Vitamin C serum (Morning) are both on today. Together they can irritate."
- Two routines at the same time of day (A/B) are alternatives and are never compared with each other.

## EmptyState

What a list shows when it has nothing yet: a plain icon in `ink-muted` (no circle or tile behind it), a title, one line of help and the action that fills it.

**Built on:** RN `View`, Icon and Button.

**Consumer provides:** `icon`, `title`, help text as children, `actionLabel`, `actionIcon`, `onAction`, and an optional ghost `secondaryLabel` / `onSecondary`.

- Sits where the first rows would be, with a min height equal to three rows, so adding the first item does not jump the screen.
- Used by Products, Shopping, Routines, Hair, Calendar, Progress, Archive, Avoid list and Conflicts. The copy for each is on the EmptyStates card.
- One filled button at most. The second action, when there is one, is a ghost button.

## Icon

Lucide icon by name, drawn in the current text colour.

**Consumer provides:** `name` (one of the Icons group), `size` (16, 18, 20 or 24), optional `color`, and `label` when the icon carries meaning on its own.

- In the app use `lucide-react-native` with the same names. Stroke width 2, round caps.

## Input

Text field with a label above, for product, routine and hair task forms.

**Built on:** rn-primitives `Label` + React Native `TextInput` (rn-primitives has no input primitive), wired to TanStack Form fields.

**Consumer provides:** `label`, `value` / `onChange`, optional `placeholder`, `hint`, `error`, `inputMode` (`numeric` for size and PAO months).

- 48px, radius `radius-md`, `border-strong` edge, text `body`. Error swaps the edge to `danger` and shows the message under the field; say how to fix it ("Enter months as a number, e.g. 12").

## ListRow

One row in a grouped list: Settings, routine summaries, calendar day detail, reaction notes.

**Built on:** RN `Pressable`; with `trailing="switch"` the row holds an rn-primitives `Switch` and the row itself is not pressable.

**Consumer provides:** `label`, optional `detail`, `icon` (drawn bare in `ink-muted`, no tile behind it), `value` (right-hand text), `trailing` (`chevron` default, `switch`, `value` for text with no chevron, `none`), `checked`/`onCheckedChange` for switches, `tone="danger"` for destructive rows, `onPress`.

- Leave `icon` out when every row would get the same or a decorative one; icons earn their place by telling rows apart.
- Minimum 56px. Put rows in a flush Card divided by inset Separators.
- Destructive rows (Reset app) always open an AlertDialog before acting.

## PhotoTile

A progress photo or the "add photo" slot, always 3:4.

**Built on:** RN `Pressable` + `expo-image` with a fixed `aspectRatio: 3/4` and `contentFit="cover"`.

**Consumer provides:** `src` (local file URI), `date`, `selected` (compare mode), `add` for the add slot, `label`.

- The tile reserves its 3:4 box before the image decodes and shows a neutral placeholder tone underneath (no glyph), so the grid never reflows. Use `expo-image` `transition={220}` for the fade-in.
- Photos never leave the phone. Hair tiles appear only when the hair album is switched on in Settings.

## PinPad

Four PIN dots and the number keypad for creating and entering the PIN.

**Consumer provides:** `filled` (0 to 4), `onDigit`, `onDelete`, `biometric` (shows the Face ID / fingerprint key bottom-left once biometrics are on).

- Keys are 76px `surface` circles with digits in `title-l`. Never show the digits typed.
- After 5 wrong tries, disable the keys for 30 seconds and say so above the dots.

## ProductRow

One product in the Products list or the Expiring soon card: thumb, name, brand and category, expiry line, status badge.

**Built on:** `Pressable` row; composes Badge.

**Consumer provides:** `name`, `meta` ("Brand · Category"), `expiry` (human date: "Expires in 9 days · 15 Oct"), `status`, `badge` (days text), `avoid`, optional `category` (else read from `meta`), `src` (photo) and `onPress` to open the detail.

- Thumb is the product photo when there is one, otherwise a neutral `subtle` square with a category glyph in `ink-muted` (pipette for serums and oils, droplet for cleansers and toners, sun for SPF, spray can for shampoo and styling, flask for the rest). No tinted icon tiles.
- Rows inside a flush Card, divided by an inset Separator. Long names wrap; the badge never shrinks.

## Progress

Thin bar showing how many steps of a routine are ticked today.

**Built on:** rn-primitives `Progress` (`Progress.Root` + `Progress.Indicator`).

**Consumer provides:** `value`, `max` (step count), `aria-label`.

- 6px, `subtle` track, `accent` fill. Pair with a "2/4" label in `label` style so the number is readable without the bar.
- Fills with a transform (scaleX from the left), not by animating width, so nothing around it relayouts. In React Native: Reanimated `scaleX` with `transformOrigin: 'left'`.

## ProgressRing

Circular progress for a routine card on Today ("2/5") and the player header.

**Built on:** `react-native-svg` two `Circle`s; the bar's `strokeDashoffset` animates with Reanimated (`motion.duration.base`).

**Consumer provides:** `value`, `max`, optional `size` (44 default), `label` shown in the middle, `aria-label`.

- Turns `ok` green when complete. The label uses tabular numbers so "9/10" and "10/10" keep the ring's size.
- Fixed size: the ring never grows with its label.

## Rating

A 1–5 picker. `kind="stars"` for product ratings, `kind="scale"` (numbered pills) for daily skin and hair condition.

**Built on:** rn-primitives `ToggleGroup` type single, one item per value.

**Consumer provides:** `value`, `onValueChange`, `label` for screen readers, optional `max`.

- Each target is 44px. Show the word for the picked value next to the label ("Good"), never colour alone.
- Tapping a value on the Today check-in card opens the condition log sheet with that value already picked.

## RoutineStep

A step in a skin routine, ticked off on Today.

**Built on:** rn-primitives `Checkbox` plus text; the conflict pill is a Badge in the `warning` tone.

**Consumer provides:** `index`, `name` (the product), `note` ("2 drops · wait 5 min"), `checked`, `onCheckedChange`, `conflict` (the reason, when another product used the same day clashes).

- Conflicts are checked across the whole day, morning and evening. The pill says "Conflict"; the full reason shows in a `warning-soft` callout under the routine.

## ScreenHeader

Header for pushed screens and full-screen modals: a back (or close) button, a centred `title-m` title and one optional action.

**Built on:** RN `View` + `Pressable`; replaces the native stack header (`headerShown: false`) so it can share the screen's background.

**Consumer provides:** `title`, `onBack`, `close` (shows X for modals), optional `action` `{icon, label, onPress, primary, text}`, optional `subtitle` (shown under the title, never above it).

- Back and close are bare 44px icon buttons with no circle behind them. Forms save with a text action (`text: true`, "Save") in `accent`; a filled check circle reads as decoration, a word reads as an action.
- An icon action with `primary` gets a soft `accent-soft` circle, never a filled one: the filled accent is saved for the screen's one main button.

- Always 56px tall, and the right side keeps a 44px spacer when there is no action, so the title never moves between screens.
- Long titles wrap to two lines at most, then truncate.

## SelectField

A labelled field that opens a list: category, "use within" months, auto-lock time, expiry warning days.

**Built on:** rn-primitives `Select` (`Select.Trigger` styled like Input, `Select.Content` as a raised menu) + `Label`.

**Consumer provides:** `label`, `value` (shown text), `placeholder`, optional `hint`, `onPress`.

- Same 48px height and border as Input so mixed rows line up. Long values truncate with an ellipsis instead of wrapping.

## Separator

Hairline between rows inside a card.

**Built on:** rn-primitives `Separator`.

- 1px `border`. Use `inset` to start after a 48px thumb so the line aligns with the text column. Never use a separator between cards; use the `space-4` gap.

## SheetFrame

The frame for bottom sheets: grabber, Cancel, centred title, scrolling body and a pinned footer button.

**Built on:** Expo Router modal route with `presentation: 'formSheet'` (iOS) / `@gorhom/bottom-sheet` on Android, content styled with this frame.

**Consumer provides:** `title`, `onCancel`, children (the form), `footer` (usually one primary Button).

- Opens over the current screen with the slow 320ms enter curve; swipe down or Cancel closes it. If the form has changes, closing asks first.
- The footer is pinned and the body scrolls, so the keyboard never pushes the Save button off screen (use `react-native-keyboard-controller`).

## Skeleton

A placeholder block shown at the exact size of the content that will replace it.

**Built on:** RN `View` with a Reanimated opacity pulse (no primitive).

**Consumer provides:** `width`, `height`, `radius` matching the final content.

- Use it only where data can take noticeable time (decoding photos, first open after an update). Data from SQLite is normally ready on the first frame: render it directly.
- Never swap a spinner for content. The real content fades in over the skeleton (base 220ms) so nothing below moves.

## StepDots

Onboarding progress: three steps (language, PIN, recovery question).

**Built on:** RN `View`; exposed to screen readers as a progressbar ("Step 2 of 3").

**Consumer provides:** `count`, `index`.

- The current dot stretches to 24px over base 220ms; it sits in a fixed-height row so screens below it never shift.

## StreakCard

Current and best streak for skin or hair, shown on Today and Calendar.

**Consumer provides:** `area`, `value` (current days), `best`.

- Skin and hair keep separate streaks. A day with nothing scheduled neither breaks nor extends one.
- Two cards side by side, each filling half the row.

## StreakChip

Compact streak for headers and the Today top row. Skin and hair streaks are always separate.

**Built on:** Badge with the area colours.

**Consumer provides:** `area` (skin or hair), `value` in days.

- Reads "flame 12 skin": the area is a word, not a second icon.
- Tabular numbers and the badge minimum width keep it from changing size as the count grows. The big version is StreakCard.

## Switch

On/off control for settings such as Face ID unlock and routine reminders.

**Built on:** rn-primitives `Switch` (`Switch.Root` + `Switch.Thumb`).

**Consumer provides:** `checked`, `onCheckedChange`, `aria-label` (or a visible label in the same row).

- Track `border-strong` when off, `accent` when on; thumb is `surface`. Changes apply immediately, no Save button.

## TabBar

Bottom navigation with five tabs: Today, Products, Routines, Calendar, Settings.

**Built on:** Expo Router `Tabs` with a custom `tabBar`; not an rn-primitives component.

**Consumer provides:** `active` and `onChange`; `labels` for the LT copy (Šiandien, Produktai, Rutinos, Kalendorius, Nustatymai).

- Active tab is `accent` with a semibold label; others `ink-muted`. Icons from the Icons group, 24px.

## Toast

Short confirmation with an optional Undo, floating above the tab bar.

**Built on:** a Portal-hosted `View` (rn-primitives `Portal`) animated with Reanimated `FadeInDown` / `FadeOutDown` (200ms).

**Consumer provides:** text, optional `icon`, `actionLabel` + `onAction` (Undo).

- Floats over content above the tab bar or the timer bar; it never pushes the layout.
- Stays 4 s, or 6 s when it has an action. One at a time; a new one replaces the old one with a cross-fade.
- Announced to screen readers with `accessibilityLiveRegion="polite"`.

## ToggleGroup

Segmented single-choice switch: Products / Shopping, Skin / Hair, Morning / Evening / Custom, LT / EN.

**Built on:** rn-primitives `ToggleGroup` with `type="single"` (`ToggleGroup.Root` + `ToggleGroup.Item`). Use `Tabs` from rn-primitives instead only when each option owns a whole panel that stays mounted.

**Consumer provides:** `items` (`value`, `label`, optional `icon`, optional `count`), `value`, `onValueChange`, `aria-label`.

- 42px tall (items 34px plus the 4px track) so the press area is close to 44px; `size="sm"` is 32px and needs `hitSlop`.
- Labels only for care area (Skin / Hair); icons only where the label alone is ambiguous.
- Track `subtle`, selected item `surface` with `shadow-card` and `ink` text; others `ink-muted`.
- `count` shows a small accent pill, used for the number of items to buy.
- `size="sm"` makes a compact inline group (LT / EN in Settings).

## WeekdayDots

Read-only schedule preview on routine and hair task rows: seven small day letters, the scheduled ones in soft pink (accent-soft with accent text), the rest plain.

**Built on:** RN `View` row of `Text`; the editable version is WeekdayPicker.

**Consumer provides:** `value` (indexes 0 = Monday), `aria-label` that reads the days in words.

- Letters come from the locale (P A T K P Š S in Lithuanian), every dot has the same fixed width.
- Spoken label lists the days in words ("Monday, Tuesday, Wednesday, Friday, Sunday" or "Every day").

## WeekdayPicker

Seven day toggles for "use this step on these days" and routine repeats.

**Built on:** rn-primitives `ToggleGroup` type multiple.

**Consumer provides:** `value` (array of day indexes, Monday = 0), `onValueChange`, `aria-label`, and localised `short`/`labels` (Lithuanian: P A T K Pn Š S).

- The week starts on Monday in both languages. Each day is at least 36px wide and 40px tall.

## Transitions

Live demos of the transitions every screen uses, timed to the feature spec. Tap a tile to play and reverse it.

**Built on:** Expo Router stack and tabs animations plus Reanimated layout animations, timed with `JxCare.motion`.

- Push and back: native stack defaults (slide from right on iOS, fade-through on Android), gesture back on.
- Full-screen flows (routine player, product form, progress camera): `presentation: 'fullScreenModal'`, `animation: 'slide_from_bottom'`, 300ms.
- Tabs: `animation: 'fade'`, 150ms. Segmented controls: sliding indicator plus 200ms cross-fade; the header, toggle and tab bar never move.
- Sheets: `@gorhom/bottom-sheet` spring (`motion.spring`, damping 34 / stiffness 280, critically damped so it settles without overshoot, about 300ms); scrim fades, the screen behind scales to 94% on iOS.
- Dialogs: fade and scale 0.96 to 1, 200ms.
- Rows (200ms): Reanimated `entering={FadeIn}`, `exiting={FadeOut}`, `layout={LinearTransition}` so neighbours glide.
- Loading: Skeleton at final size, content fades over it.
- Tick 150ms, routine finished 250ms, wrong PIN shake 300ms. Dragging a step lifts it to scale 1.03 with a shadow.
- Enter uses ease-out, leave uses ease-in. With Reduce Motion on, everything becomes a 100ms fade.
