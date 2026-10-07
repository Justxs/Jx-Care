import { View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import type { ConditionArea } from '@/db/enums';
import { cn } from '@/lib/cn';

import { useTagLabel } from '../labels';
import { tagsFor, type ConditionTag } from '../tags';

export type ConditionChipsProps = {
  area: ConditionArea;
  /** The tags picked. */
  value: readonly string[];
  /** One tap on a chip: switch that tag on or off. */
  onToggle: (tag: ConditionTag) => void;
  accessibilityLabel?: string;
  className?: string;
};

/**
 * An area's tag chips, multi-select, always in the standard order: skin Calm, Glow, Oily, Dry,
 * Breakout, Redness, Itchy; hair Shiny, Frizzy, Oily roots, Dry ends, Flaky scalp. They wrap,
 * so long Lithuanian words take a new line instead of clipping.
 */
export function ConditionChips({
  area,
  value,
  onToggle,
  accessibilityLabel,
  className,
}: ConditionChipsProps) {
  const label = useTagLabel();
  return (
    <View
      testID={`condition-chips-${area}`}
      accessibilityLabel={accessibilityLabel}
      className={cn('flex-row flex-wrap gap-2', className)}
    >
      {tagsFor(area).map((tag) => (
        <Chip key={tag} selected={value.includes(tag)} onPressedChange={() => onToggle(tag)}>
          {label(area, tag)}
        </Chip>
      ))}
    </View>
  );
}
