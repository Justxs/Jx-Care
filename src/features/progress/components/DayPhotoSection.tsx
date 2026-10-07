import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { motion } from '@/theme/motion';

import { usePhotosForDay } from '../api';

/**
 * C2 Day detail: the weekly photo taken that day, named by its date ("Skin photo, taken 6 Oct."),
 * with a 3:4 thumbnail that opens the week (C6). Nothing shows on a day without one.
 */
export function DayPhotoSection({ day }: { day: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const photos = usePhotosForDay(day).data ?? [];
  if (photos.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(motion.duration.fast)}>
      <Card title={t('progress.day.title')} flush>
        {photos.map((p, index) => {
          const text = t(p.area === 'hair' ? 'progress.day.hair' : 'progress.day.skin', {
            date: f.date(day),
          });
          return (
            <View key={p.entryId}>
              {index > 0 ? <Separator inset /> : null}
              <Pressable
                onPress={() => router.push(`/calendar/week/${p.area}/${p.weekStart}`)}
                accessibilityRole="link"
                accessibilityLabel={text}
                className="min-h-[88px] flex-row items-center gap-3 px-4 py-3 active:bg-accent-soft"
              >
                <View className="h-[64px] w-[48px] overflow-hidden rounded-sm bg-neutral-soft">
                  <Image
                    source={{ uri: p.photo.fileUri }}
                    contentFit="cover"
                    transition={200}
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
                <Text className="flex-1 text-body">{text}</Text>
                <Icon name="chevron-right" size={20} tone="ink-muted" />
              </Pressable>
            </View>
          );
        })}
      </Card>
    </Animated.View>
  );
}
