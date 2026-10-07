import { useSelector } from '@tanstack/react-store';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ConflictExplainSheet, type ConflictExplain } from '@/components/ExplainSheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { usePlayerConflicts, type PlayerConflict } from '@/features/conflicts/hooks';
import { useBuyAgain } from '@/features/shopping/api';
import { timeOfDayName } from '@/features/today/cardText';
import { appStore } from '@/state/app';
import { setToastInset, uiStore } from '@/state/ui';
import { motion } from '@/theme/motion';

import {
  applyTickToRoutine,
  useReplaceStepProduct,
  useRoutineDay,
  useSkinStreak,
  useTickStep,
  type TickVars,
} from '../api';
import { PlayerStep, type StepConflict } from '../components/PlayerStep';
import { ProblemStepCard } from '../components/ProblemStepCard';
import { StepProductPicker } from '../components/StepProductPicker';
import { WaitBar } from '../components/WaitBar';
import { heldStepId, playerSegments, remainingIds, stepCounter } from '../playerLogic';
import type { DayRoutine, RoutineStepItem } from '../repo';
import { useWaitTimer } from '../useWaitTimer';

/** Space kept under the list so the last step scrolls clear of the floating wait bar. */
const LIST_END_SPACE = 120;

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** Hands over to the Routine done screen with the streak as it was, so it can count up. */
function finish(routineId: number, streakBefore: number | undefined) {
  router.replace({
    pathname: '/player/[routineId]/done',
    params: {
      routineId: String(routineId),
      ...(streakBefore === undefined ? {} : { from: String(streakBefore) }),
    },
  });
}

/**
 * T2 Routine player: the steps due today, ticked one by one (the whole row is the target) or all
 * at once, a wait between steps that need it, and cards for expired, finished or missing
 * products. Ticks save as they happen; the last one hands over to the Routine done screen.
 */
export function RoutinePlayerScreen() {
  const { t } = useTranslation();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const id = Number(routineId);
  const { data: routine, isPending } = useRoutineDay(id);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      {isPending ? (
        <PlayerSkeleton />
      ) : routine && routine.dueSteps.length > 0 ? (
        <Player routine={routine} />
      ) : (
        <>
          <CloseOnlyHeader />
          <EmptyState
            icon="calendar"
            title={routine ? t('player.notDue.title') : t('player.missing.title')}
            actionLabel={t('common.close')}
            onAction={close}
          >
            {routine ? t('player.notDue.body', { name: routine.name }) : t('player.missing.body')}
          </EmptyState>
        </>
      )}
    </SafeAreaView>
  );
}

function CloseButton() {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={close}
      accessibilityRole="button"
      accessibilityLabel={t('a11y.close')}
      className="h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-85"
    >
      <Icon name="x" size={24} tone="ink" />
    </Pressable>
  );
}

function CloseOnlyHeader() {
  return (
    <View className="min-h-[64px] flex-row items-center px-1">
      <CloseButton />
    </View>
  );
}

function PlayerSkeleton() {
  return (
    <View>
      <CloseOnlyHeader />
      <View className="gap-4 px-4 pt-2">
        <Skeleton height={72 * 4} radius={16} />
      </View>
    </View>
  );
}

type SheetState = { open: boolean; conflict: ConflictExplain | null };

function Player({ routine: r }: { routine: DayRoutine }) {
  const { t } = useTranslation();
  const day = useSelector(appStore, (s) => s.activeDay);
  const streak = useSkinStreak();
  const tick = useTickStep();
  const replace = useReplaceStepProduct();
  const buyAgain = useBuyAgain();
  const conflicts = usePlayerConflicts(r.id, day);
  const wait = useWaitTimer();
  const [picking, setPicking] = useState<{ open: boolean; stepId: number | null }>({
    open: false,
    stepId: null,
  });
  const [sheet, setSheet] = useState<SheetState>({ open: false, conflict: null });
  const [barHeight, setBarHeight] = useState(0);
  const waiting = wait.stepId !== null;

  // Toasts float above the wait bar while it shows; whatever was below them before comes back.
  useEffect(() => {
    const base = uiStore.state.toastInset;
    return () => setToastInset(base);
  }, []);
  useEffect(() => {
    setToastInset(waiting ? barHeight : 0);
  }, [waiting, barHeight]);

  const doneIds = r.log?.doneStepIds ?? [];
  const done = new Set(doneIds);
  const held = waiting ? heldStepId(r.dueSteps, doneIds, wait.stepId!) : null;
  const remaining = remainingIds(r);
  const counter = stepCounter(r.progress);

  const vars = (stepIds: number[], next: boolean): TickVars => ({
    routineId: r.id,
    stepIds,
    day,
    done: next,
    dueStepIds: r.progress.dueStepIds,
  });

  const toggle = (step: RoutineStepItem, next: boolean) => {
    const v = vars([step.id], next);
    const before = streak.data?.current;
    const completes = !r.progress.complete && applyTickToRoutine(r, v).progress.complete;
    tick.mutate(v);
    if (completes) {
      wait.stop();
      finish(r.id, before);
      return;
    }
    if (next && step.waitSeconds > 0) wait.start(step.waitSeconds, step.id);
    else if (next || step.id === wait.stepId) wait.stop();
  };

  const allDone = () => {
    if (remaining.length === 0) return;
    const before = streak.data?.current;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    tick.mutate(vars(remaining, true));
    wait.stop();
    finish(r.id, before);
  };

  const conflictOf = (stepId: number): StepConflict | null => {
    const mine = conflicts.filter((c) => c.stepId === stepId);
    if (mine.length === 0) return null;
    return {
      mild: mine.every((c) => c.conflict.mild),
      onPress: () => setSheet({ open: true, conflict: mine[0]!.conflict }),
    };
  };

  return (
    <View className="flex-1">
      <View className="min-h-[64px] flex-row items-center gap-2 px-1">
        <CloseButton />
        <View className="flex-1 gap-0.5 py-1">
          <Text accessibilityRole="header" className="text-title-m">
            {r.name}
          </Text>
          <Text className="text-caption text-ink-muted tabular-nums">
            {`${timeOfDayName(r, t)} · ${t('common.stepOf', counter)}`}
          </Text>
        </View>
        <View className="pr-3">
          <ProgressRing value={r.progress.done} max={r.progress.due} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: LIST_END_SPACE, gap: 16 }}>
        {playerSegments(r.dueSteps).map((segment) =>
          segment.kind === 'rows' ? (
            <Card key={`rows-${segment.steps[0]!.id}`} flush>
              {segment.steps.map((step, i) => (
                <View key={step.id}>
                  {i > 0 ? <Separator className="ml-[76px]" /> : null}
                  <PlayerStep
                    step={step}
                    done={done.has(step.id)}
                    held={held === step.id}
                    conflict={conflictOf(step.id)}
                    onToggle={(next) => toggle(step, next)}
                  />
                </View>
              ))}
            </Card>
          ) : (
            <ProblemStepCard
              key={`problem-${segment.step.id}`}
              step={segment.step}
              index={r.dueSteps.indexOf(segment.step) + 1}
              problem={segment.problem}
              done={done.has(segment.step.id)}
              held={held === segment.step.id}
              conflict={conflictOf(segment.step.id)}
              onToggle={(next) => toggle(segment.step, next)}
              onPick={() => setPicking({ open: true, stepId: segment.step.id })}
              onBuyAgain={
                segment.step.product
                  ? () =>
                      buyAgain([{ id: segment.step.product!.id, name: segment.step.product!.name }])
                  : null
              }
            />
          ),
        )}

        {conflicts.length > 0 ? (
          <Animated.View entering={FadeIn.duration(motion.duration.base)} className="gap-2">
            {conflicts.map((c) => (
              <ConflictLine
                key={`${c.stepId}-${c.conflict.second.product}-${c.conflict.second.routine}`}
                item={c}
                onWhy={() => setSheet({ open: true, conflict: c.conflict })}
              />
            ))}
          </Animated.View>
        ) : null}

        {remaining.length > 0 ? (
          <Button variant="ghost" icon="check-check" onPress={allDone}>
            {t('common.allDone')}
          </Button>
        ) : null}
      </ScrollView>

      {waiting ? (
        <WaitBar remaining={wait.remaining} onSkip={wait.stop} onHeight={setBarHeight} />
      ) : null}

      <StepProductPicker
        open={picking.open}
        onClose={() => setPicking((p) => ({ ...p, open: false }))}
        onPick={(productId) => {
          if (picking.stepId !== null) replace.mutate({ stepId: picking.stepId, productId });
          setPicking((p) => ({ ...p, open: false }));
        }}
      />
      <ConflictExplainSheet
        open={sheet.open}
        conflict={sheet.conflict}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
      />
    </View>
  );
}

/**
 * The amber line under the list: "Vitamin C serum conflicts with the glycolic acid toner in
 * Evening B. Using both on one day can irritate. Why?"
 */
function ConflictLine({ item, onWhy }: { item: PlayerConflict; onWhy: () => void }) {
  const { t } = useTranslation();
  const c = item.conflict;
  return (
    <View className="gap-1 rounded-md bg-warning-soft px-3 pt-3">
      <View className="flex-row gap-2">
        <Icon name="alert-triangle" size={18} tone="warning" />
        <Text className="flex-1 text-body">
          {/* The rule's note names the risk; without one, the general line does. */}
          {t(c.note ? 'conflicts.playerLine' : 'player.conflictLine', {
            product: c.first.product,
            other: c.second.product,
            routine: c.second.routine,
            note: c.note,
          })}
        </Text>
      </View>
      <Pressable
        onPress={onWhy}
        accessibilityRole="button"
        accessibilityLabel={t('player.whyLabel')}
        className="ml-[26px] min-h-[44px] justify-center self-start active:opacity-85"
      >
        <Text className="text-body-strong text-accent">{t('player.why')}</Text>
      </Pressable>
    </View>
  );
}
