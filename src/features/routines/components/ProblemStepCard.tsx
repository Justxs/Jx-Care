import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConflictTag } from '@/components/ui/conflict-tag';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';

import type { StepProblem } from '../playerLogic';
import type { RoutineStepItem } from '../repo';
import { HeldCaption, StepCheckbox, rowToggle, stepLabel, type StepConflict } from './PlayerStep';

export type ProblemStepCardProps = {
  step: RoutineStepItem;
  /** 1-based place among the steps due today ("Step 4"). */
  index: number;
  problem: StepProblem;
  done: boolean;
  held: boolean;
  conflict?: StepConflict | null;
  onToggle: (done: boolean) => void;
  /** Pick another (or Pick a product for a step without one): opens the product picker. */
  onPick: () => void;
  /** Buy again (task 034); the button is hidden while this is missing. */
  onBuyAgain?: (() => void) | null;
};

/**
 * A step whose product is expired or finished, or that has no product yet (refinement 11):
 * "Step 4 · SPF 50 fluid" with a red Expired or neutral Finished badge, what to do, and Pick
 * another / Buy again. It keeps its checkbox, so the product can still be used today.
 */
export function ProblemStepCard({
  step,
  index,
  problem,
  done,
  held,
  conflict,
  onToggle,
  onPick,
  onBuyAgain,
}: ProblemStepCardProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const p = step.product;
  const name = p?.name ?? t('player.noProduct');
  const title = t('player.problemTitle', { index, name });
  const badgeText =
    problem === 'expired'
      ? p?.effectiveExpiry
        ? t('products.expiredOn', { date: f.date(p.effectiveExpiry) })
        : t('common.status.expired')
      : problem === 'finished'
        ? t('common.finished')
        : null;
  const spokenTitle = badgeText ? `${title}, ${badgeText}` : title;
  const toggle = rowToggle(done, onToggle);

  return (
    <Card className="gap-3">
      <Pressable
        onPress={toggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={stepLabel(spokenTitle, step, held, t('player.nextAfterWait'))}
        testID={`player-step-${step.id}`}
        className="-m-2 min-h-[44px] flex-row items-start gap-3 rounded-md p-2 active:bg-subtle"
      >
        <View className="flex-1 gap-1">
          <Text className={cn('text-body-strong', (done || held) && 'text-ink-muted')}>
            {title}
          </Text>
          {badgeText ? (
            <Badge status={problem === 'expired' ? 'expired' : 'nodate'}>{badgeText}</Badge>
          ) : null}
          {step.note ? <Text className="text-caption text-ink-muted">{step.note}</Text> : null}
          {held ? <HeldCaption /> : null}
          {conflict ? <ConflictTag mild={conflict.mild} onPress={conflict.onPress} /> : null}
        </View>
        <StepCheckbox done={done} onToggle={onToggle} />
      </Pressable>
      <Text className="text-body">
        {problem === 'empty' ? t('player.emptyLine') : t('player.problemLine')}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Button variant="secondary" size="sm" className="min-h-[44px] flex-1" onPress={onPick}>
          {problem === 'empty' ? t('player.pickProduct') : t('player.pickAnother')}
        </Button>
        {problem !== 'empty' && onBuyAgain ? (
          <Button
            variant="secondary"
            size="sm"
            className="min-h-[44px] flex-1"
            onPress={onBuyAgain}
          >
            {t('common.buyAgain')}
          </Button>
        ) : null}
      </View>
    </Card>
  );
}
