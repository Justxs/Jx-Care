import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ConditionDaySection } from '@/features/condition/components/ConditionDaySection';
import { useFormat } from '@/i18n/useFormat';
import { DayNotesSection } from '@/features/products/components/DayNotesSection';
import { isValidDay } from '@/lib/appDay';

import { SkinDaySection } from '../components/SkinDaySection';

/**
 * C2 Day detail (`/calendar/day/[day]`): the date as the title and the day's skin routines.
 * Later tasks add their sections below: hair tasks done and "Next wash was due 6 Oct" (033),
 * the condition log or "Log how your skin was" (038), product notes written that day (039) and
 * the weekly photo named by its date, "Skin photo, taken 6 Oct." (037).
 */
export function DayDetailScreen() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = typeof params.day === 'string' && isValidDay(params.day) ? params.day : null;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader
        title={day ? fmt.weekdayDate(day) : t('screens.day')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/calendar'))}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 24, paddingBottom: 32 }}
      >
        {day ? (
          <SkinDaySection day={day} />
        ) : (
          <EmptyState icon="calendar" title={t('calendar.day.invalid')} />
        )}
        {/* Task 033: hair tasks done. */}
        {day ? <ConditionDaySection day={day} /> : null}
        {day ? <DayNotesSection day={day} /> : null}
        {/* Task 037: the weekly photo thumbnail. */}
      </ScrollView>
    </SafeAreaView>
  );
}
