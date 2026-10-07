import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from './button';
import { Input } from './input';
import { Sheet, SheetFrame, type SheetProps } from './sheet';
import { Text } from './text';

/** Opens with the story; "Open sheet" brings it back after it closes. */
function SheetDemo({ open: initiallyOpen, onClose, ...props }: SheetProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View className="gap-3">
      <Button variant="secondary" onPress={() => setOpen(true)}>
        {t('dev.openSheet')}
      </Button>
      <Sheet
        {...props}
        open={open}
        onClose={() => {
          setOpen(false);
          onClose?.();
        }}
      />
    </View>
  );
}

const meta = {
  title: 'UI/Sheet',
  component: Sheet,
  args: {
    open: true,
    title: 'Streak',
    dirty: false,
    children: (
      <Text>
        A day counts when every step of the day's routines is ticked. Skipped days break the streak;
        days with nothing planned don't.
      </Text>
    ),
  },
  argTypes: {
    title: { control: 'text' },
    cancelLabel: { control: 'text' },
    dirty: { control: 'boolean' },
    onClose: { action: 'closed' },
  },
  render: (args) => <SheetDemo {...args} />,
} satisfies Meta<typeof Sheet>;

export default meta;

// Typed from Meta, not `typeof meta`: the required callbacks come from the action argTypes,
// so stories needn't pass them.
type Story = StoryObj<Meta<typeof Sheet>>;

/** Grabber, Cancel, centred title and a body that sizes the sheet. */
export const Open: Story = {};

/** A primary button pinned under the scrolling body. */
export const WithFooter: Story = {
  render: function WithFooter(args) {
    const { t } = useTranslation();
    return <SheetDemo {...args} footer={<Button onPress={() => {}}>{t('common.save')}</Button>} />;
  },
};

/** Unsaved edits: Cancel or a backdrop tap asks "Discard changes?", dragging down is off. */
export const Dirty: Story = {
  render: function Dirty(args) {
    const { t } = useTranslation();
    const [notes, setNotes] = useState('Patch-tested on the jaw first');
    return (
      <SheetDemo
        {...args}
        title={t('common.edit')}
        dirty={notes.length > 0}
        footer={<Button onPress={() => {}}>{t('common.save')}</Button>}
      >
        <Input label="Notes" value={notes} onChangeText={setNotes} multiline />
      </SheetDemo>
    );
  },
};

/** A long Lithuanian title wraps to two lines between Cancel and the mirrored space. */
export const LongLithuanian: Story = {
  args: {
    title: 'Pažymėti kaip baigtą ir pridėti į pirkinių sąrašą',
    cancelLabel: 'Atšaukti',
    children: (
      <Text>
        Produktas bus perkeltas į archyvą. Jį vėl rasite pirkinių sąraše, jei pasirinksite pirkti
        dar kartą.
      </Text>
    ),
  },
};

/** The frame alone, as a full-screen modal route draws it (no bottom sheet). */
export const FrameOnly: Story = {
  parameters: { layout: 'fullscreen' },
  render: function FrameOnly(args) {
    const { t } = useTranslation();
    return (
      <SheetFrame
        title={args.title}
        onCancel={() => args.onClose?.()}
        footer={<Button onPress={() => {}}>{t('common.save')}</Button>}
      >
        {args.children}
      </SheetFrame>
    );
  },
};
