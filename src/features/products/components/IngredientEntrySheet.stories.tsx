import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';

import { useAvoidContext, useKnownIngredients } from '../api';
import { IngredientEntrySheet, type IngredientEntrySheetProps } from './IngredientEntrySheet';

const meta = {
  title: 'Components/Products/IngredientEntrySheet',
  component: IngredientEntrySheet,
  // Partial: the callbacks stay unset, so Actions logs them. `known` and `avoid` come from the
  // story database, as on the product form.
  args: { value: '' } as Partial<IngredientEntrySheetProps>,
  argTypes: {
    value: { control: 'text' },
    onClose: { action: 'closed' },
    onSave: { action: 'saved' },
  },
  // Opens at once; "Open sheet" (developer button) brings it back after it closes.
  render: function IngredientSheetStory(args) {
    const known = useKnownIngredients().data ?? [];
    const avoid = useAvoidContext().data ?? { items: [], groupOf: new Map() };
    const [sheet, setSheet] = useState({ key: 0, open: true });
    return (
      <View>
        <Button
          variant="secondary"
          onPress={() => setSheet((s) => ({ key: s.key + 1, open: true }))}
        >
          Open sheet
        </Button>
        <IngredientEntrySheet
          key={sheet.key}
          {...args}
          known={known}
          avoid={avoid}
          open={sheet.open}
          onClose={() => {
            setSheet((s) => ({ ...s, open: false }));
            args.onClose?.();
          }}
        />
      </View>
    );
  },
} satisfies Meta<typeof IngredientEntrySheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** P4 with nothing typed yet: the hint line and no chips. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/**
 * A list with a known ingredient in a conflict rule (Retinol), an avoided one (Parfum) and a new
 * one (Bakuchiol). Type a line to see suggestions; paste "a, b, c" to see the split and Undo.
 */
export const Filled: Story = {
  args: { value: 'Squalane\nRetinol\nTocopherol\nParfum\nBakuchiol' },
  decorators: [withAppData({ seed: seedDemo })],
};

/** Long Lithuanian names wrap in the field and in the chips. */
export const LongNames: Story = {
  args: {
    value:
      'Natrio hialuronatas\nButyrospermum parkii (taukmedžio) sviestas\nAskorbo rūgšties gliukozidas\nParfum',
  },
  decorators: [withAppData({ seed: seedDemo })],
};

/**
 * The last line is an everyday name: the built-in catalogue suggests the INCI name with the alias
 * that matched ("Ascorbic acid (Vitamin C)"), even on an empty install.
 */
export const CatalogueSuggestions: Story = {
  args: { value: 'Aqua\nVitamin C' },
  decorators: [withAppData({ seed: seedEmpty })],
};
