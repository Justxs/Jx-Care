// Copied from docs/design/nativewind.md (design system v18). One change, see task 002 Decisions:
// the type styles come from a plugin that also sets the Figtree family for each weight.
const plugin = require('tailwindcss/plugin');

/**
 * Type scale from DESIGN.md. On Android every Figtree weight is its own font family, so each
 * style sets the family instead of a font weight.
 */
const typeScale = {
  display: { size: 32, line: 40, family: 'Figtree_700Bold', tracking: -0.32 },
  'title-l': { size: 24, line: 32, family: 'Figtree_700Bold' },
  'title-m': { size: 20, line: 28, family: 'Figtree_600SemiBold' },
  'title-s': { size: 17, line: 24, family: 'Figtree_600SemiBold' },
  'body-l': { size: 16, line: 24, family: 'Figtree_400Regular' },
  body: { size: 15, line: 22, family: 'Figtree_400Regular' },
  'body-strong': { size: 15, line: 22, family: 'Figtree_600SemiBold' },
  label: { size: 13, line: 18, family: 'Figtree_500Medium' },
  caption: { size: 13, line: 18, family: 'Figtree_400Regular' },
  overline: { size: 13, line: 18, family: 'Figtree_600SemiBold' },
  // Tab bar labels and single-letter weekday dots only (DESIGN.md exception).
  tiny: { size: 12, line: 16, family: 'Figtree_500Medium' },
  // The active tab label.
  'tiny-strong': { size: 12, line: 16, family: 'Figtree_600SemiBold' },
};

const typePlugin = plugin(({ addUtilities }) => {
  const utilities = {};
  for (const [name, t] of Object.entries(typeScale)) {
    utilities[`.text-${name}`] = {
      'font-size': `${t.size}px`,
      'line-height': `${t.line}px`,
      'font-family': t.family,
      ...(t.tracking ? { 'letter-spacing': `${t.tracking}px` } : {}),
    };
  }
  // NativeWind maps `tabular-nums` to a CSS variable only; React Native needs `fontVariant`.
  utilities['.tabular-nums'] = { '-rn-font-variant': 'tabular-nums' };
  addUtilities(utilities);
});

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
        // The progress camera is dark in both themes.
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
      borderRadius: { sm: '8px', md: '12px', xl: '16px', full: '9999px' },
      boxShadow: {
        card: '0 2px 8px rgba(26, 31, 28, 0.06)',
        raised: '0 8px 24px rgba(26, 31, 28, 0.12)',
      },
      transitionDuration: { fast: '150ms', base: '200ms', slow: '300ms' },
    },
  },
  plugins: [typePlugin],
};
