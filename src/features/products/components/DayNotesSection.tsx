import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { motion } from '@/theme/motion';

import { useNotesOnDay } from '../notesApi';
import { NoteTags } from './NotesTimeline';

/**
 * C2 Product notes: the notes written on this day, each with its product's name and linking to
 * that product. Nothing shows on a day without notes.
 */
export function DayNotesSection({ day }: { day: string }) {
  const { t } = useTranslation();
  const notes = useNotesOnDay(day).data ?? [];
  if (notes.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(motion.duration.fast)}>
      <Card title={t('products.notes.dayTitle')} flush>
        {notes.map((note, index) => (
          <View key={note.id}>
            {index > 0 ? <Separator inset /> : null}
            <Pressable
              onPress={() => router.push(`/products/${note.productId}`)}
              accessibilityRole="link"
              accessibilityLabel={[
                t('products.notes.openProduct', { name: note.productName }),
                ...note.tags.map((tag) => t(`common.tags.${tag}`)),
                note.text,
              ].join(', ')}
              className="min-h-[56px] flex-row items-start gap-3 px-4 py-3 active:bg-accent-soft"
            >
              <View className="flex-1 gap-2">
                <Text className="text-body-strong">{note.productName}</Text>
                <NoteTags tags={note.tags} />
                <Text className="text-body">{note.text}</Text>
              </View>
              <Icon name="chevron-right" size={20} tone="ink-muted" />
            </Pressable>
          </View>
        ))}
      </Card>
    </Animated.View>
  );
}
