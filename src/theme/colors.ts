import { useColorScheme } from 'nativewind';

/**
 * Token values for the few places that can't take a className: navigation theme, status bar,
 * SVG strokes, bottom sheet backgrounds, notification accent. Same numbers as global.css; a test
 * keeps the two in line.
 */
export const palette = {
  light: {
    canvas: '#F8F4F5',
    surface: '#FFFFFF',
    subtle: '#F1EAEC',
    ink: '#241F21',
    'ink-muted': '#695F63',
    border: '#E8DFE2',
    'border-strong': '#877C80',
    'brand-pink': '#D94F87',
    accent: '#B83A6E',
    'on-accent': '#FFFFFF',
    'accent-soft': '#FBE7EF',
    skin: '#A3502F',
    'skin-soft': '#FBEBE3',
    hair: '#6B5AAE',
    'hair-soft': '#EEEAF8',
    ok: '#2A7449',
    'ok-soft': '#E3F3EA',
    warning: '#8A5A10',
    'warning-soft': '#FCF1DC',
    danger: '#B23731',
    'danger-soft': '#FBE5E3',
    neutral: '#5F6662',
    'neutral-soft': '#ECEEEC',
    focus: '#B83A6E',
    'camera-bg': '#120D10',
  },
  dark: {
    canvas: '#141112',
    surface: '#201B1D',
    subtle: '#2A2326',
    ink: '#F4EFF1',
    'ink-muted': '#ACA2A6',
    border: '#3D3538',
    'border-strong': '#776D71',
    'brand-pink': '#E8679C',
    accent: '#F28DB5',
    'on-accent': '#1F0A13',
    'accent-soft': '#3D2230',
    skin: '#F0A889',
    'skin-soft': '#3A2A22',
    hair: '#B9AEEA',
    'hair-soft': '#2C2840',
    ok: '#7DD8A5',
    'ok-soft': '#1B3326',
    warning: '#F2C063',
    'warning-soft': '#3A3020',
    danger: '#F59A93',
    'danger-soft': '#3D2321',
    neutral: '#B3BBB7',
    'neutral-soft': '#2A2E2C',
    focus: '#F28DB5',
    'camera-bg': '#120D10',
  },
} as const;

export type ColorToken = keyof (typeof palette)['light'];
export type ThemeColors = Record<ColorToken, string>;
export type ColorSchemeName = 'light' | 'dark';

/** Fixed camera colours (C4), the same in both themes. */
export const cameraColors = {
  bg: '#120D10',
  control: 'rgba(255,255,255,0.14)',
  guide: 'rgba(240,168,137,0.30)',
  frame: 'rgba(255,255,255,0.75)',
  /** Text, icons and the shutter ring on the camera. */
  ink: '#FFFFFF',
} as const;

export function colorsFor(scheme: ColorSchemeName): ThemeColors {
  return palette[scheme];
}

const themed = {
  light: { ...palette.light, scheme: 'light' as const },
  dark: { ...palette.dark, scheme: 'dark' as const },
};

/** The current theme's token values, switching with the phone theme. */
export function useThemeColors(): ThemeColors & { scheme: ColorSchemeName } {
  const { colorScheme } = useColorScheme();
  const scheme: ColorSchemeName = colorScheme === 'dark' ? 'dark' : 'light';
  // Stable per scheme so memos and effects that depend on it don't rerun every render.
  return themed[scheme];
}
