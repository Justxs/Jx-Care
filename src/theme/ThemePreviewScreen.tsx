import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, type ColorToken } from './colors';

// Literal class names so Tailwind sees them when it scans the source.
const swatchClass: Record<ColorToken, string> = {
  canvas: 'bg-canvas',
  surface: 'bg-surface',
  subtle: 'bg-subtle',
  ink: 'bg-ink',
  'ink-muted': 'bg-ink-muted',
  border: 'bg-border',
  'border-strong': 'bg-border-strong',
  'brand-pink': 'bg-brand-pink',
  accent: 'bg-accent',
  'on-accent': 'bg-on-accent',
  'accent-soft': 'bg-accent-soft',
  skin: 'bg-skin',
  'skin-soft': 'bg-skin-soft',
  hair: 'bg-hair',
  'hair-soft': 'bg-hair-soft',
  ok: 'bg-ok',
  'ok-soft': 'bg-ok-soft',
  warning: 'bg-warning',
  'warning-soft': 'bg-warning-soft',
  danger: 'bg-danger',
  'danger-soft': 'bg-danger-soft',
  neutral: 'bg-neutral',
  'neutral-soft': 'bg-neutral-soft',
  focus: 'bg-focus',
  'camera-bg': 'bg-camera-bg',
};

const typeStyles = [
  'text-display',
  'text-title-l',
  'text-title-m',
  'text-title-s',
  'text-body-l',
  'text-body',
  'text-body-strong',
  'text-label',
  'text-caption',
  'text-overline',
] as const;

const sample = 'Ąžuolinė šukuosena · 12,50 €';

/** Development-only page that shows every token, for checking the theme in light and dark. */
export function ThemePreviewScreen() {
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="gap-6 p-4">
        <Text className="text-title-l text-ink">Theme</Text>
        <View className="flex-row flex-wrap gap-3">
          {(Object.keys(palette.light) as ColorToken[]).map((token) => (
            <View key={token} className="w-[100px] gap-1">
              <View className={`h-12 rounded-md border border-border ${swatchClass[token]}`} />
              <Text className="text-caption text-ink-muted">{token}</Text>
            </View>
          ))}
        </View>
        <View className="gap-2">
          {typeStyles.map((style) => (
            <View key={style}>
              <Text className="text-caption text-ink-muted">{style}</Text>
              <Text className={`${style} text-ink`}>{sample}</Text>
            </View>
          ))}
          <Text className="text-body text-ink tabular-nums">0123456789 · 9 days · 10 days</Text>
        </View>
        <View className="flex-row gap-3">
          <View className="h-16 w-16 rounded-sm bg-surface shadow-card" />
          <View className="h-16 w-16 rounded-md bg-surface shadow-card" />
          <View className="h-16 w-16 rounded-xl bg-surface shadow-card" />
          <View className="h-16 w-16 rounded-xl bg-surface shadow-raised" />
          <View className="h-16 w-16 rounded-full bg-accent" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
