# NativeWind

Copied from the design system artifact (https://claude.ai/artifact/6wezpPoHNSQoe9bM6GUryU, `project/nativewind.md`) (v18, 2026-10-07). `caption` and `overline` are 13 px / 18 px with no uppercase, as DESIGN.md requires.

NativeWind is how the app applies these tokens: Tailwind classes on React Native components, the same setup React Native Reusables uses for rn-primitives. Use **NativeWind 4.2 with Tailwind CSS 3.4** (newest stable); move to NativeWind 5 / Tailwind 4 when it leaves release candidate. Colours are CSS variables with a light and a dark set, so one class works in both themes.

## Class names

| Token | Class examples | Notes |
| --- | --- | --- |
| `canvas`, `surface`, `subtle` | `bg-canvas`, `bg-surface`, `bg-subtle` | Also `bg-background`, `bg-card`, `bg-muted` for React Native Reusables code |
| `ink`, `ink-muted` | `text-ink`, `text-ink-muted` | Also `text-foreground`, `text-muted-foreground` |
| `accent`, `on-accent`, `accent-soft` | `bg-accent text-on-accent`, `bg-accent-soft` | `bg-primary text-primary-foreground` are the same pink. Reusables components use `bg-accent` for pressed rows: change those to `bg-accent-soft` |
| `skin`, `hair` (+ `-soft`) | `bg-skin-soft text-skin` | Care area only |
| `ok`, `warning`, `danger`, `neutral` (+ `-soft`) | `bg-danger-soft text-danger` | Status only, always with a word. `destructive` = `danger` |
| `border`, `border-strong`, `focus` | `border-border`, `border-border-strong`, `ring-focus` | `border-input` = `border-strong` |
| Type styles | `text-title-l`, `text-body`, `text-caption`, `text-overline` | Size, line height and weight in one class; add `font-sans` once at the root |
| Spacing | `p-4`, `gap-3`, `px-4` | Tailwind's default 4pt scale already matches `space-*` (`p-1` = 4) |
| Radius | `rounded-sm` 8, `rounded-md` 12, `rounded-xl` 16, `rounded-full` | Cards are `rounded-xl` (token `radius-lg`); buttons and inputs `rounded-md` |
| Shadow | `shadow-card`, `shadow-raised` | Needs React Native 0.76+ `boxShadow`; the dark theme uses a hairline instead |
| Numbers | `tabular-nums` | Counts, streaks, prices, countdowns |

## global.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --canvas: 248 244 245;
    --surface: 255 255 255;
    --subtle: 241 234 236;
    --ink: 36 31 33;
    --ink-muted: 105 95 99;
    --border: 232 223 226;
    --border-strong: 135 124 128;
    --brand-pink: 217 79 135;
    --accent: 184 58 110;
    --on-accent: 255 255 255;
    --accent-soft: 251 231 239;
    --skin: 163 80 47;
    --skin-soft: 251 235 227;
    --hair: 107 90 174;
    --hair-soft: 238 234 248;
    --ok: 42 116 73;
    --ok-soft: 227 243 234;
    --warning: 138 90 16;
    --warning-soft: 252 241 220;
    --danger: 178 55 49;
    --danger-soft: 251 229 227;
    --neutral: 95 102 98;
    --neutral-soft: 236 238 236;
    --focus: 184 58 110;
    /* Camera screen: always dark, same in both themes */
    --camera-bg: 18 13 16;
  }
  .dark:root {
    --canvas: 20 17 18;
    --surface: 32 27 29;
    --subtle: 42 35 38;
    --ink: 244 239 241;
    --ink-muted: 172 162 166;
    --border: 61 53 56;
    --border-strong: 119 109 113;
    --brand-pink: 232 103 156;
    --accent: 242 141 181;
    --on-accent: 31 10 19;
    --accent-soft: 61 34 48;
    --skin: 240 168 137;
    --skin-soft: 58 42 34;
    --hair: 185 174 234;
    --hair-soft: 44 40 64;
    --ok: 125 216 165;
    --ok-soft: 27 51 38;
    --warning: 242 192 99;
    --warning-soft: 58 48 32;
    --danger: 245 154 147;
    --danger-soft: 61 35 33;
    --neutral: 179 187 183;
    --neutral-soft: 42 46 44;
    --focus: 242 141 181;
  }
}
```

## tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        subtle: 'rgb(var(--subtle) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--ink-muted) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        'brand-pink': 'rgb(var(--brand-pink) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        skin: 'rgb(var(--skin) / <alpha-value>)',
        'skin-soft': 'rgb(var(--skin-soft) / <alpha-value>)',
        hair: 'rgb(var(--hair) / <alpha-value>)',
        'hair-soft': 'rgb(var(--hair-soft) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
        'ok-soft': 'rgb(var(--ok-soft) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        'warning-soft': 'rgb(var(--warning-soft) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        'danger-soft': 'rgb(var(--danger-soft) / <alpha-value>)',
        neutral: 'rgb(var(--neutral) / <alpha-value>)',
        'neutral-soft': 'rgb(var(--neutral-soft) / <alpha-value>)',
        focus: 'rgb(var(--focus) / <alpha-value>)',
        'camera-bg': 'rgb(var(--camera-bg) / <alpha-value>)',
        // React Native Reusables names, pointing at the same tokens
        background: 'rgb(var(--canvas) / <alpha-value>)',
        foreground: 'rgb(var(--ink) / <alpha-value>)',
        card: 'rgb(var(--surface) / <alpha-value>)',
        'card-foreground': 'rgb(var(--ink) / <alpha-value>)',
        popover: 'rgb(var(--surface) / <alpha-value>)',
        'popover-foreground': 'rgb(var(--ink) / <alpha-value>)',
        primary: 'rgb(var(--accent) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--on-accent) / <alpha-value>)',
        secondary: 'rgb(var(--subtle) / <alpha-value>)',
        'secondary-foreground': 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--subtle) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--ink-muted) / <alpha-value>)',
        'accent-foreground': 'rgb(var(--on-accent) / <alpha-value>)',
        destructive: 'rgb(var(--danger) / <alpha-value>)',
        'destructive-foreground': 'rgb(var(--on-accent) / <alpha-value>)',
        input: 'rgb(var(--border-strong) / <alpha-value>)',
        ring: 'rgb(var(--focus) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Figtree_400Regular'],
        medium: ['Figtree_500Medium'],
        semibold: ['Figtree_600SemiBold'],
        bold: ['Figtree_700Bold'],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '40px', fontWeight: '700', letterSpacing: '-0.01em' }],
        'title-l': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'title-m': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'title-s': ['17px', { lineHeight: '24px', fontWeight: '600' }],
        'body-l': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-strong': ['15px', { lineHeight: '22px', fontWeight: '600' }],
        'label': ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'caption': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'overline': ['13px', { lineHeight: '18px', fontWeight: '600' }],
      },
      borderRadius: { sm: '8px', md: '12px', xl: '16px', full: '9999px' },
      boxShadow: {
        card: '0 2px 8px rgba(26, 31, 28, 0.06)',
        raised: '0 8px 24px rgba(26, 31, 28, 0.12)',
      },
      transitionDuration: { fast: '150ms', base: '200ms', slow: '300ms' },
    },
  },
  plugins: [],
};
```

## Wiring

- Fonts: `@expo-google-fonts/figtree`; on Android each weight is its own family, so use `font-medium`, `font-semibold`, `font-bold` instead of `font-weight` classes. Keep the splash screen up until they load.
- Theme: follow the phone with NativeWind's `useColorScheme()`; the `.dark` class switches every variable at once, and the switch cross-fades (see Motion).
- Animation: NativeWind classes for static styles only. Animated values go in Reanimated `style` props with the `JxCare.motion` timings; that is the one place inline styles are allowed.
- Example: `<Pressable className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-md bg-accent px-5 active:opacity-85"><Text className="text-body-strong text-on-accent">Add product</Text></Pressable>`

Camera colours (C4) are fixed in both themes: `camera-bg` #120D10, and white or skin tints at fixed alpha for `camera-control` (white 14%), `camera-guide` (#F0A889 at 30%) and `camera-frame` (white 75%). In NativeWind write them as `bg-white/15`, `bg-[#F0A889]/30` and `border-white/75`.
