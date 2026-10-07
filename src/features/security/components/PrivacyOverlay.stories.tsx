import type { Meta, StoryObj } from '@storybook/react-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import { privacyStore } from '../lock';
import { PrivacyOverlay } from './PrivacyOverlay';

const COVER_MS = 3000;

/**
 * The blur the app switcher sees. It follows the app's own state (`privacyStore`), which the app
 * also draws over everything, so the button covers the whole phone screen for 3 seconds and then
 * hands the state back.
 */
const meta = {
  title: 'Components/Security/PrivacyOverlay',
  component: PrivacyOverlay,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PrivacyOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Some content under it, and a button that covers it for 3 s (developer tool, not translated). */
export const Cover: Story = {
  render: function Cover() {
    const { t } = useTranslation();
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    // Leaving the story mid-cover hands the state back at once.
    useEffect(
      () => () => {
        if (timer.current === undefined) return;
        clearTimeout(timer.current);
        privacyStore.setState(() => ({ covered: false }));
      },
      [],
    );
    return (
      <View className="flex-1 gap-4 p-4">
        <Text className="text-title-l">{t('settings.title')}</Text>
        <Text className="text-body text-ink-muted">{t('onboarding.pitch')}</Text>
        <Button
          onPress={() => {
            privacyStore.setState(() => ({ covered: true }));
            clearTimeout(timer.current);
            timer.current = setTimeout(
              () => privacyStore.setState(() => ({ covered: false })),
              COVER_MS,
            );
          }}
        >
          Cover for 3 s
        </Button>
        <PrivacyOverlay />
      </View>
    );
  },
};
