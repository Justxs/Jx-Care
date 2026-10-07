import type { ReactNode } from 'react';
import { Pressable, View, type AccessibilityActionEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { ConflictTag } from '@/components/ui/conflict-tag';
import { ProductThumb } from '@/components/ui/product-thumb';
import { Text } from '@/components/ui/text';
import type { ProductCategory } from '@/db/enums';

/** What one step row shows, worked out by the editor. */
export type StepRowData = {
  /** Stable while dragging: the step id (negative for steps not saved yet). */
  key: string;
  product: {
    name: string;
    photoUri: string | null;
    category: ProductCategory;
    problem: 'finished' | 'expired' | null;
  } | null;
  note: string | null;
  /** "Tue, Fri" or "Every 3 days"; null for every time. */
  schedule: string | null;
  /** "1 min"; null without a wait. */
  wait: string | null;
  conflict: { mild: boolean } | null;
  /** A problem with the step (an error message), e.g. days the routine no longer runs on. */
  error: string | null;
};

export type StepRowProps = {
  step: StepRowData;
  index: number;
  count: number;
  onPress: () => void;
  onDelete: () => void;
  onMove: (to: number) => void;
  /** The drag handle, wrapped in the list's gesture detector. */
  handle: ReactNode;
};

/** A step in the routine editor (R2): number, product, chips, conflict tag and drag handle. */
export function StepRow({ step, index, count, onPress, onDelete, onMove, handle }: StepRowProps) {
  const { t } = useTranslation();
  const p = step.product;
  const gap = !p && !step.note;
  const title = p ? p.name : (step.note ?? t('routines.editor.pickLater'));
  const subtitle = p ? step.note : null;
  const problem = p?.problem ?? null;

  const spoken = [
    t('routines.editor.stepLabel', { index: index + 1 }),
    title,
    subtitle,
    problem === 'finished' ? t('common.finished') : null,
    problem === 'expired' ? t('common.status.expired') : null,
    step.schedule,
    step.wait ? t('routines.editor.waitSpoken', { time: step.wait }) : null,
    step.conflict ? t(step.conflict.mild ? 'common.mildConflict' : 'common.conflict') : null,
    step.error,
  ]
    .filter(Boolean)
    .join(', ');

  const actions = [
    ...(index > 0 ? [{ name: 'moveUp', label: t('routines.editor.moveUp') }] : []),
    ...(index < count - 1 ? [{ name: 'moveDown', label: t('routines.editor.moveDown') }] : []),
    { name: 'delete', label: t('routines.editor.deleteStep') },
  ];
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    switch (e.nativeEvent.actionName) {
      case 'activate':
        return onPress();
      case 'moveUp':
        return onMove(index - 1);
      case 'moveDown':
        return onMove(index + 1);
      case 'delete':
        return onDelete();
    }
  };

  return (
    <View className="min-h-[72px] flex-row items-center rounded-xl bg-surface shadow-card dark:border dark:border-border dark:shadow-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityActions={actions}
        onAccessibilityAction={onAccessibilityAction}
        testID={`step-row-${index}`}
        className="flex-1 flex-row items-center gap-3 rounded-xl py-3 pl-3 active:bg-subtle"
      >
        <View className="h-[28px] w-[28px] items-center justify-center rounded-full bg-subtle">
          <Text className="text-label tabular-nums text-ink-muted">{index + 1}</Text>
        </View>
        {p ? <ProductThumb src={p.photoUri} category={p.category} /> : null}
        <View className="flex-1 gap-1">
          <Text className={gap ? 'text-body-strong text-warning' : 'text-body-strong'}>
            {title}
          </Text>
          {subtitle ? <Text className="text-caption text-ink-muted">{subtitle}</Text> : null}
          {problem || step.schedule || step.wait || step.conflict ? (
            <View className="flex-row flex-wrap items-center gap-1.5">
              {problem === 'expired' ? <Badge status="expired" /> : null}
              {problem === 'finished' ? (
                <Badge status="nodate">{t('common.finished')}</Badge>
              ) : null}
              {step.schedule ? <MetaChip>{step.schedule}</MetaChip> : null}
              {step.wait ? <MetaChip>{step.wait}</MetaChip> : null}
              {step.conflict ? <ConflictTag mild={step.conflict.mild} /> : null}
            </View>
          ) : null}
          {step.error ? <Text className="text-caption text-danger">{step.error}</Text> : null}
        </View>
      </Pressable>
      {handle}
    </View>
  );
}

function MetaChip({ children }: { children: string }) {
  return (
    <View className="min-h-[24px] justify-center rounded-full bg-subtle px-2 py-0.5">
      <Text className="text-label tabular-nums text-ink-muted">{children}</Text>
    </View>
  );
}
