import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { useSetChoice, useTickStep } from '@/features/routines/api';
import type { TodayRoutineGroup } from '@/features/routines/repo';
import { weekdayOf } from '@/lib/appDay';
import { showToast } from '@/state/ui';

import { timeOfDayName } from './cardText';
import { chosenRoutine, remainingStepIds } from './logic';

/** All done and the A/B pick for Today's routine cards. */
export function useRoutineActions(day: string) {
  const { t } = useTranslation();
  const tick = useTickStep();
  const choose = useSetChoice();

  /**
   * Ticks every due step not ticked yet in one optimistic update and shows "Evening done" with
   * Undo, which unticks exactly those steps. It never opens the Routine done screen.
   */
  const allDone = (group: TodayRoutineGroup) => {
    const r = chosenRoutine(group);
    const stepIds = remainingStepIds(r);
    if (stepIds.length === 0) return;
    const vars = {
      routineId: r.id,
      stepIds,
      day,
      done: true,
      dueStepIds: r.progress.dueStepIds,
    };
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    tick.mutate(vars);
    showToast({
      message: t('today.routine.doneToast', { name: timeOfDayName(group, t) }),
      actionLabel: t('common.undo'),
      onAction: () => tick.mutate({ ...vars, done: false }),
    });
  };

  /** Remembers the pick for this weekday; only offered before the first tick. */
  const pick = (group: TodayRoutineGroup, routineId: number) => {
    if (group.started || routineId === group.chosenId) return;
    choose.mutate({ timeOfDayKey: group.key, weekday: weekdayOf(day), routineId });
  };

  return { allDone, pick };
}
