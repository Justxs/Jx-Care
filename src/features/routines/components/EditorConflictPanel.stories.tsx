import type { Meta, StoryObj } from '@storybook/react-native';

import { EditorConflictPanel, type EditorConflictPanelProps } from './EditorConflictPanel';

const strong = {
  key: 'a',
  stepIndex: 1,
  mild: false,
  text: 'Glycolic Acid 7% Toner (step 2) × Vitamin C 15% Serum in Morning',
};
const mild = {
  key: 'b',
  stepIndex: 2,
  mild: true,
  text: 'Retinol 0.5% in Squalane (step 3) × Glycolic Acid 7% Toner in Exfoliating night, Tue',
};

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<EditorConflictPanelProps, 'onExplainMild'>;

const meta = {
  title: 'Components/Routines/EditorConflictPanel',
  component: EditorConflictPanel,
  args: { ...actions, hits: [strong], alternatives: null },
  argTypes: {
    alternatives: { control: 'text' },
    onExplainMild: { action: 'explain mild' },
  },
} satisfies Meta<typeof EditorConflictPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One conflict: the panel opens; saving is still allowed. */
export const OneConflict: Story = {};

/** A conflict and a mild one (an every-few-days step). */
export const WithMild: Story = { args: { hits: [strong, mild] } };

/** The other A/B option is named and left out of the comparison. */
export const WithAlternatives: Story = {
  args: {
    hits: [strong],
    alternatives: 'Retinol night is the other evening choice, so it is not compared.',
  },
};

/** No conflicts: the panel stays closed (nothing shows). */
export const NoConflicts: Story = { args: { hits: [] } };

/** Lithuanian lines wrap instead of clipping. */
export const LongLithuanian: Story = {
  args: {
    hits: [
      {
        key: 'lt',
        stepIndex: 1,
        mild: true,
        text: 'Glikolio rūgšties tonikas (2 žingsnis) × Vitamino C serumas rutinoje „Rytinė priežiūra“, antr., ketv.',
      },
    ],
    alternatives: 'Vakaro A yra kitas vakaro pasirinkimas, todėl jis nelyginamas.',
  },
};
