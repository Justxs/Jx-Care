import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { FIXTURE_TODAY } from '@/storybook/fixtures';

import { setupView } from '../logic';
import type { SetupProgress } from '../repo';
import { OptionalGroup, SetupCard, type SetupCardProps } from './SetupCard';

const notSaved = { setupDoneAt: null, setupHiddenAt: null };

/** The card's props for what exists so far, as Today works them out. */
const state = (progress: SetupProgress) => ({
  progress,
  view: setupView(progress, notSaved, FIXTURE_TODAY),
});

const nothing: SetupProgress = { product: null, routine: null, hair: null };

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<SetupCardProps, 'onStep' | 'onHide'>;

const meta = {
  title: 'Components/Today/SetupCard',
  component: SetupCard,
  args: { ...actions, ...state(nothing) },
  argTypes: {
    onStep: { action: 'step' },
    onHide: { action: 'hide' },
  },
} satisfies Meta<typeof SetupCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** First run: 0 of 3, "Add a product" opened up. Long press for Hide. */
export const FirstRun: Story = {};

/** A product added: the row names it, the routine step is next. */
export const OneDone: Story = {
  args: state({ ...nothing, product: 'Vitamin C 15% Serum' }),
};

/** Product and routine done, hair next. */
export const TwoDone: Story = {
  args: state({ product: 'Vitamin C 15% Serum', routine: 'Morning', hair: null }),
};

/** All three done: "You're set" with See today. */
export const AllSet: Story = {
  args: state({ product: 'Vitamin C 15% Serum', routine: 'Morning', hair: 'Wash' }),
};

/** Long names are cut to one line, so the rows keep their height. */
export const LongNames: Story = {
  args: state({
    product: 'Antioksidacinis vitamino C 15 % ir ferulo rūgšties serumas',
    routine: 'Švelni rytinė priežiūra jautriai odai',
    hair: null,
  }),
};

/** With the optional steps below it, as on Today. */
export const WithOptionalSteps: Story = {
  render: (args) => (
    <View className="gap-4">
      <SetupCard {...args} />
      <OptionalGroup onPhoto={() => {}} onAvoid={() => {}} />
    </View>
  ),
};
