import { useSelector } from '@tanstack/react-store';
import * as Haptics from 'expo-haptics';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { appStore } from '@/state/app';

import { useConditionDay, useToggleConditionState } from '../api';
import { ConditionChips } from './ConditionChips';
import { useConditionLogSheet } from './ConditionLogSheet';

/**
 * Today's Check-in, condition part: "How's your skin today?" with the seven skin chips (a tap
 * saves at once, with a light haptic) and "Hair and note", which opens T4 on Hair for today.
 */
export function SkinCheckIn() {
  const { t } = useTranslation();
  const day = useSelector(appStore, (s) => s.activeDay);
  const { data } = useConditionDay(day);
  const toggle = useToggleConditionState();
  const sheet = useConditionLogSheet();

  return (
    <View className="gap-3">
      <Text className="text-body-strong">{t('condition.checkIn.question')}</Text>
      <ConditionChips
        area="skin"
        value={data?.skin?.states ?? []}
        accessibilityLabel={t('condition.checkIn.question')}
        onToggle={(state) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          toggle.mutate({ day, area: 'skin', state });
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        block={false}
        icon="notebook-pen"
        onPress={() => sheet.open(day, 'hair')}
        className="-ml-4"
      >
        {t('condition.checkIn.hairAndNote')}
      </Button>
      {sheet.element}
    </View>
  );
}
