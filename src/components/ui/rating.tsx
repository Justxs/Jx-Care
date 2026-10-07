import * as ToggleGroupPrimitive from '@rn-primitives/toggle-group';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Icon } from './icon';
import { Text } from './text';

export type RatingProps = {
  value: number;
  onValueChange?: (value: number) => void;
  max?: number;
  /** Stars for products, numbered pills for daily condition. */
  kind?: 'stars' | 'scale';
  accessibilityLabel?: string;
  /** Tapping the selected value again clears it (`onValueChange(0)`). */
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
};

/** A 1–5 picker; each target is 44 pt. 0 means not rated. */
export function Rating({
  value,
  onValueChange,
  max = 5,
  kind = 'stars',
  accessibilityLabel,
  clearable,
  disabled,
  className,
}: RatingProps) {
  const { t } = useTranslation();
  const values = Array.from({ length: max }, (_, i) => i + 1);
  const spoken =
    kind === 'stars' ? t('a11y.stars', { value, max }) : t('a11y.scale', { value, max });
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value > 0 ? String(value) : undefined}
      onValueChange={(v) => {
        if (v) onValueChange?.(Number(v));
        else if (clearable) onValueChange?.(0);
      }}
      disabled={disabled || !onValueChange}
      accessibilityRole="radiogroup"
      accessibilityLabel={`${accessibilityLabel ?? t('a11y.rating')}: ${spoken}`}
      className={cn('flex-row', kind === 'scale' && 'gap-2', className)}
    >
      {values.map((n) => {
        const on = kind === 'stars' ? n <= value : n === value;
        return (
          <ToggleGroupPrimitive.Item
            key={n}
            value={String(n)}
            accessibilityRole="radio"
            accessibilityLabel={
              kind === 'stars'
                ? t('a11y.starButton', { count: n })
                : t('a11y.scale', { value: n, max })
            }
            accessibilityState={{ checked: n === value, selected: n === value }}
            className={cn(
              'h-[44px] items-center justify-center',
              kind === 'stars'
                ? 'w-[44px]'
                : cn(
                    'min-w-[44px] flex-1 rounded-full border',
                    on ? 'border-accent bg-accent-soft' : 'border-border-strong bg-surface',
                  ),
            )}
          >
            {kind === 'stars' ? (
              <Icon name="star" size={28} tone={on ? 'accent' : 'border-strong'} filled={on} />
            ) : (
              <Text
                className={cn('text-body-strong tabular-nums', on ? 'text-accent' : 'text-ink')}
              >
                {n}
              </Text>
            )}
          </ToggleGroupPrimitive.Item>
        );
      })}
    </ToggleGroupPrimitive.Root>
  );
}
