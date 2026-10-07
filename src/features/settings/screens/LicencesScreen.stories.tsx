import type { Meta, StoryObj } from '@storybook/react-native';

import { LicencesScreen } from './LicencesScreen';

/** Open-source packages the app ships with (from licences.json). */
const meta = {
  title: 'Screens/Settings/Licences',
  component: LicencesScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LicencesScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
