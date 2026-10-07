import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Icon } from './icon';
import { Text } from './text';

export type PhotoTileProps = {
  /** Local file URI. */
  src?: string;
  /** Caption under the photo ("6 Oct"). */
  date?: string;
  selected?: boolean;
  /** The "add photo" slot. */
  add?: boolean;
  /** Spoken label; defaults to the date or "Add photo". */
  accessibilityLabel?: string;
  onPress?: () => void;
  className?: string;
};

/** A 3:4 progress photo or add slot. The box is reserved before the image decodes. */
export function PhotoTile({
  src,
  date,
  selected,
  add,
  accessibilityLabel,
  onPress,
  className,
}: PhotoTileProps) {
  const { t } = useTranslation();
  const label = accessibilityLabel ?? (add ? t('a11y.photoAdd') : date);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={label}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      className={cn('gap-1 active:opacity-85', className)}
    >
      <View
        style={{ aspectRatio: 3 / 4 }}
        className={cn(
          'w-full items-center justify-center overflow-hidden rounded-md',
          add ? 'border-2 border-dashed border-border-strong bg-surface' : 'bg-neutral-soft',
          selected && 'border-[3px] border-accent',
        )}
      >
        {add ? (
          <Icon name="image-plus" size={24} tone="accent" />
        ) : src ? (
          <Image
            source={{ uri: src }}
            contentFit="cover"
            transition={200}
            style={{ width: '100%', height: '100%' }}
          />
        ) : null}
        {selected ? (
          <View className="absolute right-1.5 top-1.5 h-[24px] w-[24px] items-center justify-center rounded-full bg-accent">
            <Icon name="check" size={16} tone="on-accent" strokeWidth={3} />
          </View>
        ) : null}
      </View>
      {date ? <Text className="text-caption text-ink-muted">{date}</Text> : null}
    </Pressable>
  );
}
