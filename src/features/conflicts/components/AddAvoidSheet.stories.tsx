import type { Meta, StoryObj } from '@storybook/react-native';
import { useMemo } from 'react';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';

import { useAvoidItems } from '../avoidApi';
import { AddAvoidSheet, type AddAvoidSheetProps } from './AddAvoidSheet';
import { sideOptionKey } from './SidePicker';

/** Leaves out what the story database's avoid list already has, as S4 does. */
function StoryAddAvoidSheet(args: AddAvoidSheetProps) {
  const items = useAvoidItems().data;
  const listed = useMemo(() => new Set((items ?? []).map(sideOptionKey)), [items]);
  // Nothing until the list is read, so the sheet opens with the right options.
  return items ? <AddAvoidSheet {...args} listed={listed} /> : <></>;
}

/**
 * S4 Add ingredient: search ingredients and groups, or type a new name; an optional note. Saving
 * adds it to the story database's avoid list.
 */
const meta = {
  title: 'Components/Conflicts/AddAvoidSheet',
  component: AddAvoidSheet,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    listed: new Set<string>(),
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<AddAvoidSheetProps, 'onClose'>),
  },
  argTypes: { onClose: { action: 'closed' } },
  render: StoryAddAvoidSheet,
} satisfies Meta<typeof AddAvoidSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The demo ingredients and groups, without Parfum (already avoided). */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** No ingredients yet: type a name to add a new one. */
export const NoIngredients: Story = { decorators: [withAppData({ seed: seedEmpty })] };
