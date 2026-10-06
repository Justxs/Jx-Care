# 009 Forms, sheets, dialogs and toasts

**Phase:** B. UI kit and shell · **Depends on:** 008 · **Spec:** Global UI rules (States, Destructive actions), Words and copy (errors, toasts), Motion and layout stability (reserved helper line, keyboard, overlays float, late sections) · **Design:** [components.md](../design/components.md) Input, SelectField, AlertDialog, SheetFrame, Toast, ScreenHeader, EmptyState, Transitions

## Goal

The form fields, overlays and feedback pieces, wired to TanStack Form and the toast store, so every form and sheet in later tasks behaves the same: errors replace hints in place, the keyboard never makes the screen jump, sheets settle without bounce and toasts float.

## Scope

In: `npm install @tanstack/react-form@latest zod@latest @gorhom/bottom-sheet@latest`, `npx expo install react-native-gesture-handler react-native-keyboard-controller @react-native-community/datetimepicker`, and `@rn-primitives/alert-dialog`, `select`, `dropdown-menu`.

### Form fields (`src/components/ui/`)

| Component | Notes |
| --- | --- |
| `Field` | Label above, control, and **one reserved line** under it (min height of one `caption` line) that shows the hint or, when invalid, the error in `danger` in the same space. Every field below uses it |
| `Input` | 48 px, `rounded-md`, `border-strong` edge (`danger` when invalid), `text-body`; `multiline` variant grows with content up to a max height, then scrolls; `numeric` and `decimal` keyboards; `suffix` slot (currency, "ml") |
| `SelectField` | Looks like Input; opens rn-primitives `Select` (short lists) or a sheet (long lists such as category); long values truncate |
| `DateField` | Shows `formatDateField()` ("Today, 6 Oct"); opens the native date picker (`@react-native-community/datetimepicker`) in a sheet on iOS and the dialog on Android; `min`/`max` |
| `TimeField` | Same for "HH:mm" |
| `ChipField` | A labelled `ChipGroup` with the reserved line (PAO chips, wait chips, tags) |
| `useAppForm()` | A thin wrapper over TanStack Form's `useForm` with a zod validator adapter, `onBlur` and `onSubmit` validation, errors mapped from i18n keys to text, and an `isDirty` flag for "Discard changes?" |

Forms scroll the focused field into view with `KeyboardAwareScrollView` from `react-native-keyboard-controller`; the screen never jumps when the keyboard opens. Add `KeyboardProvider` at the root.

### Overlays

- **`AlertDialog`** (rn-primitives): title, description (what is lost and whether it can be undone), cancel and action labels from the caller, `destructive` styles the action in `danger`. Enter: fade and scale 0.96 → 1 in 200 ms. Optional **`confirmText`** prop: the action stays disabled until the person types it exactly (used for "RESET").
- **`Sheet`** + **`SheetFrame`** (`@gorhom/bottom-sheet` `BottomSheetModal` on both platforms): grabber, Cancel, centred title, scrolling body, **pinned footer** for the one primary button; spring `motion.spring` (critically damped, no overshoot), backdrop fades; drag down to close. If the content is dirty, closing asks "Discard changes?" first. Provide `BottomSheetModalProvider` at the root. Sheets that need a route (opened from notifications, e.g. Hair task done) are modal routes that render a `SheetFrame`; others are opened in place.
- **`DropdownMenu`** for "More actions" overflow menus (spoken label "More actions").

### Feedback

- **`ToastHost`** at the root, reading `uiStore` from task 005: one toast at a time, floating above the tab bar (and above the player's timer bar), enters with `FadeInDown` 200 ms, a new toast cross-fades over the old; 4 s without action, **5 s with Undo**; `accessibilityLiveRegion="polite"`. `showToast` is the only API.
- **`EmptyState`**: bare `ink-muted` icon, title, one line, at most one primary button and one ghost secondary; min height of three rows so adding the first item doesn't jump.
- **`ScreenHeader`**: 56 px, back or close as bare 44 px icon buttons, centred `title-m` (two lines max), optional action (a word in accent such as "Save", or a soft `accent-soft` icon button), a 44 px spacer when there is no action so the title never moves. Spoken labels "Back", "Close".
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
- [ ] Toasts: one at a time, Undo calls the handler, 4 s / 5 s timing (fake timers test).
- [ ] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

(Write any choices you make here.)
