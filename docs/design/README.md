# Design reference for coding agents

The Jx Care design system lives in a Claude artifact (https://claude.ai/artifact/6wezpPoHNSQoe9bM6GUryU, version 18 of 2026-10-07: every critique finding fixed in v17, wording aligned with the spec in v18). Agents may not be able to open it, so its text is copied here.

| File | What it holds |
| --- | --- |
| [design-system.md](design-system.md) | The brand book: content rules, words we use, visual foundations, rn-primitives mapping, motion, layout stability, what we avoid, icons, logo |
| [nativewind.md](nativewind.md) | `global.css` and `tailwind.config.js` for NativeWind 4.2 (task 002 copies these) |
| [tokens.json](tokens.json) | Every token with light and dark values and a usage note |
| [components.md](components.md) | Each base and app component: what it is built on, what the consumer provides, sizes and states |
| [components.d.ts](components.d.ts) | Props for every component, from the artifact's web bundle. Use the prop names and meanings; the app versions are React Native |
| [screens.md](screens.md) | Design notes for every screen and sheet, in spec order (O1 to S8) |

## Order of precedence

1. [docs/feature-spec.md](../feature-spec.md)
2. [DESIGN.md](../../DESIGN.md)
3. The files in this folder

The artifact's previews are web (React DOM) mock-ups. Build every component again with rn-primitives and NativeWind; match sizes, tokens, states and copy, not the DOM markup.

## Known differences

Places where the copied notes disagree with the spec or each other, and what to build:

| Where | Note says | Build this |
| --- | --- | --- |
| StepDots | Three onboarding steps | Five steps, "1 of 5" (spec O1–O5) |
| Rating | Rating `scale` for daily condition | Rating is only for products (stars) and photo review; daily condition uses the tag chips |
| AlertDialog first bullet | Reset suggests exporting a backup | From Forgot PIN never suggest exporting; from Settings show Export backup above Reset app (spec L2, AlertDialog second bullet) |
| Skeleton | SQLite data is ready on the first frame, render it directly | Render directly when the data is already cached; otherwise a skeleton at final size. Never a spinner |
| WeekdayDots, WeekdayPicker | Day indexes 0 = Monday | The app uses ISO weekdays 1 = Monday … 7 = Sunday everywhere (conventions.md) |
| Icons group | "Skin is sparkles, hair is droplets" | Care area has no icon, it is a word in a pill (DESIGN.md rules). `droplets` stays for hair washes |
| SheetFrame | iOS `formSheet`, 320 ms enter | `@gorhom/bottom-sheet` on both platforms with `motion.spring` (Transitions note), so sheets feel the same everywhere |
| Logos | At least 48 px | At least 64 px on lock and onboarding (design-system.md Logo) |
| components.d.ts `IconName` | Lists `flame` and `sparkles`; lacks `calendar-check`, `check-check`, `layout-grid`, `list`, `share-2`, `eye`, `eye-off`, `circle-help` | Use the Lucide names in design-system.md Iconography; never a flame or sparkles |
| Durations of 220 ms in a few notes | 220 ms | Use `src/theme/motion.ts` (150 / 200 / 300 ms) |
