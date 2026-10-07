import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { StreakCard } from '@/components/ui/streak';
import { Text } from '@/components/ui/text';
import { timeOfDayName } from '@/features/today/cardText';
import { useCountUp } from '@/features/today/useCountUp';
import { useFormat, type Formatter } from '@/i18n/useFormat';
import { addDays, weekdayOf } from '@/lib/appDay';
import { cn } from '@/lib/cn';
import { motion } from '@/theme/motion';
import { useMotion } from '@/theme/useMotion';

import { useRoutineDay, useSkinStreak } from '../api';
import { useNextUp } from '../playerApi';
import { attentionProducts, streakRestarted, type NextUp } from '../playerLogic';
import { useAddNote } from '../playerSlots';
import type { StepProduct } from '../repo';

type TFn = ReturnType<typeof useTranslation>['t'];

const pad = (n: number) => String(n).padStart(2, '0');

/** "21:52" for a moment in time, in the app's time format. */
function clockTime(ms: number, f: Formatter): string {
  const d = new Date(ms);
  return f.time(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
}

/** "Next: Morning · Tomorrow at 07:30". */
export function nextUpText(next: NextUp, f: Formatter, t: TFn): string {
  const time = f.time(next.time);
  const when =
    next.day === f.today
      ? t('player.done.todayAt', { time })
      : next.day === addDays(f.today, 1)
        ? t('player.done.tomorrowAt', { time })
        : t('player.done.weekdayAt', { weekday: f.weekday(weekdayOf(next.day)), time });
  return t('player.done.next', { name: timeOfDayName(next, t), when });
}

/** "SPF 50 fluid expired 2 Oct" or "SPF 50 fluid is finished". */
function attentionText(p: StepProduct, f: Formatter, t: TFn): string {
  if (p.problem === 'finished') return t('player.done.finished', { name: p.name });
  return p.effectiveExpiry
    ? t('today.routine.expiredOne', { name: p.name, date: f.date(p.effectiveExpiry) })
    : t('player.done.expired', { name: p.name });
}

/**
 * The skin streak shown on the done screen: it starts at the number from before the last tick
 * (`from`) and counts up to the new one; Reduce Motion shows the new number at once.
 */
function useStreakCount(from: number | null, to: number | undefined): number {
  const [settled, setSettled] = useState(from === null);
  // The first frame shows the number from before; the count starts right after it.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const target = to ?? from ?? 0;
  return useCountUp(settled || from === null ? Math.max(target, 0) : from);
}

/**
 * T2 Routine done: the designed, calm end of a routine. The logo fades in, the time of day is
 * done, the skin streak counts up, then what comes next and anything that needs attention.
 */
export function RoutineDoneScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const m = useMotion();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ routineId: string; from?: string }>();
  const id = Number(params.routineId);
  const from = params.from !== undefined && params.from !== '' ? Number(params.from) : null;
  const { data: r } = useRoutineDay(id);
  const { data: streak } = useSkinStreak();
  const { data: next } = useNextUp(id);
  const addNote = useAddNote();
  // Shown when the log has no finish time (the screen was opened some other way).
  const [openedAt] = useState(() => Date.now());
  const count = useStreakCount(Number.isFinite(from) ? from : null, streak?.current);

  const attention = r ? attentionProducts(r) : [];
  const lines: { key: string; icon: IconName; text: string; danger?: boolean }[] = [];
  if (next) lines.push({ key: 'next', icon: 'clock', text: nextUpText(next, f, t) });
  for (const p of attention) {
    lines.push({
      key: `p${p.id}`,
      icon: 'alert-triangle',
      text: attentionText(p, f, t),
      danger: p.problem === 'expired',
    });
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 48, gap: 24 }}>
        <Animated.View
          entering={FadeIn.duration(m.reduced ? motion.duration.reduced : motion.duration.slow)}
          className="items-center"
        >
          <Logo size={88} />
        </Animated.View>
        <View className="items-center gap-1">
          <Text accessibilityRole="header" className="text-center text-title-l">
            {r ? t('player.done.title', { name: timeOfDayName(r, t) }) : ' '}
          </Text>
          <Text className="text-center text-body text-ink-muted tabular-nums">
            {r
              ? t('player.done.summary', {
                  count: r.progress.due,
                  time: clockTime(r.log?.completedAt ?? openedAt, f),
                })
              : ' '}
          </Text>
        </View>
        <View className="flex-row">
          <StreakCard
            area="skin"
            value={count}
            best={Math.max(streak?.best ?? 0, count)}
            restarted={streak ? streakRestarted(streak) : false}
          />
        </View>
        {lines.length > 0 ? (
          <Card flush>
            {lines.map((line, i) => (
              <View key={line.key}>
                {i > 0 ? <Separator className="ml-[48px]" /> : null}
                <View className="min-h-[52px] flex-row items-center gap-3 px-4 py-3">
                  <Icon name={line.icon} size={20} tone={line.danger ? 'danger' : 'ink-muted'} />
                  <Text className={cn('flex-1 text-body', line.danger && 'text-danger')}>
                    {line.text}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
      <View className="gap-2 px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <Button onPress={() => router.dismissTo('/')}>{t('player.done.backToToday')}</Button>
        {addNote ? (
          <Button variant="ghost" onPress={() => addNote('skin')}>
            {t('player.done.addNote')}
          </Button>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
