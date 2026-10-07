import { useSelector } from '@tanstack/react-store';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { appStore } from '@/state/app';
import { motion } from '@/theme/motion';

import { ProgressPhotosRow } from '../components/ProgressPhotosRow';
import { SkinCalendar } from '../components/SkinCalendar';
import { monthOf } from '../month';

export type CalendarView = 'skin' | 'hair' | 'condition';

/**
 * C1 Calendar: the title and the Skin / Hair / Condition switch stay put; the view below
 * cross-fades. The month and the selected day are shared by the views. Hair (task 033) and
 * Condition (task 038) replace their placeholders with a view built on `MonthGrid`.
 */
export function CalendarScreen() {
  const { t } = useTranslation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const [view, setView] = useState<CalendarView>('skin');
  const [month, setMonth] = useState(() => monthOf(today));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const openDay = useCallback((day: string) => {
    setSelectedDay(day);
    router.push(`/calendar/day/${day}`);
  }, []);

  const views: { value: CalendarView; label: string }[] = [
    { value: 'skin', label: t('calendar.views.skin') },
    { value: 'hair', label: t('calendar.views.hair') },
    { value: 'condition', label: t('calendar.views.condition') },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <View className="min-h-[56px] flex-row items-center px-4">
        <Text accessibilityRole="header" className="text-title-l">
          {t('calendar.title')}
        </Text>
      </View>
      <View className="px-4 pb-2">
        <ToggleGroup
          value={view}
          onValueChange={(v) => setView(v as CalendarView)}
          items={views}
          accessibilityLabel={t('calendar.viewSwitch')}
        />
      </View>
      <View className="flex-1">
        <Animated.View
          key={view}
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.base)}
          className="absolute inset-0"
        >
          {view === 'skin' ? (
            <SkinCalendar
              month={month}
              onMonthChange={setMonth}
              selectedDay={selectedDay}
              onDayPress={openDay}
            />
          ) : (
            <ViewPlaceholder
              label={view === 'hair' ? t('calendar.views.hair') : t('calendar.views.condition')}
              task={view === 'hair' ? '033' : '038'}
            />
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

/** Stands in for the Hair and Condition views until their tasks build them. */
function ViewPlaceholder({ label, task }: { label: string; task: string }) {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 16 }}>
      <EmptyState icon="calendar" title={label}>
        {t('dev.builtIn', { task })}
      </EmptyState>
      <ProgressPhotosRow />
    </ScrollView>
  );
}
