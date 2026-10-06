# 008 Base components

**Phase:** B. UI kit and shell · **Depends on:** 002, 003 · **Spec:** Global UI rules, Words and copy (Conflict tag, No faded text, Weekday dots, Progress bars) · **Design:** [docs/design/components.md](../design/components.md), [components.d.ts](../design/components.d.ts), DESIGN.md "Components" and "Rules"

## Goal

The small building blocks every screen uses, built on rn-primitives and styled only with the theme classes from task 002. Later tasks compose these; they never restyle a raw `Pressable` into a button.

## Scope

In: `npx expo install react-native-svg expo-haptics`, `npm install lucide-react-native@latest` and the `@rn-primitives/*` packages each component needs (`slot`, `checkbox`, `switch`, `toggle`, `toggle-group`, `progress`, `separator`, `label`, `portal`). The React Native Reusables CLI (`npx @react-native-reusables/cli@latest add <name>`) may scaffold a component, but restyle it to our tokens and props (Reusables uses `bg-accent` for pressed rows; ours use `bg-accent-soft`).

Each component lives in `src/components/ui/<name>.tsx` (base) or `src/components/<Name>.tsx` (app composites below), exports typed props matching [components.d.ts](../design/components.d.ts) (rename `aria-label` to React Native's `accessibilityLabel`), and follows its section in [components.md](../design/components.md) for sizes, tokens and states.

| Component | Notes beyond components.md |
| --- | --- |
| `Text` | The one text component: maps type classes to the right Figtree family (from task 002), defaults to `text-body text-ink`, `maxFontSizeMultiplier` 1.6 so large system text wraps instead of breaking layouts |
| `Icon` | Wraps `lucide-react-native` by name, colour from the current text token via `useThemeColors()`, `accessibilityLabel` only when the icon carries meaning alone |
| `Button` | `primary`, `secondary`, `ghost`, `danger`; `md` 52 px and `sm`; pressed 85% opacity; disabled 45% opacity and not pressable; `loading` keeps the label width (no spinner swap, no width change) |
| `Badge` | Expiry statuses `ok`, `expiring`, `expired`, `unopened`, `nodate` and `avoid` (ban icon, red); words from i18n; `min-w-[44px]`, `tabular-nums` |
| `AreaTag` | Skin, Hair, "Skin + hair"; text only |
| `ConflictTag` | New in v14. Amber pill (`warning` on `warning-soft`) with `alert-triangle` and "Conflict" or "Mild conflict". With `onPress` it is a `Pressable` with `hitSlop` to 44 pt. Never a colour-only dot; never red |
| `Checkbox` | 26 px round; ticking fires a light haptic (`Haptics.impactAsync(Light)`) and fills in 150 ms; `hitSlop` to 44 pt |
| `Switch` | rn-primitives Switch; thumb slides 150 ms |
| `Chip` | 36 px; single (`Toggle`) and `ChipGroup` (`ToggleGroup` multiple); `tone="danger"`; `count` with `tabular-nums` |
| `ToggleGroup` | Segmented switch with a sliding indicator (200 ms, Reanimated) behind the selected item; `md` 42 px, `sm` 32 px with `hitSlop`; optional `count` pill |
| `Progress` | 6 px bar; the indicator animates **scaleX from the left** (`transformOrigin: 'left'`), never width |
| `ProgressRing` | `react-native-svg`, `strokeDashoffset` animated 200 ms; fixed size (44 default); turns `ok` when complete; label `tabular-nums` |
| `Separator` | 1 px `border`; `inset` starts after a 48 px thumb |
| `Card` | `bg-surface rounded-xl p-4 shadow-card`; optional `title` drawn **above** the card as `text-title-s`; `flush` for row lists. Never nest |
| `ListRow` | Min 56 px; `trailing`: `chevron`, `switch`, `value` (new in v14: right-hand text, no chevron), `none`; `tone="danger"`; icon bare `ink-muted` |
| `Skeleton` | Fixed size block, opacity pulse; accepts `width`, `height`, `radius`; respects Reduce Motion (no pulse) |
| `Rating` | Stars 1–5 (`ToggleGroup` single), 44 pt targets, spoken label "3 of 5 stars" |
| `WeekdayDots` | Read-only: seven fixed-width letters from i18n (Monday first); scheduled days in `accent-soft` with `accent` text (v14); spoken label lists days in words or "Every day". Takes ISO weekdays 1–7 |
| `WeekdayPicker` | Seven toggles (`ToggleGroup` multiple), each ≥ 36 × 40; "Every day" shortcut is the caller's; ISO weekdays |
| `StepDots` | Onboarding progress, **5** steps (not 3); current dot widens to 24 px; fixed-height row; exposed as progressbar "Step 2 of 5" |
| `StreakChip` | Flame icon, number, area word; area colours; `tabular-nums`; min width |
| `StreakCard` | Half-width card: area word, current (`text-display`), "Best 21 days" |
| `ProductThumb` | 48 × 48 `rounded-sm`; photo with `expo-image` (`npx expo install expo-image`), else `subtle` square with the category glyph (`pipette` serum and oils, `droplet` cleanser and toner, `sun` SPF, `spray-can` shampoo and styling, `flask-round` the rest); box reserved before the image loads |
| `PhotoTile` | 3:4 box reserved, neutral placeholder, `expo-image` fade 200 ms, `selected`, `add` slot |
| `PinPad` | Four dots (empty dots `border-strong`), 76 px `surface` keys with `title-l` digits, delete key labelled "Delete last digit", optional biometrics key; `shake()` method (300 ms) for wrong PIN; `disabled` with the reason in the reserved line under the dots |

Rules for every component:

- No hex colours, no inline styles except Reanimated animated styles.
- **No opacity on text** for states (v14): done, waiting, bought or expired text switches to `text-ink-muted`, adds a badge or strike-through. Opacity is only for pressed (85%) and disabled (45%) whole controls.
- Every interactive component has an `accessibilityRole`, a label and its state (`accessibilityState={{ checked }}` etc.).
- Animations use `useMotion()` from task 002 and turn into 100 ms fades with Reduce Motion.

Also build a **component gallery** at `app/dev/components.tsx` (development only, next to task 002's theme screen) showing every component in each state, so reviewers can check them in light, dark and Lithuanian.

Out:

- Inputs, select fields, sheets, dialogs, toasts, ScreenHeader, TabBar, EmptyState: task 009.
- Feature composites such as ProductRow and RoutineStep: built by their feature tasks from these parts.

## Acceptance criteria

- [ ] Every component in the table exists with typed props and a render test (React Native Testing Library) that checks its accessible role, label and main state.
- [ ] The gallery shows each component and state; checked in light and dark and with Lithuanian strings at a 360 pt wide screen, nothing clips or overlaps.
- [ ] `Progress` animates `scaleX`, not width (code review); `ConflictTag` and `Badge` always show a word.
- [ ] No text uses opacity for state (grep for `opacity` in `src/components` shows only pressed and disabled).
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
