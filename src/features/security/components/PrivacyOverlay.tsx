import { useSelector } from '@tanstack/react-store';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

import { Logo } from '@/components/Logo';
import { useThemeColors } from '@/theme/colors';

import { privacyStore } from '../lock';

/**
 * Blurs the whole app with the logo on top while it is inactive or in the background, so the app
 * switcher never shows content (spec Global UI rules: Privacy). Rendered last in the root layout,
 * above sheets, dialogs, toasts and the lock screen.
 */
export function PrivacyOverlay() {
  const covered = useSelector(privacyStore, (s) => s.covered);
  const colors = useThemeColors();
  if (!covered) return null;
  return (
    <BlurView
      testID="privacy-overlay"
      intensity={60}
      tint={colors.scheme === 'dark' ? 'dark' : 'light'}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
    >
      <Logo size={96} />
    </BlurView>
  );
}
