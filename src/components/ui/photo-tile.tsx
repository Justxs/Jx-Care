import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './text';

export type PhotoTileProps = {
  /** Local file URI. */
  src?: string;
  /** Caption under the photo ("6 Oct"). */
  date?: string;
  /** Spoken label; defaults to the date. */
  accessibilityLabel?: string;
  onPress?: () => void;
  className?: string;
};

/** A 3:4 progress photo. The box is reserved before the image decodes. */
export function PhotoTile({ src, date, accessibilityLabel, onPress, className }: PhotoTileProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel ?? date}
      className={cn('gap-1 active:opacity-85', className)}
    >
      <View
        style={{ aspectRatio: 3 / 4 }}
        className="w-full overflow-hidden rounded-md bg-neutral-soft"
      >
        {src ? (
          <Image
            source={{ uri: src }}
            contentFit="cover"
            transition={200}
            style={{ width: '100%', height: '100%' }}
          />
        ) : null}
      </View>
      {date ? <Text className="text-caption text-ink-muted">{date}</Text> : null}
    </Pressable>
  );
}
