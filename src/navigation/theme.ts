import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import type { useThemeColors } from '@/theme/colors';

/** Navigation colours from our tokens, so the space behind screens is `canvas` in both themes. */
export function navigationTheme(colors: ReturnType<typeof useThemeColors>): Theme {
  const base = colors.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.canvas,
      card: colors.surface,
      text: colors.ink,
      border: colors.border,
      notification: colors.danger,
    },
  };
}
