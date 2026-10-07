import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { useRef } from 'react';
import { Pressable, View, type AccessibilityActionEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { MenuPortal } from '@/components/ui/more-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { WeekdayDots, useWeekdaysLabel } from '@/components/ui/weekday-dots';
import { ConflictTagButton } from '@/features/conflicts/components/ConflictSheets';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';

import type { RoutineItem } from '../repo';
import { useRoutineConflicts } from '../useRoutineConflicts';

export type RoutineCardProps = {
  routine: Pick<
    RoutineItem,
    'id' | 'name' | 'daysOfWeek' | 'reminderTime' | 'stepCount' | 'active'
  >;
  /** Tap: the editor (R2). */
  onPress: () => void;
  /** Start: the player (T2). */
  onStart: () => void;
  onActiveChange: (active: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const CARD = 'rounded-xl bg-surface shadow-card dark:border dark:border-border dark:shadow-none';

/** One skin routine on R1: name, days, reminder and step count, conflicts, on/off and Start. */
export function RoutineCard({
  routine,
  onPress,
  onStart,
  onActiveChange,
  onDuplicate,
  onDelete,
}: RoutineCardProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const daysLabel = useWeekdaysLabel();
  const conflicts = useRoutineConflicts(routine.id);
  const menu = useRef<DropdownMenuPrimitive.TriggerRef>(null);

  const meta = [
    routine.reminderTime
      ? t('routines.card.reminderAt', { time: f.time(routine.reminderTime) })
      : t('routines.card.noReminder'),
    t('routines.card.steps', { count: routine.stepCount }),
  ].join(' · ');
  const muted = !routine.active;

  const actions = [
    { key: 'duplicate', label: t('routines.duplicate'), onPress: onDuplicate },
    { key: 'delete', label: t('common.delete'), onPress: onDelete },
  ];
  const spoken = [
    routine.name,
    daysLabel(routine.daysOfWeek),
    meta,
    muted ? t('routines.card.off') : null,
  ]
    .filter(Boolean)
    .join(', ');

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'activate') return onPress();
    actions.find((a) => a.key === name)?.onPress();
  };

  return (
    <DropdownMenuPrimitive.Root>
      {/* The whole card opens the editor; screen readers use the info block below instead. */}
      <Pressable
        onPress={onPress}
        onLongPress={() => menu.current?.open()}
        accessible={false}
        testID={`routine-card-${routine.id}`}
        className={cn(CARD, 'gap-3 p-4 active:bg-subtle')}
      >
        <View className="flex-row items-start gap-3">
          <View className="flex-1 gap-2">
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel={spoken}
              accessibilityActions={[
                { name: 'activate' },
                ...actions.map((a) => ({ name: a.key, label: a.label })),
              ]}
              onAccessibilityAction={onAccessibilityAction}
              className="gap-2"
            >
              <Text className={cn('text-body-strong', muted ? 'text-ink-muted' : 'text-ink')}>
                {routine.name}
              </Text>
              <WeekdayDots value={routine.daysOfWeek} />
              <Text className={cn('text-caption', muted ? 'text-ink-muted' : 'text-ink')}>
                {meta}
              </Text>
            </View>
            {/* Its own button (opens the conflict sheet), so it sits outside the info block. */}
            <ConflictTagButton targets={conflicts} routineId={routine.id} />
          </View>
          <View className="min-h-[44px] justify-center">
            <Switch
              checked={routine.active}
              onCheckedChange={onActiveChange}
              accessibilityLabel={t('routines.card.active', { name: routine.name })}
            />
          </View>
        </View>
        <Button
          variant="secondary"
          size="sm"
          block={false}
          onPress={onStart}
          accessibilityLabel={t('routines.card.start', { name: routine.name })}
        >
          {t('common.start')}
        </Button>
        {/* Invisible anchor: long press opens the actions menu here. */}
        <DropdownMenuPrimitive.Trigger
          ref={menu}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          className="absolute right-4 top-4 h-px w-px"
        />
      </Pressable>
      <MenuPortal
        items={[
          { label: t('routines.duplicate'), icon: 'copy', onPress: onDuplicate },
          { label: t('common.delete'), icon: 'trash-2', destructive: true, onPress: onDelete },
        ]}
      />
    </DropdownMenuPrimitive.Root>
  );
}

/** A routine card while the list loads, at its final size. */
export function RoutineCardSkeleton() {
  return (
    <View className={cn(CARD, 'gap-3 p-4')}>
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-2">
          <Skeleton width="55%" height={22} />
          <Skeleton width={164} height={20} radius={10} />
          <Skeleton width="65%" height={18} />
        </View>
        <Skeleton width={48} height={28} radius={14} />
      </View>
      <Skeleton width={88} height={40} radius={12} />
    </View>
  );
}
