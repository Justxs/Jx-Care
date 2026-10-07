# DESIGN.md: Jx-Care visual system

Source of truth: the Jx-Care design system artifact (https://claude.ai/artifact/6wezpPoHNSQoe9bM6GUryU). This file mirrors its tokens and rules so coding agents and design checkers (impeccable.style reads DESIGN.md) stay inside the system. Styling in the app is NativeWind 4.2; see the artifact's NativeWind section for `global.css` and `tailwind.config.js`.

## Colour

Light and dark are both designed; the app follows the phone. One pink accent, two care-area hues, four status hues. Nothing else.

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | #F8F4F5 | #141112 | Page background behind cards and lists. |
| `surface` | #FFFFFF | #201B1D | Cards, list groups, inputs, tab bar, keypad keys. |
| `subtle` | #F1EAEC | #2A2326 | Toggle group track, chips, progress track, day cells with nothing scheduled. |
| `ink` | #241F21 | #F4EFF1 | Primary text and icons, on canvas, surface and subtle. |
| `ink-muted` | #695F63 | #ACA2A6 | Secondary text (brand, dates, captions), on canvas, surface and subtle. |
| `border` | #E8DFE2 | #3D3538 | Decorative hairlines and dividers only. Not enough contrast for control edges: use border-strong. |
| `border-strong` | #877C80 | #776D71 | Edges of inputs, unchecked checkboxes and empty PIN dots: 3:1 on surface and canvas. |
| `brand-pink` | #D94F87 | #E8679C | The logo pink. Logo, cover and large decorative shapes only; never body text or small icons (3.9:1 on white). Use accent for UI. |
| `accent` | #B83A6E | #F28DB5 | Pink. Primary buttons, active tab, checked controls, links. Text on canvas, surface, subtle and accent-soft. |
| `on-accent` | #FFFFFF | #1F0A13 | Text and icons on accent fills (the dark theme lightens accent, so on-accent turns dark). |
| `accent-soft` | #FBE7EF | #3D2230 | Selected option background, icon discs, "done" days in the calendar. |
| `skin` | #A3502F | #F0A889 | Skin area: tag text, skin streak, skin icons. Text on skin-soft and surface. |
| `skin-soft` | #FBEBE3 | #3A2A22 | Skin area fills: tag, product thumb, skin streak card. |
| `hair` | #6B5AAE | #B9AEEA | Hair area: tag text, hair streak, hair task due pill. Text on hair-soft and surface. |
| `hair-soft` | #EEEAF8 | #2C2840 | Hair area fills: tag, product thumb, hair streak card, due days. |
| `ok` | #2A7449 | #7DD8A5 | Status OK text and dot, on ok-soft. Always paired with the word "OK". |
| `ok-soft` | #E3F3EA | #1B3326 | Status OK badge fill. |
| `warning` | #8A5A10 | #F2C063 | Expiring soon and ingredient conflict text and icon, on warning-soft and surface. |
| `warning-soft` | #FCF1DC | #3A3020 | Expiring soon badge, conflict pills and callouts, partly-done calendar days. |
| `danger` | #B23731 | #F59A93 | Expired status, Reset app, destructive text. On danger-soft and surface. |
| `danger-soft` | #FBE5E3 | #3D2321 | Expired badge fill, "Not done" calendar days, Danger button fill. |
| `neutral` | #5F6662 | #B3BBB7 | Not-opened status text and dot, on neutral-soft. |
| `neutral-soft` | #ECEEEC | #2A2E2C | Not-opened badge fill. |
| `focus` | #B83A6E | #F28DB5 | Focus ring, 2px solid with 2px offset; 3:1 on every surface in both themes. |

The progress camera is always dark in both themes: `camera-bg` #120D10, `camera-control` rgba(255,255,255,0.14), `camera-guide` rgba(240,168,137,0.30), `camera-frame` rgba(255,255,255,0.75).

## Typography

One family: **Figtree** (covers Lithuanian diacritics; replaced Plus Jakarta Sans on 2026-10-06). Tabular figures for every number that changes.

| Style | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 32px / 40px | 700 | Onboarding headline, streak numbers. |
| `title-l` | 24px / 32px | 700 | Screen titles (Today, Products). |
| `title-m` | 20px / 28px | 600 | Pushed-screen titles, stat values. |
| `title-s` | 17px / 24px | 600 | Section headings inside a screen. |
| `body-l` | 16px / 24px | 400 | Intro paragraphs. |
| `body` | 15px / 22px | 400 | Default text, list values, inputs. |
| `body-strong` | 15px / 22px | 600 | Product names, step names, button labels. |
| `label` | 13px / 18px | 500 | Badges, chips, field labels, toggle group items. |
| `caption` | 13px / 18px | 400 | Meta lines under names, helper text. Never smaller than 13px. |
| `overline` | 13px / 18px | 600 | Short group labels inside a card (sentence case, never uppercase). Prefer a Card title or section heading. |

Minimum text size 13px. Exceptions: tab bar labels and single-letter weekday dots (12px). Never uppercase body or labels.

## Spacing, radius, depth

- Spacing (4px grid): `space-1` 4px, `space-2` 8px, `space-3` 12px, `space-4` 16px, `space-6` 24px, `space-8` 32px. Screen gutter 16px. Related items sit closer than separate groups: 8px between a heading and its card, 24px before the next section.
- Radius: `radius-sm` 8px, `radius-md` 12px, `radius-lg` 16px, `radius-full` 999px.
- Shadow: `shadow-card` for cards on canvas (no border with it), `shadow-raised` for dialogs and menus only.

## Motion

| Movement | Duration | Curve |
|---|---|---|
| Bottom tab switch | 150ms cross-fade | ease-out |
| Push | platform default | native |
| Segmented control, dialog, list row add/remove | 200ms | ease-out in, ease-in out |
| Full-screen flow, sheet | 300ms slide up / critically damped spring (damping 34, stiffness 280) | no overshoot |
| Tick 150ms, routine done 250ms, wrong PIN shake 300ms | | |

Reduce Motion: every slide or scale becomes a 100ms fade. Never bounce or elastic easing. Animate transforms and opacity; when height must animate (row insert, late section), animate the row's own height so neighbours glide.

## Layout stability

Skeletons at final size (product row 72px), reserved image boxes (thumb 48, product photo 1:1, progress photo 3:4), a reserved helper line under every field, badge min width 44px, a 6-row calendar, toasts and timers floating above the tab bar. Layouts use min heights so Lithuanian labels (about 30% longer) wrap instead of clipping.

## Components

Base components come from rn-primitives (https://rnprimitives.com/) styled with NativeWind, the React Native Reusables setup. App components: Button, Badge, AreaTag, Checkbox, Switch, ToggleGroup, Progress, ProgressRing, Separator, Input (with `secret` reveal), SelectField, RadioList, Fab, AlertDialog, Card, ListRow, ProductRow, RoutineStep, StreakCard, StreakChip, PinPad, TabBar, ScreenHeader, SheetFrame, Chip, Rating, WeekdayPicker, WeekdayDots, StepDots, PhotoTile, Skeleton, Toast, EmptyState, Icon (Lucide).

## Rules (what we avoid)

- No icon tiles: no icon in a tinted square or circle beside rows or above headings. Row icons are bare `ink-muted`.
- No uppercase overlines and no small label above a heading. Card titles are sentence case and sit above the card.
- Care area is a word in a coloured pill (Skin, Hair, Skin + hair), not an icon. No sparkle glyphs.
- Product placeholders: neutral `subtle` square with a category glyph (pipette, droplet, sun, spray-can, flask-round). Photo placeholders: plain tone, no glyph.
- Never a card inside a card. Notes and helper lines sit on the canvas as text; tinted callouts only for warnings that need action.
- One filled accent button per screen. Add actions are a Fab at the bottom right; Save on form screens sits in a bottom-pinned bar; header actions are a word ("Select", "Share", "Compare"). Back and close have no circle.
- Checkboxes are square (7px corners); radio marks are round. Three or more options, or long Lithuanian labels, use a RadioList, not a segmented control.
- Touch targets 44px; smaller visuals (chips 36, switches, checkboxes) get hitSlop.
- Copy: sentence case, verbs on buttons, no emoji, no exclamation marks, no em-dashes, no marketing words.
