import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { useRef } from 'react';
import { Pressable, View, type AccessibilityActionEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { MenuPortal } from '@/components/ui/more-menu';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

import { SETUP_STEPS, type SetupStepKey, type SetupView } from '../logic';
import type { SetupProgress } from '../repo';

export type SetupCardProps = {
  view: SetupView;
  progress: SetupProgress;
  onStep: (step: SetupStepKey) => void;
  /** Hide (long press) and See today: removes the card at once. */
  onHide: () => void;
};

/**
 * TodayFirstRunScreen's card: "Set up Jx-Care" with three steps computed from data, the next one
 * opened up with the filled button, then "You're set" once all three are done.
 */
export function SetupCard({ view, progress, onStep, onHide }: SetupCardProps) {
  const { t } = useTranslation();
  const menu = useRef<DropdownMenuPrimitive.TriggerRef>(null);
  const openMenu = () => menu.current?.open();
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'hide') onHide();
  };

  return (
    <DropdownMenuPrimitive.Root>
      <Pressable
        onLongPress={openMenu}
        accessibilityActions={[{ name: 'hide', label: t('today.setup.hideLabel') }]}
        onAccessibilityAction={onAccessibilityAction}
        testID="setup-card"
      >
        {view.mode === 'set' ? (
          <Card className="items-center gap-3 py-6">
            <Logo size={72} />
            <Text accessibilityRole="header" className="text-center text-title-m">
              {t('today.setup.setTitle')}
            </Text>
            <Text className="text-center text-body text-ink-muted">{t('today.setup.setBody')}</Text>
            <Button onPress={onHide} className="mt-1">
              {t('today.setup.seeToday')}
            </Button>
          </Card>
        ) : (
          <Card flush>
            <View className="gap-2 px-4 pb-2 pt-4">
              <View className="flex-row items-center justify-between gap-2">
                <Text accessibilityRole="header" className="flex-1 text-title-s">
                  {t('today.setup.title')}
                </Text>
                <Text className="text-label text-ink-muted tabular-nums">
                  {t('today.setup.progress', { done: view.done, total: view.total })}
                </Text>
              </View>
              <Progress
                value={view.done}
                max={view.total}
                accessibilityLabel={t('today.setup.progressLabel', {
                  done: view.done,
                  total: view.total,
                })}
              />
            </View>
            {SETUP_STEPS.map((step, i) => (
              <View key={step}>
                {i > 0 ? <Separator /> : null}
                <SetupStep
                  step={step}
                  index={i + 1}
                  madeName={progress[step]}
                  next={view.next === step}
                  onPress={() => onStep(step)}
                  onLongPress={openMenu}
                />
              </View>
            ))}
          </Card>
        )}
        {/* Invisible anchor: long press opens the Hide menu here. */}
        <DropdownMenuPrimitive.Trigger
          ref={menu}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          className="absolute right-4 top-3 h-px w-px"
        />
      </Pressable>
      <MenuPortal items={[{ label: t('today.setup.hide'), icon: 'eye-off', onPress: onHide }]} />
    </DropdownMenuPrimitive.Root>
  );
}

type SetupStepProps = {
  step: SetupStepKey;
  index: number;
  /** What was made ("Vitamin C serum"), or null while the step is to do. */
  madeName: string | null;
  next: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

/** One step: a fixed 72 pt row, or the next step opened up with its filled button. */
function SetupStep({ step, index, madeName, next, onPress, onLongPress }: SetupStepProps) {
  const { t } = useTranslation();
  const done = madeName !== null;
  const title = t(`today.setup.${step}.title`);
  const detail = done
    ? t(`today.setup.${step}.done`, { name: madeName })
    : t(`today.setup.${step}.hint`);
  const label = t('today.setup.stepLabel', {
    index,
    title,
    state: done ? t('today.setup.stepDone') : t('today.setup.stepTodo'),
    detail,
  });

  const mark = (
    <View
      className={cn(
        'h-[28px] w-[28px] items-center justify-center rounded-full',
        done ? 'bg-ok-soft' : 'border border-border-strong',
      )}
    >
      {done ? (
        <Icon name="check" size={16} tone="ok" />
      ) : (
        <Text className="text-label text-ink-muted tabular-nums">{index}</Text>
      )}
    </View>
  );
  const text = (
    <View className="flex-1 gap-0.5">
      <Text numberOfLines={1} className="text-body-strong">
        {title}
      </Text>
      <Text numberOfLines={1} className="text-caption text-ink-muted">
        {detail}
      </Text>
    </View>
  );

  if (next) {
    return (
      <View testID={`setup-step-${step}`} className="gap-3 px-4 py-3">
        <View accessible accessibilityLabel={label} className="flex-row items-center gap-3">
          {mark}
          {text}
        </View>
        <Button onPress={onPress} onLongPress={onLongPress}>
          {t(`today.setup.${step}.action`)}
        </Button>
      </View>
    );
  }
  return (
    <Pressable
      testID={`setup-step-${step}`}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-[72px] flex-row items-center gap-3 px-4 active:bg-subtle"
    >
      {mark}
      {text}
      <Icon name="chevron-right" size={20} tone="ink-muted" />
    </Pressable>
  );
}

export type OptionalGroupProps = {
  onPhoto: () => void;
  onAvoid: () => void;
  /** Replaces the weekly photo hint once it is on ("On · Sundays at 10:00"). */
  photoDetail?: string;
};

/** Below the setup card: optional steps that never count toward "n of 3". */
export function OptionalGroup({ onPhoto, onAvoid, photoDetail }: OptionalGroupProps) {
  const { t } = useTranslation();
  return (
    <Card title={t('today.optional.title')} flush>
      <ListRow
        icon="camera"
        label={t('today.optional.photo.title')}
        detail={photoDetail ?? t('today.optional.photo.hint')}
        onPress={onPhoto}
      />
      <Separator />
      <ListRow
        icon="ban"
        label={t('today.optional.avoid.title')}
        detail={t('today.optional.avoid.hint')}
        onPress={onAvoid}
      />
    </Card>
  );
}
