import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { authenticate, type BiometricKind } from '@/features/security/biometrics';
import { useUpdateSettings } from '@/features/settings/api';

import { OnboardingFrame } from '../components/OnboardingFrame';
import { draftStore } from '../draft';
import { finishOnboarding } from '../finish';

const TITLE_KEY: Record<BiometricKind, string> = {
  face: 'onboarding.biometricsTitleFace',
  fingerprint: 'onboarding.biometricsTitleFingerprint',
  iris: 'onboarding.biometricsTitleIris',
};

/**
 * O5 Face ID or fingerprint. Only reached when the phone offers it. Turn on confirms with one
 * biometric check before switching it on; either button lands on Today.
 */
export function BiometricsScreen() {
  const { t } = useTranslation();
  const update = useUpdateSettings();
  // Read once: finishing clears the draft, and this screen must not react to that.
  const [draft] = useState(() => draftStore.state);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reached without O4 saving (a link): there is nothing to turn on yet.
  if (!draft.saved) return <Redirect href="/welcome" />;

  const kind = draft.biometricKind ?? 'fingerprint';

  const turnOn = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await authenticate(t('onboarding.biometricsPrompt'), t('common.cancel'));
    if (!ok) {
      setBusy(false);
      setFailed(true);
      return;
    }
    try {
      await update.mutateAsync({ biometricsOn: true });
    } catch {
      setBusy(false);
      setFailed(true);
      return;
    }
    finishOnboarding();
  };

  return (
    <OnboardingFrame
      step={4}
      footer={
        <>
          <Button loading={busy} onPress={() => void turnOn()}>
            {t('onboarding.turnOn')}
          </Button>
          <Button variant="ghost" disabled={busy} onPress={finishOnboarding}>
            {t('common.notNow')}
          </Button>
        </>
      }
    >
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Icon name={kind === 'face' ? 'scan-face' : 'fingerprint'} size={64} tone="accent" />
        <Text accessibilityRole="header" className="text-center text-title-l">
          {t(TITLE_KEY[kind])}
        </Text>
        <Text className="text-center text-body text-ink-muted">
          {t('onboarding.biometricsBody')}
        </Text>
        {/* Reserved so the message never moves the text above. */}
        <View className="min-h-[36px] justify-center">
          {failed ? (
            <Text accessibilityLiveRegion="polite" className="text-center text-caption text-danger">
              {t('onboarding.biometricsFailed')}
            </Text>
          ) : null}
        </View>
      </View>
    </OnboardingFrame>
  );
}
