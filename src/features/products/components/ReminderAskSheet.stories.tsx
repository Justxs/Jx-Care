import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';

import { ReminderAskSheet, type ReminderAskSheetProps } from './ReminderAskSheet';

const meta = {
  title: 'Components/Products/ReminderAskSheet',
  component: ReminderAskSheet,
  // Partial: the callbacks stay unset, so Actions logs them.
  args: {
    ask: { id: 1, reason: 'expiry', productName: 'Vitamin C 15% Serum' },
  } as Partial<ReminderAskSheetProps>,
  argTypes: {
    onAllow: { action: 'allow' },
    onNotNow: { action: 'not now' },
    onClose: { action: 'closed' },
  },
  // The warning days and time come from the settings.
  decorators: [withAppData({ seed: seedDemo })],
  // Opens at once; either answer closes it, and "Open sheet" (developer button) brings it back.
  render: function ReminderAskStory(args) {
    const [sheet, setSheet] = useState({ key: 0, open: true });
    const close = () => setSheet((s) => ({ ...s, open: false }));
    return (
      <View>
        <Button
          variant="secondary"
          onPress={() => setSheet((s) => ({ key: s.key + 1, open: true }))}
        >
          Open sheet
        </Button>
        <ReminderAskSheet
          key={sheet.key}
          {...args}
          open={sheet.open}
          onAllow={() => {
            close();
            args.onAllow?.();
          }}
          onNotNow={() => {
            close();
            args.onNotNow?.();
          }}
          onClose={() => {
            close();
            args.onClose?.();
          }}
        />
      </View>
    );
  },
} satisfies Meta<typeof ReminderAskSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** After saving the first product with an expiry date: the product, when, and an example. */
export const Expiry: Story = {};

/** The first routine reminder switched on. */
export const Routine: Story = { args: { ask: { id: 2, reason: 'routine' } } };

/** The first hair care reminder switched on. */
export const Hair: Story = { args: { ask: { id: 3, reason: 'hair' } } };

/** The weekly progress photo reminder switched on. */
export const WeeklyPhoto: Story = { args: { ask: { id: 4, reason: 'weeklyPhoto' } } };

/** A long Lithuanian product name in the line and the example notification. */
export const LongProductName: Story = {
  args: {
    ask: {
      id: 5,
      reason: 'expiry',
      productName: 'Drėkinamasis veido kremas su hialurono rūgštimi ir ceramidais jautriai odai',
    },
  },
};
