import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { StreakChip } from '@/components/ui/streak';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import type { Streak } from '@/lib/streak';

import { greetingFor, type Greeting } from '../logic';
import { useCountUp } from '../useCountUp';

export type TodayHeaderProps = {
  day: string;
  /** Null hides the chip (no routine yet, or no wash task for hair). */
  skinStreak: Streak | null;
  hairStreak: Streak | null;
  onStreakPress: () => void;
};

/** The greeting for now, checked once a minute so it changes at 12:00 and 18:00 on screen. */
function useGreeting(): Greeting {
  const [greeting, setGreeting] = useState(() => greetingFor(Date.now()));
  useEffect(() => {
    const id = setInterval(() => setGreeting(greetingFor(Date.now())), 60_000);
    return () => clearInterval(id);
  }, []);
  return greeting;
}

/** Greeting by time of day, the date and the streak chips (calendar-check, never a flame). */
export function TodayHeader({ day, skinStreak, hairStreak, onStreakPress }: TodayHeaderProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const skin = useCountUp(skinStreak?.current ?? 0);
  const hair = useCountUp(hairStreak?.current ?? 0);
  const greeting = useGreeting();
  return (
    <View className="gap-1 pt-2">
      <Text accessibilityRole="header" className="text-title-l">
        {t(`today.greeting.${greeting}`)}
      </Text>
      <Text className="text-body text-ink-muted">{f.weekdayDate(day)}</Text>
      {skinStreak || hairStreak ? (
        <View accessibilityLabel={t('today.streaks')} className="flex-row flex-wrap gap-2 pt-2">
          {skinStreak ? <StreakChip area="skin" value={skin} onPress={onStreakPress} /> : null}
          {hairStreak ? <StreakChip area="hair" value={hair} onPress={onStreakPress} /> : null}
        </View>
      ) : null}
    </View>
  );
}
