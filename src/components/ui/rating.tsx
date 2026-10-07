import * as ToggleGroupPrimitive from '@rn-primitives/toggle-group';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Icon } from './icon';

export type RatingProps = {
  value: number;
  onValueChange?: (value: number) => void;
  max?: number;
  accessibilityLabel?: string;
  /** Tapping the selected value again clears it (`onValueChange(0)`). */
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
};

/** A 1–5 star picker; each target is 44 pt. 0 means not rated. */
export function Rating({
  value,
  onValueChange,
  max = 5,
  accessibilityLabel,
  clearable,
  disabled,
  className,
}: RatingProps) {
  const { t } = useTranslation();
  const values = Array.from({ length: max }, (_, i) => i + 1);
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
      accessibilityLabel={`${accessibilityLabel ?? t('a11y.rating')}: ${t('a11y.stars', { value, max })}`}
      className={cn('flex-row', className)}
    >
      {values.map((n) => {
        const on = n <= value;
        return (
          <ToggleGroupPrimitive.Item
            key={n}
            value={String(n)}
            accessibilityRole="radio"
            accessibilityLabel={t('a11y.starButton', { count: n })}
            accessibilityState={{ checked: n === value, selected: n === value }}
            className="h-[44px] w-[44px] items-center justify-center"
          >
            <Icon name="star" size={28} tone={on ? 'accent' : 'border-strong'} filled={on} />
          </ToggleGroupPrimitive.Item>
        );
      })}
    </ToggleGroupPrimitive.Root>
  );
}
