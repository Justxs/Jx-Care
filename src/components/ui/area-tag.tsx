import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Text } from './text';

export type AreaTagProps = { area: 'skin' | 'hair' | 'both'; className?: string };

/** Care area as a word in a coloured pill. No icon. */
export function AreaTag({ area, className }: AreaTagProps) {
  const { t } = useTranslation();
  const box = area === 'hair' ? 'bg-hair-soft' : 'bg-skin-soft';
  const text = area === 'hair' ? 'text-hair' : 'text-skin';
  const word =
    area === 'skin'
      ? t('common.skin')
      : area === 'hair'
        ? t('common.hair')
        : t('common.skinAndHair');
  return (
    <View
      className={cn(
        'min-h-[24px] self-start justify-center rounded-full px-2 py-0.5',
        box,
        className,
      )}
    >
      <Text className={cn('text-label', text)}>{word}</Text>
    </View>
  );
}
