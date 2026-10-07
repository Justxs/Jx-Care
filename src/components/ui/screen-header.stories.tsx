import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from './screen-header';

const noop = () => {};

const meta = {
  title: 'UI/ScreenHeader',
  component: ScreenHeader,
  // Headers run edge to edge, like on a screen.
  parameters: { layout: 'fullscreen' },
  args: { title: 'Retinol serum', close: false },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    close: { control: 'boolean' },
    onBack: { action: 'back' },
  },
} satisfies Meta<typeof ScreenHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A pushed screen: back arrow, centred title, nothing on the right. */
export const Back: Story = {};

/** A tab root: no back arrow; the title stays centred. */
export const TitleOnly: Story = {
  render: ({ onBack: _onBack, ...args }) => <ScreenHeader {...args} />,
};

/** A subtitle line under the title. */
export const WithSubtitle: Story = { args: { subtitle: 'The Ordinary · Serum' } };

/** A full-screen modal: X instead of the arrow, a word action on the right. */
export const CloseWithTextAction: Story = {
  render: function CloseWithTextAction(args) {
    const { t } = useTranslation();
    return (
      <ScreenHeader
        {...args}
        title={t('routines.title')}
        close
        action={{ text: t('common.done'), onPress: noop }}
      />
    );
  },
};

/** A word action that isn't available yet. */
export const DisabledTextAction: Story = {
  args: { action: { text: 'Compare', onPress: noop, disabled: true } },
};

/** An icon action in a soft accent circle. */
export const PrimaryIconAction: Story = {
  args: { action: { icon: 'plus', label: 'Add product', primary: true, onPress: noop } },
};

/** A plain icon action. */
export const IconAction: Story = {
  args: { action: { icon: 'share-2', label: 'Share', onPress: noop } },
};

/** The overflow menu (⋯); tap it to open. */
export const MenuAction: Story = {
  render: function MenuAction(args) {
    const { t } = useTranslation();
    return (
      <ScreenHeader
        {...args}
        action={{
          menu: [
            { label: t('common.edit'), icon: 'pencil', onPress: noop },
            { label: t('products.duplicate'), icon: 'copy', onPress: noop },
            { label: t('common.delete'), icon: 'trash-2', destructive: true, onPress: noop },
          ],
        }}
      />
    );
  },
};

/** A long Lithuanian title wraps to two lines, then ends with an ellipsis. */
export const LongLithuanian: Story = {
  args: {
    title: 'Drėkinamasis veido kremas jautriai ir sausai odai su hialurono rūgštimi',
    subtitle: 'Pažymėti kaip baigtą ir pirkti dar kartą',
    action: { text: 'Bendrinti', onPress: noop },
  },
};
