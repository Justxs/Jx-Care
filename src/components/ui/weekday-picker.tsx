import * as ToggleGroupPrimitive from '@rn-primitives/toggle-group';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Text } from './text';
import { ISO_WEEKDAYS } from './weekday-dots';

export type WeekdayPickerProps = {
  /** ISO weekdays, 1 = Monday. */
  value: readonly number[];
  onValueChange: (days: number[]) => void;
  /** Only these days can be picked (a step limited to its routine's days); the rest are off. */
  allowed?: readonly number[];
  accessibilityLabel?: string;
  className?: string;
};

/** Seven day toggles, Monday first. The "Every day" shortcut belongs to the caller. */
export function WeekdayPicker({
  value,
  onValueChange,
  allowed,
  accessibilityLabel,
  className,
}: WeekdayPickerProps) {
  const { t } = useTranslation();
  return (
    <ToggleGroupPrimitive.Root
      type="multiple"
      value={value.map(String)}
      onValueChange={(next) =>
        onValueChange(
          next
            .map(Number)
            .filter((d) => d >= 1 && d <= 7)
            .sort((a, b) => a - b),
        )
      }
      accessibilityLabel={accessibilityLabel}
      className={cn('flex-row justify-between gap-1', className)}
    >
      {ISO_WEEKDAYS.map((d) => {
        const on = value.includes(d);
        // A picked day outside `allowed` stays tappable so it can be cleared.
        const off = !on && allowed !== undefined && !allowed.includes(d);
        return (
          <ToggleGroupPrimitive.Item
            key={d}
            value={String(d)}
            disabled={off}
            accessibilityRole="checkbox"
            accessibilityLabel={t(`weekdays.long.${d}`)}
            accessibilityState={{ checked: on, disabled: off }}
            className={cn(
              'h-[40px] min-w-[36px] flex-1 items-center justify-center rounded-md border active:opacity-85',
              on
                ? 'border-accent bg-accent-soft'
                : off
                  ? 'border-dashed border-border bg-subtle'
                  : 'border-border-strong bg-surface',
            )}
          >
            <Text
              numberOfLines={1}
              className={cn('text-label', on ? 'text-accent' : off ? 'text-ink-muted' : 'text-ink')}
            >
              {t(`weekdays.letter.${d}`)}
            </Text>
          </ToggleGroupPrimitive.Item>
        );
      })}
    </ToggleGroupPrimitive.Root>
  );
}
