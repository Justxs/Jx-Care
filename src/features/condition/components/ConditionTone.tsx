import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';
import { skinTags, type ConditionArea, type SkinTag } from '@/db/enums';
import { cn } from '@/lib/cn';

import { useTagLabel } from '../labels';

/**
 * Each skin state's colours: `fill` for the calendar bar and legend swatch (a graphic, 3:1 is
 * enough), `soft` + `text` for a pill with the word. Every text pair is one DESIGN.md already
 * uses for text (4.5:1 in both themes): ok on ok-soft, skin on skin-soft, warning on
 * warning-soft, hair on hair-soft, danger on danger-soft, accent on accent-soft, neutral on
 * neutral-soft.
 */
const skinTones: Record<SkinTag, { fill: string; soft: string; text: string }> = {
  calm: { fill: 'bg-ok', soft: 'bg-ok-soft', text: 'text-ok' },
  glow: { fill: 'bg-skin', soft: 'bg-skin-soft', text: 'text-skin' },
  oily: { fill: 'bg-warning', soft: 'bg-warning-soft', text: 'text-warning' },
  dry: { fill: 'bg-hair', soft: 'bg-hair-soft', text: 'text-hair' },
  breakout: { fill: 'bg-danger', soft: 'bg-danger-soft', text: 'text-danger' },
  redness: { fill: 'bg-accent', soft: 'bg-accent-soft', text: 'text-accent' },
  itchy: { fill: 'bg-neutral', soft: 'bg-neutral-soft', text: 'text-neutral' },
};

function Swatch({ state, testID }: { state: SkinTag; testID?: string }) {
  return (
    <View testID={testID} className={cn('h-[8px] w-[18px] rounded-full', skinTones[state].fill)} />
  );
}

export type ConditionMarkProps = {
  /** The day's skin states in severity order; the first is drawn. */
  states: readonly SkinTag[] | undefined;
  testID?: string;
};

/**
 * The C1 Condition view's day mark: a short bar in the main skin state's colour, and "+1" when
 * more states were logged. The row is always 18 pt tall, so every cell lines up. Screen readers
 * get the states from the cell's label instead.
 */
export function ConditionMark({ states, testID }: ConditionMarkProps) {
  const main = states?.[0];
  const more = (states?.length ?? 0) - 1;
  return (
    <View
      testID={testID && main ? `${testID}-${main}` : testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-[18px] flex-row items-center gap-0.5"
    >
      {main ? <Swatch state={main} /> : null}
      {main && more > 0 ? (
        <Text className="text-label tabular-nums text-ink-muted">{`+${more}`}</Text>
      ) : null}
    </View>
  );
}

/** Under the Condition view's grid: every skin state as colour and word, never colour alone. */
export function ConditionLegend() {
  const { t } = useTranslation();
  const label = useTagLabel();
  return (
    <View
      testID="condition-legend"
      accessible
      accessibilityLabel={t('condition.legend', {
        states: skinTags.map((s) => label('skin', s)).join(', '),
      })}
      className="flex-row flex-wrap gap-x-4 gap-y-2 px-1"
    >
      {skinTags.map((state) => (
        <View key={state} className="min-h-[18px] flex-row items-center gap-1.5">
          <Swatch state={state} testID={`legend-${state}`} />
          <Text className="text-caption text-ink">{label('skin', state)}</Text>
        </View>
      ))}
    </View>
  );
}

/** A logged tag as a word in a pill (C2): skin states in their colour, hair tags neutral. */
export function ConditionPill({ area, tag }: { area: ConditionArea; tag: string }) {
  const label = useTagLabel();
  const tone = area === 'skin' ? skinTones[tag as SkinTag] : undefined;
  return (
    <View
      className={cn(
        'min-h-[28px] justify-center rounded-full px-3 py-1',
        tone ? tone.soft : 'bg-subtle',
      )}
    >
      <Text className={cn('text-label', tone ? tone.text : 'text-ink')}>{label(area, tag)}</Text>
    </View>
  );
}
