import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '@/components/ui/checkbox';
import { ConflictTag } from '@/components/ui/conflict-tag';
import { Icon } from '@/components/ui/icon';
import { ProductThumb } from '@/components/ui/product-thumb';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

import type { RoutineStepItem } from '../repo';

/** The conflict a step carries (task 030): a tappable ConflictTag. */
export type StepConflict = { mild: boolean; onPress: () => void };

export type PlayerStepProps = {
  step: RoutineStepItem;
  done: boolean;
  /** A wait runs before this step: its text turns muted and its caption says so. */
  held: boolean;
  conflict?: StepConflict | null;
  onToggle: (done: boolean) => void;
};

/** Spoken label of a step row: name, brand, note and the wait caption. */
export function stepLabel(
  name: string,
  step: Pick<RoutineStepItem, 'note' | 'product'>,
  held: boolean,
  waitCaption: string,
): string {
  return [name, step.product?.brand, step.note, held ? waitCaption : null]
    .filter(Boolean)
    .join(', ');
}

/** Ticks or unticks on a press anywhere in the row; a light haptic when ticking. */
export function rowToggle(done: boolean, onToggle: (done: boolean) => void) {
  return () => {
    if (!done) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(!done);
  };
}

/**
 * The checkbox at the end of a step: a visual for the row's own press (wet hands hit the whole
 * row), hidden from screen readers because the row is the checkbox.
 */
export function StepCheckbox({
  done,
  onToggle,
}: {
  done: boolean;
  onToggle: (done: boolean) => void;
}) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Checkbox checked={done} onCheckedChange={onToggle} />
    </View>
  );
}

/** "Next, after the wait" under a step a running wait holds back. */
export function HeldCaption() {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-1">
      <Icon name="timer" size={16} tone="ink-muted" />
      <Text className="text-caption text-ink-muted">{t('player.nextAfterWait')}</Text>
    </View>
  );
}

/**
 * One step due today (T2): thumb, name, brand and note, an optional ConflictTag and a square
 * checkbox. Done and held steps keep their row and turn the name `ink-muted`; text is never
 * faded with opacity.
 */
export function PlayerStep({ step, done, held, conflict, onToggle }: PlayerStepProps) {
  const { t } = useTranslation();
  const toggle = rowToggle(done, onToggle);
  const p = step.product;
  const name = p?.name ?? t('player.noProduct');
  const muted = done || held;
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={stepLabel(name, step, held, t('player.nextAfterWait'))}
      testID={`player-step-${step.id}`}
      className="min-h-[72px] flex-row items-center gap-3 px-4 py-3 active:bg-subtle"
    >
      <ProductThumb src={p?.photoUri} category={p?.category ?? 'other'} />
      <View className="flex-1 gap-0.5">
        <Text className={cn('text-body-strong', muted && 'text-ink-muted')}>{name}</Text>
        {p?.brand ? <Text className="text-caption text-ink-muted">{p.brand}</Text> : null}
        {step.note ? (
          <Text className={cn('text-caption', muted ? 'text-ink-muted' : 'text-ink')}>
            {step.note}
          </Text>
        ) : null}
        {held ? <HeldCaption /> : null}
        {conflict ? (
          <View className="pt-1">
            <ConflictTag mild={conflict.mild} onPress={conflict.onPress} />
          </View>
        ) : null}
      </View>
      <StepCheckbox done={done} onToggle={onToggle} />
    </Pressable>
  );
}
