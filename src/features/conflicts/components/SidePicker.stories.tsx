import type { Meta, StoryObj } from '@storybook/react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SidePicker, type SideOption, type SidePickerProps } from './SidePicker';

// Ingredient and group names are data (INCI names stay the same in both languages).
const retinoids: SideOption = { kind: 'group', id: 1, name: 'Retinoids' };
const retinol: SideOption = { kind: 'ingredient', id: 10, name: 'Retinol' };
const glycolic: SideOption = { kind: 'ingredient', id: 11, name: 'Glycolic acid' };

/** Groups first, then ingredients, with their detail lines in the app's language. */
function useOptions(): SideOption[] {
  const { t } = useTranslation();
  return useMemo(() => {
    const members = (count: number) => t('ingredients.members', { count });
    const inGroup = (group: string) => t('ingredients.groupSheet.inGroup', { group });
    return [
      { ...retinoids, detail: members(6) },
      { kind: 'group', id: 2, name: 'AHA/BHA', detail: members(5) },
      { kind: 'group', id: 3, name: 'Vitamin C', detail: members(6) },
      { ...retinol, detail: inGroup('Retinoids') },
      { ...glycolic, detail: inGroup('AHA/BHA') },
      { kind: 'ingredient', id: 12, name: 'Ascorbic acid', detail: inGroup('Vitamin C') },
      { kind: 'ingredient', id: 13, name: 'Niacinamide', detail: null },
      { kind: 'ingredient', id: 14, name: 'Benzoyl peroxide', detail: null },
    ];
  }, [t]);
}

/** Keeps the picked side and the open state, as the rule editor does. */
function Picker(args: SidePickerProps) {
  const { t } = useTranslation();
  const options = useOptions();
  const [value, setValue] = useState(args.value);
  const [open, setOpen] = useState(args.open);
  return (
    <SidePicker
      {...args}
      label={t('conflicts.sheet.left')}
      options={options}
      value={value}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        args.onOpenChange(o);
      }}
      onChange={(o) => {
        setValue(o);
        args.onChange(o);
      }}
    />
  );
}

/** One side of a conflict rule (S3 editor): searches groups and ingredients together. */
const meta = {
  title: 'Components/Conflicts/SidePicker',
  component: SidePicker,
  args: {
    label: '',
    value: null,
    options: [],
    open: false,
    disabled: false,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<SidePickerProps, 'onOpenChange' | 'onChange'>),
  },
  argTypes: {
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    error: { control: 'text' },
    onOpenChange: { action: 'open changed' },
    onChange: { action: 'picked' },
  },
  render: Picker,
} satisfies Meta<typeof SidePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nothing picked: the placeholder. */
export const Empty: Story = {};

/** A group picked: its name with the group icon. */
export const PickedGroup: Story = { args: { value: retinoids } };

/** Open: the search field and the results, groups first with a tag. */
export const Open: Story = { args: { open: true } };

/** Both sides the same: the editor's error under the field. */
export const SameSides: Story = {
  args: { value: retinol },
  render: function SameSides(args: SidePickerProps) {
    const { t } = useTranslation();
    return <Picker {...args} error={t('conflicts.sheet.sameSides')} />;
  },
};

/** After saving: read-only. */
export const Disabled: Story = { args: { value: glycolic, disabled: true } };
