import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import { seedProgress } from '@/storybook/seeds/progress';

import { ProgressCameraScreen } from './ProgressCameraScreen';

/**
 * C4 Progress camera, always dark. These stories use the phone's real camera permission:
 *
 * - Permission given: the live front camera with last week's photo as a guide (a bundled image in
 *   the demo data), the face outline and the angle steps. Taking photos works; "Use photo" on the
 *   last angle logs the push to the review.
 * - Not asked yet: the system prompt appears when the story opens.
 * - Refused: "The camera is off for Jx-Care" with Open phone settings. To see it on a phone that
 *   allowed the camera, turn the camera off for Jx-Care in the phone's settings.
 *
 * The Jest smoke test has no camera: it mocks expo-camera with the permission refused, so there
 * every story renders the refused screen.
 */
const meta = {
  title: 'Screens/Modals/Progress camera',
  component: ProgressCameraScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProgressCameraScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** `?area=skin` with three angles and last week's photo as the guide. */
export const Skin: Story = {
  decorators: [withAppData({ seed: seedProgress, params: { area: 'skin' } })],
};

/** `?area=hair`: front, back and top, with the hair tips. */
export const Hair: Story = {
  decorators: [withAppData({ seed: seedProgress, params: { area: 'hair' } })],
};

/** The first photo ever: one angle (front) and no guide. */
export const FirstPhoto: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { area: 'skin' } })],
};
