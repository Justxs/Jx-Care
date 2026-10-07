# 009 Forms, sheets, dialogs and toasts

**Phase:** B. UI kit and shell · **Depends on:** 008 · **Spec:** Global UI rules (Touch, States, Destructive actions), Words and copy (errors, toasts), Motion and layout stability (reserved helper line, keyboard, overlays float, late sections) · **Design:** [components.md](../design/components.md) Input, SelectField, AlertDialog, SheetFrame, Toast, ScreenHeader, EmptyState, Transitions

## Goal

The form fields, overlays and feedback pieces, wired to TanStack Form and the toast store, so every form and sheet in later tasks behaves the same: errors replace hints in place, the keyboard never makes the screen jump, sheets settle without bounce and toasts float.

## Scope

In: `pnpm add @tanstack/react-form@latest zod@latest @gorhom/bottom-sheet@latest`, `pnpm expo install react-native-gesture-handler react-native-keyboard-controller @react-native-community/datetimepicker`, and `@rn-primitives/alert-dialog`, `select`, `dropdown-menu`.

### Form fields (`src/components/ui/`)

| Component | Notes |
| --- | --- |
| `Field` | Label above, control, and **one reserved line** under it (min height of one `caption` line: 13 px text on an 18 px line) that shows the hint or, when invalid, the error in `danger` in the same space. Every field below uses it |
| `Input` | 48 px, `rounded-md`, `border-strong` edge (`danger` when invalid), `text-body`; `multiline` variant grows with content up to a max height, then scrolls; `numeric` and `decimal` keyboards; `suffix` slot (currency, "ml"); `type` (`text` or `password`, maps to `secureTextEntry`); `secret` hides the value as typed and adds a 44 pt eye button (`eye` / `eye-off`) that shows it, with spoken labels "Show answer" / "Hide answer" (used for the recovery answer, tasks 017 and 018) |
| `SelectField` | Looks like Input; opens rn-primitives `Select` (short lists) or a sheet (long lists such as category, currency); long values truncate. Long value lists use it instead of chips (the wait after a step is a `SelectField`) |
| `DateField` | Shows `formatDateField()` ("Today, 6 Oct"); opens the native date picker (`@react-native-community/datetimepicker`) in a sheet on iOS and the dialog on Android; `min`/`max` |
| `TimeField` | Same for "HH:mm" |
| `ChipField` | A labelled `ChipGroup` with the reserved line (PAO chips, tags) |
| `useAppForm()` | A thin wrapper over TanStack Form's `useForm` with a zod validator adapter, `onBlur` and `onSubmit` validation, errors mapped from i18n keys to text, and an `isDirty` flag for "Discard changes?" |

**`BottomBar`**: form screens put Save in a bar pinned to the bottom, never in the header (spec Global UI rules, Touch): a full-width primary button and an optional ghost second button ("Save and add another"). The form scrolls above it, so it never covers the last field. Sheets keep their pinned footer instead.

Forms scroll the focused field into view with `KeyboardAwareScrollView` from `react-native-keyboard-controller`; the screen never jumps when the keyboard opens. Add `KeyboardProvider` at the root.

### Overlays

- **`AlertDialog`** (rn-primitives): title, description (what is lost and whether it can be undone), cancel and action labels from the caller, `destructive` styles the action in `danger`. Enter: fade and scale 0.96 → 1 in 200 ms. Optional **`confirmText`** prop: the action stays disabled until the person types it exactly (used for "RESET").
- **`Sheet`** + **`SheetFrame`** (`@gorhom/bottom-sheet` `BottomSheetModal` on both platforms): grabber, Cancel, centred title, scrolling body, **pinned footer** for the one primary button; spring `motion.spring` (critically damped, no overshoot), backdrop fades; drag down to close. If the content is dirty, closing asks "Discard changes?" first. Provide `BottomSheetModalProvider` at the root. Sheets that need a route (opened from notifications, e.g. Hair task done) are modal routes that render a `SheetFrame`; others are opened in place.
- **`DropdownMenu`** for "More actions" overflow menus (spoken label "More actions").

### Feedback

- **`ToastHost`** at the root, reading `uiStore` from task 005: one toast at a time, floating above the tab bar (and above the player's timer bar), enters with `FadeInDown` 200 ms, a new toast cross-fades over the old; stays **8 s**, and while a screen reader is on it stays until the next action or until dismissed, so Undo can always be reached; `accessibilityLiveRegion="polite"`. `showToast` is the only API. A next step that needs a decision goes inline on the row instead, so it never times out.
- **`EmptyState`**: bare `ink-muted` icon, title, one line, at most one primary button and one ghost secondary; min height of three rows so adding the first item doesn't jump.
- **`ScreenHeader`**: 56 px, back or close as bare 44 px icon buttons, centred `title-m` (two lines max), optional action: at most one word in accent (Select, Share, Compare) or the "More actions" menu; a 44 px spacer when there is no action so the title never moves. Never Save (forms use `BottomBar`) and never a + (list screens add with the `Fab`, task 008). Icon-only buttons are kept for back, close, more, search, filter and month arrows. Spoken labels "Back", "Close".
- **`Collapsible`**: animates its own height open and closed (200 ms) for late sections (conflict panel, Reminders sub-rows, "More details").
- **`AnimatedList` helpers**: `entering={FadeIn}`, `exiting={FadeOut}`, `layout={LinearTransition}` presets with motion timings, for rows that are added or removed.

Show every piece in the dev component gallery from task 008.

Out:

- Navigation and the TabBar: task 010.

## Acceptance criteria

- [ ] A sample form in the gallery (name required, price ≥ 0, a date, a chip field) shows errors in the reserved line without moving the fields below (compare layout positions in a test with `onLayout` or by snapshot of heights before and after the error).
- [ ] The keyboard opening scrolls the focused field into view on both platforms with no jump (manual check, note it under Decisions).
- [ ] AlertDialog with `confirmText="RESET"` keeps the action disabled until "RESET" is typed (test).
- [ ] Sheets open with the spring and no overshoot; a dirty sheet asks before closing (test the dirty guard logic).
- [ ] Toasts: one at a time, Undo calls the handler, gone after 8 s, and kept until dismissed while a screen reader is on (fake timers test with a mocked `AccessibilityInfo`).
- [ ] A `secret` Input hides the text and the eye button shows and hides it, with the right spoken label.
- [ ] `pnpm check` and `pnpm expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

- **Forms** use TanStack Form's `createFormHook` (`src/components/ui/form.tsx`). `useAppForm({ schema, defaultValues, onSubmit })` validates the whole form with the zod schema on blur and on submit; zod issues become field errors keyed by path. Fields hold what was typed (prices and months stay strings) and `onSubmit` receives `schema.parse(value)`. Bound field components: `field.TextField`, `SelectField`, `DateField`, `TimeField`, `ChipField`. Schema messages are i18n keys under `forms.errors.*`; `useFieldError()` translates them and only shows an error once the field was left or Save was pressed. `useFormDirty(form)` feeds "Discard changes?". No zod adapter package: TanStack Form v1 doesn't need one.
- **Reserved line:** `Field` always renders one `min-h-[18px]` line (`testID="field-helper"`) holding the hint or the error, so an error never moves fields below. The test checks every field keeps exactly one line holding at most one text before and after a failed Save; actual pixel positions need the device.
- **Input:** single-line inputs use `text-[15px]` without a line height (a line height on a single-line iOS TextInput shifts the text); multiline grows from 96 to 160 pt, then scrolls. `keyboard` is `text`, `numeric` (number pad) or `decimal`. `parseDecimal()` in `src/dev/sampleForm.ts` accepts "12,99" and "12.99"; move it to `src/lib` when the product form needs it.
- **SelectField** drops an rn-primitives `Select` menu for up to 6 options and opens a sheet with a `RadioList` for longer lists (category, currency); `mode` overrides. `FieldButton` is the shared 48 pt trigger for select, date and time fields.
- **DateField / TimeField:** Android opens the system dialog (`DateTimePickerAndroid.open`); iOS shows the inline calendar (time: spinner) in a `Sheet` with a Done button. Values are app days (`'YYYY-MM-DD'`) and `'HH:MM'`. The formatter now exposes `today`.
- **Sheet:** `@gorhom/bottom-sheet` `BottomSheetModal` on both platforms (the task's choice; components.md mentions iOS `formSheet` routes, which modal routes can still use with `SheetFrame`). Dynamic height up to the screen minus the top inset, `motion.spring` with `overshootClamping`, 100 ms timing with Reduce Motion, backdrop at 40%. `SheetFrame` draws the grabber (no library handle), Cancel, title and a pinned footer; inside a sheet it scrolls with `BottomSheetScrollView`, in a route with `KeyboardAwareScrollView`.
- **Dirty guard:** `useCloseGuard({ dirty, onClose })`. With unsaved edits, drag-to-close is off and Cancel or a backdrop tap opens `DiscardDialog` ("Discard changes?" with Discard / Keep editing); without edits they close at once.
- **AlertDialog** puts its body in a child that mounts only while open, so the `confirmText` field starts empty each time. The match is exact and case-sensitive ("reset" does not count). The dialog enters with a fade and a 0.96 → 1 scale (200 ms); Reanimated skips layout animations when Reduce Motion is on.
- **More actions** is `MoreMenu` (rn-primitives `DropdownMenu`); `ScreenHeader` takes `action: { menu }`, `{ text }` or `{ icon, label, primary }`, and keeps a 44 pt spacer on each side so the title never moves.
- **Toasts:** `ToastHost` and `PortalHost` sit at the root inside `GestureHandlerRootView` → `KeyboardProvider` → `QueryClientProvider` → `BottomSheetModalProvider`. A toast is `surface` with `shadow-raised` and an accent Undo. It floats above `uiStore.toastInset` (new `setToastInset(px)`: the tab bar and the player's timer bar set their height there; 0 falls back to the safe-area bottom). While a screen reader is on the toast also shows a Close button, because it doesn't time out.
- **BottomBar** rides above the keyboard with `KeyboardStickyView`; forms pad their scroll content by `BOTTOM_BAR_HEIGHT` (76).
- **Collapsible** measures its content off-flow, then animates height and opacity (200 ms). **Row animations:** `rowEntering`, `rowExiting`, `rowLayout` in `src/theme/listMotion.ts`.
- **Jest:** mocks for `react-native-keyboard-controller`, `@gorhom/bottom-sheet`, `react-native-safe-area-context` and gesture handler are in `jest.setup.js`. TanStack Form's devtools event client is created disabled in tests; otherwise its connect timer keeps Jest from exiting. Overlays that use a Portal need `<PortalHost />` in the test render.
- **Device check needed:** the keyboard scrolling the focused field into view with no jump (iOS and Android), the sheet spring settling without overshoot, the date and time pickers in both themes, the Select menu position, and VoiceOver/TalkBack reading the reserved error line. Open `/dev/components`.
