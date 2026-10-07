import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { addDays } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedEmpty } from '@/storybook/fixtures';

import { ExpiryPreview } from './ProductFields';
import { QuickOpenFields, type QuickOpenFieldsProps } from './QuickFields';

type Values = { openedAt: string | null; paoMonths: string; expiresAt: string | null };

const meta = {
  title: 'Components/Products/QuickOpenFields',
  component: QuickOpenFields,
  // Partial: the callbacks stay unset, so Actions logs them.
  args: { today: FIXTURE_TODAY, errors: {} } as Partial<QuickOpenFieldsProps>,
  argTypes: {
    onOpenChange: { action: 'open changed' },
    onOpenedAt: { action: 'opened at' },
    onPaoMonths: { action: 'months' },
    onExpiresAt: { action: 'expires at' },
  },
  decorators: [withAppData({ seed: seedEmpty })],
  // Live like the short form: switching clears the hidden side, the preview follows.
  render: function QuickOpenStory(args) {
    const [v, setV] = useState<Values>({
      openedAt: args.openedAt ?? null,
      paoMonths: args.paoMonths ?? '',
      expiresAt: args.expiresAt ?? null,
    });
    return (
      <View className="gap-3">
        <QuickOpenFields
          {...args}
          {...v}
          onOpenChange={(open) => {
            setV(
              open
                ? { openedAt: args.today, paoMonths: '', expiresAt: null }
                : { openedAt: null, paoMonths: '', expiresAt: null },
            );
            args.onOpenChange?.(open);
          }}
          onOpenedAt={(openedAt) => {
            setV((s) => ({ ...s, openedAt }));
            args.onOpenedAt?.(openedAt);
          }}
          onPaoMonths={(paoMonths) => {
            setV((s) => ({ ...s, paoMonths }));
            args.onPaoMonths?.(paoMonths);
          }}
          onExpiresAt={(expiresAt) => {
            setV((s) => ({ ...s, expiresAt }));
            args.onExpiresAt?.(expiresAt);
          }}
        />
        <ExpiryPreview {...v} />
      </View>
    );
  },
} satisfies Meta<typeof QuickOpenFields>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Is it open?" Yes: Opened on (today) and Use within, 6 months picked. */
export const Opened: Story = { args: { openedAt: FIXTURE_TODAY, paoMonths: '6' } };

/** Not yet: the printed expiry date instead. */
export const NotOpenYet: Story = {
  args: { openedAt: null, expiresAt: addDays(FIXTURE_TODAY, 400) },
};
