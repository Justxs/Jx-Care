import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Icon } from './icon';
import { Text } from './text';

type StreakArea = 'skin' | 'hair';

const tones = {
  skin: { box: 'bg-skin-soft', text: 'text-skin', icon: 'skin' },
  hair: { box: 'bg-hair-soft', text: 'text-hair', icon: 'hair' },
} as const;

export type StreakChipProps = {
  area: StreakArea;
  value: number;
  /** Opens the streak explain sheet. */
  onPress?: () => void;
  className?: string;
};

/** "12 skin" after a calendar-check icon. Never a flame. */
export function StreakChip({ area, value, onPress, className }: StreakChipProps) {
  const { t } = useTranslation();
  const tone = tones[area];
  const areaWord = t(`streak.${area}Word`);
  const body = (
    <>
      <Icon name="calendar-check" size={16} tone={tone.icon} />
      <Text className={cn('text-label tabular-nums', tone.text)}>
        {t('streak.chip', { count: value, area: areaWord })}
      </Text>
    </>
  );
  const box = cn(
    'min-h-[28px] min-w-[72px] flex-row items-center justify-center gap-1 self-start rounded-full px-2.5 py-1',
    tone.box,
    className,
  );
  const spoken = t('streak.chipLabel', { count: value, area: t(`common.${area}`) });
  if (!onPress) {
    return (
      <View
        accessible
        accessibilityLabel={`${t(`common.${area}`)}: ${t('streak.inARow', { count: value })}`}
        className={box}
      >
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      className={cn(box, 'active:opacity-85')}
    >
      {body}
    </Pressable>
  );
}

export type StreakCardProps = {
  area: StreakArea;
  value: number;
  best: number;
  /** The streak broke and started again. */
  restarted?: boolean;
  onPress?: () => void;
  className?: string;
};

/** Half-width card: current streak large, best below. */
export function StreakCard({ area, value, best, restarted, onPress, className }: StreakCardProps) {
  const { t } = useTranslation();
  const tone = tones[area];
  const line = restarted
    ? t('streak.restarted', { count: best })
    : t('streak.best', { count: best });
  const spoken = `${t(`common.${area}`)}: ${t('streak.inARow', { count: value })}. ${line}`;
  const body = (
    <>
      <View className="flex-row items-center gap-1.5">
        <Icon name="calendar-check" size={18} tone={tone.icon} />
        <Text className={cn('text-label', tone.text)}>{t(`common.${area}`)}</Text>
      </View>
      <Text className="text-display tabular-nums">{value}</Text>
      <Text className="text-caption text-ink-muted">{line}</Text>
    </>
  );
  const box = cn(
    'flex-1 gap-1 rounded-xl bg-surface p-4 shadow-card dark:border dark:border-border dark:shadow-none',
    className,
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={spoken} className={box}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      className={cn(box, 'active:opacity-85')}
    >
      {body}
    </Pressable>
  );
}
