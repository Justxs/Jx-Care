import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { addDays, momentOf } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { demoIds, FIXTURE_TODAY, seedDemo } from '@/storybook/fixtures';

import { ProductNoteSheet, type ProductNoteSheetProps } from './ProductNoteSheet';

const meta = {
  title: 'Components/Products/ProductNoteSheet',
  component: ProductNoteSheet,
  // Partial: onClose stays unset, so Actions logs it.
  args: { productId: demoIds.products.retinol } as Partial<ProductNoteSheetProps>,
  argTypes: { onClose: { action: 'closed' } },
  // Saving writes to the story database.
  decorators: [withAppData({ seed: seedDemo })],
  // Opens at once; "Open sheet" (developer button) brings it back after it closes.
  render: function NoteSheetStory(args) {
    const [sheet, setSheet] = useState({ key: 0, open: true });
    return (
      <View>
        <Button
          variant="secondary"
          onPress={() => setSheet((s) => ({ key: s.key + 1, open: true }))}
        >
          Open sheet
        </Button>
        <ProductNoteSheet
          key={sheet.key}
          {...args}
          open={sheet.open}
          onClose={() => {
            setSheet((s) => ({ ...s, open: false }));
            args.onClose?.();
          }}
        />
      </View>
    );
  },
} satisfies Meta<typeof ProductNoteSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** P8 Add note: today's date, empty text with the 0/280 counter, no tags. */
export const Add: Story = {};

/** Editing the retinol's latest note: its date, text and tags. */
export const Edit: Story = {
  args: {
    editing: {
      id: 2,
      productId: demoIds.products.retinol,
      day: addDays(FIXTURE_TODAY, -2),
      text: 'A little dry around the nose after two nights in a row.',
      tags: ['dry', 'redness'],
      createdAt: momentOf(addDays(FIXTURE_TODAY, -2), '21:00'),
    },
  },
};

/** A long Lithuanian note close to the limit wraps in the field. */
export const LongNote: Story = {
  args: {
    editing: {
      id: 1,
      productId: demoIds.products.retinol,
      day: addDays(FIXTURE_TODAY, -12),
      text: 'Po savaitės oda aplink nosį nebesilupa, bet kvapas per stiprus, todėl kitą kartą rinksiuosi bekvapį. Naudoju kas antrą vakarą, ryte visada tepu apsauginį kremą nuo saulės ir drėkinamąjį kremą.',
      tags: ['calm', 'glow', 'dry', 'itchy'],
      createdAt: momentOf(addDays(FIXTURE_TODAY, -12), '21:00'),
    },
  },
};
