import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { samplePhotoUri } from '@/storybook/seeds/products';

import { PhotoViewer, type PhotoViewerProps } from './PhotoViewer';

const meta = {
  title: 'Components/Products/PhotoViewer',
  component: PhotoViewer,
  // Partial: onClose stays unset, so Actions logs it.
  args: { uri: samplePhotoUri } as Partial<PhotoViewerProps>,
  argTypes: { onClose: { action: 'closed' } },
  // A full-screen modal: it opens at once, the close button (or Back) shuts it, and "Open photo"
  // (developer button) brings it back.
  render: function PhotoViewerStory(args) {
    const [open, setOpen] = useState(true);
    return (
      <View>
        <Button variant="secondary" onPress={() => setOpen(true)}>
          Open photo
        </Button>
        <PhotoViewer
          {...args}
          open={open}
          onClose={() => {
            setOpen(false);
            args.onClose?.();
          }}
        />
      </View>
    );
  },
} satisfies Meta<typeof PhotoViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** P2 product photo on the dark camera background: pinch to zoom, drag, double tap to reset. */
export const Open: Story = {};
