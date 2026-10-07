import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState } from './empty-state';
import { icons } from './icon';
import { Text } from './text';

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  args: {
    icon: 'package',
    title: 'No products yet',
    children: 'Add the one you use most. Jx-Care tracks when it expires.',
    actionLabel: 'Add product',
    actionIcon: 'plus',
  },
  argTypes: {
    icon: { control: 'select', options: Object.keys(icons) },
    title: { control: 'text' },
    children: { control: 'text' },
    actionLabel: { control: 'text' },
    actionIcon: { control: 'select', options: [undefined, ...Object.keys(icons)] },
    secondaryLabel: { control: 'text' },
    onAction: { action: 'action' },
    onSecondary: { action: 'secondary' },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Icon, title, one line of help and the primary action. */
export const WithAction: Story = {};

/** A ghost second action under the primary one. */
export const TwoActions: Story = { args: { secondaryLabel: 'Restore a backup' } };

/** No action: only the title and help line (a filtered list with no matches). */
export const TextOnly: Story = {
  args: {
    icon: 'search',
    title: 'No matches',
    children: 'Try another word or reset the filters.',
    actionLabel: undefined,
  },
};

/** Translated empty states from the app; switch EN/LT in the toolbar. */
export const Translated: Story = {
  render: function Translated(args) {
    const { t } = useTranslation();
    return (
      <>
        <EmptyState
          icon="package"
          title={t('products.emptyTitle')}
          actionLabel={t('products.add')}
          actionIcon="plus"
          onAction={args.onAction}
        >
          {t('products.emptyBody')}
        </EmptyState>
        <EmptyState icon="shopping-cart" title={t('shopping.emptyTitle')}>
          {t('shopping.emptyBody')}
        </EmptyState>
      </>
    );
  },
};

/** Children can be any node, not only a line of text. */
export const CustomBody: Story = {
  args: {
    icon: 'calendar',
    title: 'Your month fills in as you go',
    actionLabel: undefined,
    children: (
      <Text className="text-center text-body text-ink-muted">
        Each day you tick a routine gets a <Text className="text-body-strong">dot</Text> here.
      </Text>
    ),
  },
};

/** Lithuanian title and help wrap and stay centred. */
export const LongLithuanian: Story = {
  args: {
    title: 'Dar neturite jokių produktų savo lentynoje',
    children:
      'Pridėkite dažniausiai naudojamą produktą. Jx-Care seks, kada baigiasi jo galiojimas, ir primins laiku.',
    actionLabel: 'Pridėti produktą',
    secondaryLabel: 'Atkurti atsarginę kopiją',
  },
};
