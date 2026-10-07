import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { withAppData } from '@/storybook/appData';

import { ModalSheet } from './ModalSheet';

const meta = {
  title: 'Components/Shared/ModalSheet',
  component: ModalSheet,
  // A route sheet fills the screen: backdrop above, the sheet at the bottom.
  parameters: { layout: 'fullscreen' },
  args: { title: 'Hair wash done', dirty: false, children: null },
  argTypes: {
    title: { control: 'text' },
    dirty: { control: 'boolean' },
    children: { control: false },
    footer: { control: false },
  },
  render: function Render(args) {
    const { t } = useTranslation();
    return (
      <ModalSheet {...args} footer={<Button>{t('hair.done.markDone')}</Button>}>
        <Text className="text-body text-ink-muted">
          Cancel or the backdrop goes back (logged in Actions as router.back).
        </Text>
      </ModalSheet>
    );
  },
} satisfies Meta<typeof ModalSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Grabber, Cancel, centred title, body and a pinned footer. */
export const Default: Story = {};

/** Unsaved edits: Cancel asks "Discard changes?" first. */
export const Dirty: Story = { args: { dirty: true } };

/** No footer: only the body. */
export const NoFooter: Story = {
  render: (args) => (
    <ModalSheet {...args}>
      <Text className="text-body">A sheet with nothing to save.</Text>
    </ModalSheet>
  ),
};

/** A form inside, as the Hair task done sheet uses it; typing makes it dirty. */
export const WithForm: Story = {
  // The date is formatted with the settings (read from a story database).
  decorators: [withAppData()],
  render: function WithForm(args) {
    const { t } = useTranslation();
    const [day, setDay] = useState('2026-10-07');
    const [note, setNote] = useState('');
    return (
      <ModalSheet
        {...args}
        dirty={note.length > 0 || day !== '2026-10-07'}
        footer={<Button>{t('hair.done.markDone')}</Button>}
      >
        <DateField label={t('hair.done.date')} value={day} onChange={setDay} max="2026-10-07" />
        <Input
          label={t('hair.done.note')}
          hint={t('hair.done.noteHint')}
          value={note}
          onChangeText={setNote}
          multiline
        />
      </ModalSheet>
    );
  },
};

/** A long Lithuanian title wraps to two lines and stays centred. */
export const LongLithuanianTitle: Story = {
  args: { title: 'Plaukų kaukė atlikta: pažymėkite datą ir naudotus produktus' },
};
