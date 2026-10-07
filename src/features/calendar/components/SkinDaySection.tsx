import { useSelector } from '@tanstack/react-store';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { DayRoutine, RoutineStepItem } from '@/features/routines/repo';
import { cn } from '@/lib/cn';
import type { SkinDayStatus } from '@/lib/streak';
import { appStore } from '@/state/app';

import { useSkinDay, useTickDayStep } from '../api';
import { canEditDay, type SkinDayGroup } from '../repo';
import { DayMark } from './DayMark';

type RoutineStatus = Exclude<SkinDayStatus, 'none'>;

function routineStatus(r: DayRoutine, day: string, today: string): RoutineStatus {
  if (r.progress.complete) return 'done';
  if (r.progress.done > 0) return 'partly';
  return day < today ? 'missed' : 'pending';
}

/**
 * C2 Skin routines: each routine due that day with its status and every due step ticked or
 * not. Today and the six days before can be changed; older days show static ticks.
 */
export function SkinDaySection({ day }: { day: string }) {
  const { t } = useTranslation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const { data } = useSkinDay(day);
  const tick = useTickDayStep();
  const editable = canEditDay(day, today);
  const future = day > today;

  const groupName = (g: Pick<SkinDayGroup, 'timeOfDay' | 'customName'>) =>
    g.timeOfDay === 'custom' ? (g.customName ?? t('common.custom')) : t(`common.${g.timeOfDay}`);

  if (!data) {
    return (
      <Card title={t('calendar.day.skinRoutines')}>
        <Skeleton height={136} />
      </Card>
    );
  }

  const routines = data.groups.flatMap((g) => g.routines.map((r) => ({ group: g, routine: r })));

  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="px-1 text-title-s">
        {t('calendar.day.skinRoutines')}
      </Text>
      {data.status === 'missed' ? (
        <Text className="px-1 text-body text-ink-muted">
          {t('calendar.day.nothingDone', {
            count: data.groups.length,
            names: data.groups.map(groupName).join(', '),
          })}
        </Text>
      ) : null}
      {!editable && !future && routines.length > 0 ? (
        <Text className="px-1 text-caption text-ink-muted">{t('calendar.day.readOnly')}</Text>
      ) : null}
      {future && routines.length > 0 ? (
        <Text className="px-1 text-caption text-ink-muted">{t('calendar.day.future')}</Text>
      ) : null}

      {routines.length === 0 ? (
        <Card>
          <Text className="text-body text-ink-muted">{t('calendar.day.nothingDue')}</Text>
        </Card>
      ) : (
        routines.map(({ group, routine }) => {
          const status = routineStatus(routine, day, today);
          const done = new Set(routine.log?.doneStepIds ?? []);
          return (
            <Card key={routine.id} flush>
              <View
                accessible
                accessibilityLabel={`${routine.name}, ${t(`calendar.day.status.${status}`)}`}
                className="min-h-[56px] flex-row items-center gap-3 px-4 py-3"
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-body-strong">{routine.name}</Text>
                  <Text className="text-caption text-ink-muted">{groupName(group)}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <DayMark status={status} />
                  <Text className="text-label text-ink-muted">
                    {t(`calendar.day.status.${status}`)}
                  </Text>
                </View>
              </View>
              {routine.dueSteps.map((step, i) => (
                <View key={step.id}>
                  <Separator className="ml-4" />
                  <StepRow
                    label={stepLabel(step, i, t)}
                    ticked={done.has(step.id)}
                    editable={editable}
                    onTick={(next) =>
                      tick({
                        routineId: routine.id,
                        stepIds: [step.id],
                        day,
                        done: next,
                        dueStepIds: routine.progress.dueStepIds,
                      })
                    }
                  />
                </View>
              ))}
            </Card>
          );
        })
      )}
    </View>
  );
}

function stepLabel(
  step: RoutineStepItem,
  index: number,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  return step.product?.name ?? step.note ?? t('calendar.day.step', { index: index + 1 });
}

type StepRowProps = {
  label: string;
  ticked: boolean;
  editable: boolean;
  onTick: (done: boolean) => void;
};

function StepRow({ label, ticked, editable, onTick }: StepRowProps) {
  const { t } = useTranslation();
  const text = <Text className={cn('flex-1 text-body', ticked && 'text-ink-muted')}>{label}</Text>;
  if (editable) {
    return (
      <View className="min-h-[52px] flex-row items-center gap-3 px-4 py-2">
        <Checkbox checked={ticked} onCheckedChange={onTick} accessibilityLabel={label} />
        {text}
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={t(`calendar.day.stepState.${ticked ? 'done' : 'notDone'}`, {
        name: label,
      })}
      className="min-h-[52px] flex-row items-center gap-3 px-4 py-2"
    >
      <StaticTick ticked={ticked} />
      {text}
    </View>
  );
}

/** The checkbox's look without its press: read-only days show what was ticked. */
function StaticTick({ ticked }: { ticked: boolean }) {
  return (
    <View
      className={cn(
        'h-[26px] w-[26px] items-center justify-center rounded-[7px] border-2',
        ticked ? 'border-accent bg-accent' : 'border-border-strong bg-surface',
      )}
    >
      {ticked ? <Icon name="check" size={18} tone="on-accent" strokeWidth={3} /> : null}
    </View>
  );
}
