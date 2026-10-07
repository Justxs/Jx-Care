import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Icon } from './icon';
import { Text } from './text';

export type ConflictTagProps = {
  mild?: boolean;
  label?: string;
  onPress?: () => void;
  className?: string;
};

/** The only conflict marker: an amber pill with a triangle and the word. Never red. */
export function ConflictTag({ mild, label, onPress, className }: ConflictTagProps) {
  const { t } = useTranslation();
  const word = label ?? (mild ? t('common.mildConflict') : t('common.conflict'));
  const body = (
    <>
      <Icon name="alert-triangle" size={14} tone="warning" />
      <Text className="text-label text-warning">{word}</Text>
    </>
  );
  const box = cn(
    'min-h-[24px] flex-row items-center gap-1 self-start rounded-full bg-warning-soft px-2 py-0.5',
    className,
  );
  if (!onPress) {
    return (
      <View className={box} accessible accessibilityLabel={word}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('a11y.conflictOpen', { label: word })}
      hitSlop={10}
      onPress={onPress}
      className={cn(box, 'active:opacity-85')}
    >
      {body}
    </Pressable>
  );
}
