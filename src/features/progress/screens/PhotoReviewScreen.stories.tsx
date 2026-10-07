import type { Decorator, Meta, StoryObj } from '@storybook/react-native';
import { useEffect, type ReactNode } from 'react';

import type { PhotoAngle } from '@/db/enums';
import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import { progressWeeks, seedProgress, storyPhotoUri } from '@/storybook/seeds/progress';

import { captureStore, type CaptureState } from '../captureSession';
import { PhotoReviewScreen } from './PhotoReviewScreen';

const noSession: CaptureState = {
  area: null,
  weekStart: null,
  angles: [],
  photos: {},
  retake: null,
  draft: null,
};

const skinAngles: PhotoAngle[] = ['front', 'left', 'right'];

/** A finished camera session for this week: one photo per angle (bundled images stand in). */
const takenThisWeek: CaptureState = {
  ...noSession,
  area: 'skin',
  weekStart: progressWeeks.thisWeek,
  angles: skinAngles,
  photos: Object.fromEntries(skinAngles.map((a) => [a, storyPhotoUri(a)])),
};

function CaptureSession({ session, children }: { session: CaptureState; children: ReactNode }) {
  // The screen reads the store, so it shows the session as soon as it is set.
  useEffect(() => {
    captureStore.setState(() => session);
    // Leaves no session behind; nothing to delete, the photos are bundled images.
    return () => captureStore.setState(() => noSession);
  }, [session]);
  return children;
}

/** The camera's session the review reads (C4 fills it in the app). */
const withSession =
  (session: CaptureState): Decorator =>
  (Story) => (
    <CaptureSession session={session}>
      <Story />
    </CaptureSession>
  );

const meta = {
  title: 'Screens/Modals/Photo review',
  component: PhotoReviewScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PhotoReviewScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * C5 after taking this week's three skin angles: the photos (tap one to retake), rating, tags and
 * a note. Save runs the real save: on the phone it copies the stand-in images into the app's
 * progress photo folder, as it would camera files, and the rows go to the story database.
 */
export const NewWeek: Story = {
  decorators: [withSession(takenThisWeek), withAppData({ seed: seedDemo })],
};

/** A retake of last week: the saved rating (4), Calm and Glow, and the note are filled in. */
export const Retake: Story = {
  decorators: [
    withSession({ ...takenThisWeek, weekStart: progressWeeks.lastWeek }),
    withAppData({ seed: seedProgress }),
  ],
};

/** Back from retaking an angle: what was filled in before is kept. */
export const WithDraft: Story = {
  decorators: [
    withSession({
      ...takenThisWeek,
      draft: { rating: 2, tags: ['breakout', 'oily'], note: 'Two new spots on the chin.' },
    }),
    withAppData({ seed: seedDemo }),
  ],
};

/** Opened with no photos (or just saved, on its way out): an empty screen with Back. */
export const NoSession: Story = { decorators: [withAppData({ seed: seedDemo })] };
