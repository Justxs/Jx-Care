import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';

import { dueLabel, frequencyLabel, hairTaskIcon, lastDoneLabel } from '../display';
import type { HairTaskRow as HairTaskItem } from '../repo';

export type HairTaskRowProps = {
  task: HairTaskItem;
  onPress: () => void;
};

/**
 * One hair task in the Routines Hair segment (R1): name, frequency and last done as a date, and
 * the next due date on the right ("Overdue 1 day" in `warning`). Tap opens the editor.
 */
export function HairTaskRow({ task, onPress }: HairTaskRowProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const icon = hairTaskIcon(task.kind, task.otherKind);
  const frequency = frequencyLabel(task, f, t);
  const last = lastDoneLabel(task.lastDoneAt, f, t);
  const due = dueLabel(task, f, t);

  return (
    <Pressable
      testID={`hair-task-${task.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[task.name, frequency, due.text, last].join(', ')}
      className="min-h-[64px] flex-row items-center gap-3 px-4 py-3 active:bg-accent-soft"
    >
      {/* Same width with or without an icon, so names line up in the card. */}
      <View className="w-[20px] items-center">
        {icon ? <Icon name={icon} size={20} tone="ink-muted" /> : null}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-body-strong">{task.name}</Text>
        <Text className="text-caption text-ink-muted">{`${frequency} · ${last}`}</Text>
      </View>
      <Text
        className={cn(
          'max-w-[40%] text-right text-label tabular-nums',
          due.warning ? 'text-warning' : 'text-ink',
        )}
      >
        {due.text}
      </Text>
      <Icon name="chevron-right" size={20} tone="ink-muted" />
    </Pressable>
  );
}

/** A row's final size while the list loads. */
export function HairTaskRowSkeleton() {
  return (
    <View className="min-h-[64px] flex-row items-center gap-3 px-4 py-3">
      <Skeleton width={20} height={20} radius={10} />
      <View className="flex-1 gap-1.5">
        <Skeleton width="50%" height={16} />
        <Skeleton width="70%" height={12} />
      </View>
      <Skeleton width={64} height={14} />
    </View>
  );
}
