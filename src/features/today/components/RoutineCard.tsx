import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipGroup } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Text } from '@/components/ui/text';
import { chosenRoutine, type TodayRoutineGroup } from '@/features/routines/repo';
import { useFormat } from '@/i18n/useFormat';
import { weekdayOf } from '@/lib/appDay';
import { motion } from '@/theme/motion';
import { useMotion } from '@/theme/useMotion';

import { expiredText, routineMeta, timeOfDayName } from '../cardText';
import { doneTransition, expiredProducts } from '../logic';
import { useCardConflictSlot } from '../slots';

export type RoutineCardProps = {
  group: TodayRoutineGroup;
  day: string;
  /** The first unfinished card's Start is the screen's one filled button. */
  primary: boolean;
  /** Start, Continue and the done row open the player. */
  onOpen: (routineId: number) => void;
  onAllDone: (group: TodayRoutineGroup) => void;
  onChoose: (group: TodayRoutineGroup, routineId: number) => void;
  onAboutAB: (group: TodayRoutineGroup) => void;
};

/**
 * One time of day on Today (T1): name, reminder and step count, progress ring, A/B chips until
 * the first tick, expired products in red, Start or Continue and All done. Once finished it
 * collapses to a ticked row (250 ms; a short fade with Reduce Motion).
 */
export function RoutineCard(props: RoutineCardProps) {
  const m = useMotion();
  const transition = doneTransition(m.reduced);
  return (
    <Animated.View
      testID={`routine-card-${props.group.key}`}
      layout={
        transition.kind === 'collapse' ? LinearTransition.duration(transition.duration) : undefined
      }
    >
      {props.group.complete ? (
        <Animated.View
          key="done"
          entering={FadeIn.duration(transition.duration).reduceMotion(ReduceMotion.Never)}
        >
          <DoneRow {...props} />
        </Animated.View>
      ) : (
        <Animated.View
          key="card"
          exiting={FadeOut.duration(
            transition.kind === 'collapse' ? motion.duration.fast : transition.duration,
          ).reduceMotion(ReduceMotion.Never)}
        >
          <OpenCard {...props} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

function OpenCard({
  group,
  day,
  primary,
  onOpen,
  onAllDone,
  onChoose,
  onAboutAB,
}: RoutineCardProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const chosen = chosenRoutine(group);
  const name = timeOfDayName(group, t);
  const expired = expiredText(expiredProducts(chosen), f, t);
  const conflict = useCardConflictSlot(chosen.id);
  const hasOptions = group.routines.length > 1;
  const showChoice = hasOptions && !group.started;
  const meta = routineMeta(chosen, f, t);
  const weekdays = t(`today.weekdaysPlural.${weekdayOf(day)}`);

  return (
    <Card className="gap-3">
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-0.5">
          <Text accessibilityRole="header" className="text-title-s">
            {name}
          </Text>
          <Text className="text-caption text-ink-muted">
            {hasOptions && !showChoice ? `${chosen.name} · ${meta}` : meta}
          </Text>
          {conflict ? <View className="pt-1">{conflict}</View> : null}
        </View>
        <ProgressRing value={chosen.progress.done} max={chosen.progress.due} />
      </View>

      {showChoice ? (
        <View className="gap-2">
          <ChipGroup
            single
            allowEmpty={false}
            accessibilityLabel={t('today.routine.options', { name })}
            items={group.routines.map((r) => ({ value: String(r.id), label: r.name }))}
            value={[String(chosen.id)]}
            onValueChange={([v]) => {
              if (v) onChoose(group, Number(v));
            }}
          />
          <View>
            <Text className="text-caption text-ink-muted">
              {t(`today.routine.pick.${group.timeOfDay}`, { weekdays })}
            </Text>
            <Pressable
              onPress={() => onAboutAB(group)}
              accessibilityRole="button"
              hitSlop={{ top: 4, bottom: 4 }}
              className="min-h-[44px] justify-center self-start active:opacity-85"
            >
              <Text className="text-label text-accent">{t('today.routine.aboutAB')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {expired ? <Text className="text-label text-danger">{expired}</Text> : null}

      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          variant={primary ? 'primary' : 'secondary'}
          onPress={() => onOpen(chosen.id)}
        >
          {group.started ? t('common.continue') : t('common.start')}
        </Button>
        <Button
          className="flex-1"
          variant="secondary"
          icon="check-check"
          onPress={() => onAllDone(group)}
        >
          {t('common.allDone')}
        </Button>
      </View>
    </Card>
  );
}

function DoneRow({ group, onOpen }: RoutineCardProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const chosen = chosenRoutine(group);
  const name = timeOfDayName(group, t);
  const expired = expiredText(expiredProducts(chosen), f, t);
  const done = t('today.routine.done');
  const detail = group.routines.length > 1 ? `${chosen.name} · ${done}` : done;
  return (
    <Pressable
      onPress={() => onOpen(chosen.id)}
      accessibilityRole="button"
      accessibilityLabel={[t('today.routine.doneLabel', { name }), expired]
        .filter(Boolean)
        .join(' ')}
      className="min-h-[56px] flex-row items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-card active:opacity-85 dark:border dark:border-border dark:shadow-none"
    >
      <Icon name="circle-check" size={24} tone="ok" />
      <View className="flex-1 gap-0.5">
        <Text className="text-body-strong">{name}</Text>
        <Text className="text-caption text-ink-muted">{detail}</Text>
        {expired ? <Text className="text-caption text-danger">{expired}</Text> : null}
      </View>
      <Icon name="chevron-right" size={20} tone="ink-muted" />
    </Pressable>
  );
}
