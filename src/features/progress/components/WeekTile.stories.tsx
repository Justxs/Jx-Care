import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedEmpty } from '@/storybook/fixtures';
import { progressWeeks, storyPhotoUri } from '@/storybook/seeds/progress';

import type { TimelineTile } from '../types';
import { WeekTile, type WeekTileProps } from './WeekTile';

const taken: TimelineTile = {
  weekStart: progressWeeks.lastWeek,
  entryId: 1,
  status: 'taken',
  photo: { id: 1, angle: 'front', fileUri: storyPhotoUri('front') },
  photoCount: 3,
  takenAt: null,
  takenDay: progressWeeks.lastWeekSkinDay,
  current: false,
};

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<WeekTileProps, 'onOpen'>;

const meta = {
  title: 'Components/Progress/WeekTile',
  component: WeekTile,
  args: { ...actions, area: 'skin', tile: taken, width: 160 },
  argTypes: {
    area: { control: 'radio', options: ['skin', 'hair'] },
    width: { control: { type: 'range', min: 120, max: 220, step: 10 } },
    onOpen: { action: 'opened' },
  },
  // Dates follow the app's settings.
  decorators: [withAppData({ seed: seedEmpty })],
} satisfies Meta<typeof WeekTile>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A week with a photo: the 3:4 cover (a bundled image stands in) labelled "4 Oct". */
export const Taken: Story = {};

/** A week with no photo: the dashed "No photo" tile with "Skipped". */
export const NoPhoto: Story = {
  args: {
    tile: {
      ...taken,
      weekStart: progressWeeks.emptyWeek,
      entryId: null,
      status: 'empty',
      photo: null,
      photoCount: 0,
      takenDay: null,
    },
  },
};

/** A week skipped from Today or the reminder: the same "No photo" tile. */
export const Skipped: Story = {
  args: {
    tile: {
      ...taken,
      weekStart: progressWeeks.skippedWeek,
      entryId: 2,
      status: 'skipped',
      photo: null,
      photoCount: 0,
      takenDay: null,
    },
  },
};
