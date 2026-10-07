import type { TFunction } from 'i18next';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import { dueLabel, hairTaskIcon } from '../display';
import type { HairTaskRow } from '../repo';

export type HairDueRowsProps = {
  rows: readonly HairTaskRow[];
  onOpen: (taskId: number) => void;
};

/** "Wash: shampoo + conditioner", or the name alone when the task has no products. */
export function hairDueTitle(
  row: Pick<HairTaskRow, 'name' | 'productNames'>,
  t: TFunction,
): string {
  return row.productNames.length > 0
    ? t('hair.today.rowWith', { name: row.name, products: row.productNames.join(' + ') })
    : row.name;
}

/**
 * T1 Hair due: tasks due today or overdue ("Overdue 1 day" in `warning`). Tapping a row opens
 * the Hair task done sheet; a row that was marked done collapses while the others glide (200 ms).
 */
export function HairDueRows({ rows, onOpen }: HairDueRowsProps) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <Card title={t('hair.today.title')} flush>
      {rows.map((row, i) => {
        const icon = hairTaskIcon(row.kind, row.otherKind);
        const title = hairDueTitle(row, t);
        const due = dueLabel(row, f, t);
        return (
          <Animated.View
            key={row.id}
            entering={rowEntering}
            exiting={rowExiting}
            layout={rowLayout}
          >
            {i > 0 ? <Separator inset /> : null}
            <Pressable
              testID={`hair-due-${row.id}`}
              onPress={() => onOpen(row.id)}
              accessibilityRole="button"
              accessibilityLabel={t('hair.today.openLabel', { title, status: due.text })}
              className="min-h-[64px] flex-row items-center gap-3 px-4 py-3 active:bg-accent-soft"
            >
              <View className="w-[20px] items-center">
                {icon ? <Icon name={icon} size={20} tone="ink-muted" /> : null}
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-body-strong">{title}</Text>
                <Text
                  className={cn(
                    'text-caption tabular-nums',
                    due.warning ? 'text-warning' : 'text-ink-muted',
                  )}
                >
                  {due.text}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} tone="ink-muted" />
            </Pressable>
          </Animated.View>
        );
      })}
    </Card>
  );
}
