import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { ProgressArea } from '@/db/enums';
import { showToast } from '@/state/ui';
import { motion } from '@/theme/motion';

import { useDeleteWeek, useSkipWeek } from '../api';

const leaving = FadeOut.duration(motion.duration.fast);

/**
 * The photo row at the top of Today's Check-in card (T1): "This week's skin photo" with Take photo
 * (secondary) and a plain "Skip this week" link under it, so the two never look equal.
 */
export function WeeklyPhotoRow({ area = 'skin' }: { area?: ProgressArea }) {
  const { t } = useTranslation();
  const skip = useSkipWeek();
  const undo = useDeleteWeek();

  const onSkip = () => {
    skip.mutate(
      { area },
      {
        onSuccess: (entryId) =>
          showToast({
            message: t('progress.row.skipped'),
            actionLabel: t('common.undo'),
            onAction: () => undo.mutate({ entryId, area }),
          }),
      },
    );
  };

  return (
    <Animated.View exiting={leaving} testID="weekly-photo-row" className="gap-1">
      <Text accessibilityRole="header" className="text-body-strong">
        {t('progress.row.title')}
      </Text>
      <View className="gap-1 pt-2">
        <Button
          variant="secondary"
          icon="camera"
          onPress={() => router.push(`/progress/camera?area=${area}`)}
        >
          {t('progress.row.take')}
        </Button>
        <Pressable
          onPress={onSkip}
          disabled={skip.isPending}
          accessibilityRole="button"
          className="min-h-[44px] items-center justify-center self-center px-3 active:opacity-85"
        >
          <Text className="text-body text-accent">{t('progress.row.skip')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
