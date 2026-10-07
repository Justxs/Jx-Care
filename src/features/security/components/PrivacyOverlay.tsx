import { useSelector } from '@tanstack/react-store';
import { View } from 'react-native';

import { Logo } from '@/components/Logo';

import { privacyStore } from '../lock';

/**
 * Covers the whole app with the logo while it is inactive or in the background, so the app
 * switcher never shows content (spec Global UI rules: Privacy). Rendered last in the root layout,
 * above sheets, dialogs, toasts and the lock screen.
 *
 * The cover is the opaque canvas colour: expo-blur is not installed yet (see the task's
 * Decisions). Once it is, a `BlurView` (intensity 60, tint from the theme) can replace the
 * `bg-canvas` View with the same logo on top.
 */
export function PrivacyOverlay() {
  const covered = useSelector(privacyStore, (s) => s.covered);
  if (!covered) return null;
  return (
    <View
      testID="privacy-overlay"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="absolute inset-0 items-center justify-center bg-canvas"
    >
      <Logo size={96} />
    </View>
  );
}
