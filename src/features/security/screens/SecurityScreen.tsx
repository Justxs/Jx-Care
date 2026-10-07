import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Collapsible } from '@/components/ui/collapsible';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SelectField } from '@/components/ui/select-field';
import { Separator } from '@/components/ui/separator';
import { autoLockOptions, type AutoLockSeconds } from '@/db/enums';
import { useSettings, useUpdateSettings } from '@/features/settings/api';
import { defaultSettings } from '@/features/settings/repo';

import {
  authenticate,
  biometricsAvailable,
  type BiometricKind,
  type BiometricsAvailability,
} from '../biometrics';

const BIOMETRICS_LABEL: Record<BiometricKind, string> = {
  face: 'security.settings.biometricsFace',
  fingerprint: 'security.settings.biometricsFingerprint',
  iris: 'security.settings.biometricsIris',
};

/** Whether the phone offers biometrics, asked each time the screen opens; undefined until known. */
function useBiometricsAvailability(): BiometricsAvailability | undefined {
  const [bio, setBio] = useState<BiometricsAvailability | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    void biometricsAvailable().then((b) => {
      if (!cancelled) setBio(b);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return bio;
}

function isAutoLock(n: number): n is AutoLockSeconds {
  return (autoLockOptions as readonly number[]).includes(n);
}

/**
 * S6 PIN and security: change PIN, change recovery question, the Face ID / fingerprint switch
 * (only when the phone offers it) and the auto-lock time. Every change applies at once.
 */
export function SecurityScreen() {
  const { t } = useTranslation();
  const settings = useSettings().data ?? defaultSettings;
  const update = useUpdateSettings();
  const bio = useBiometricsAvailability();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const kind = bio?.available ? bio.kind : null;

  const autoLockItems = autoLockOptions.map((s) => ({
    value: String(s),
    label: s === 0 ? t('security.settings.immediately') : t('format.minutes', { count: s / 60 }),
  }));

  const setBiometrics = async (on: boolean) => {
    if (busy) return;
    setFailed(false);
    if (on) {
      // Turning it on needs one successful prompt, so it is never on for a finger it can't read.
      setBusy(true);
      const ok = await authenticate(t('security.settings.biometricsPrompt'), t('common.cancel'));
      setBusy(false);
      if (!ok) {
        setFailed(true);
        return;
      }
    }
    update.mutate({ biometricsOn: on }, { onError: () => setFailed(true) });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('screens.security')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 32 }}>
        <Card flush>
          <ListRow
            icon="key-round"
            label={t('security.settings.changePin')}
            onPress={() => router.push('/security/change-pin')}
          />
          <Separator inset />
          <ListRow
            icon="shield"
            label={t('security.settings.recovery')}
            onPress={() => router.push('/security/recovery')}
          />
          {/* Opens late (the check is async), so it animates its height instead of jumping. */}
          <Collapsible open={kind !== null}>
            <Separator inset />
            <ListRow
              icon={kind === 'face' ? 'scan-face' : 'fingerprint'}
              label={t(BIOMETRICS_LABEL[kind ?? 'fingerprint'])}
              detail={
                failed
                  ? t('security.settings.biometricsFailed')
                  : t('security.settings.biometricsDetail')
              }
              trailing="switch"
              checked={settings.biometricsOn}
              disabled={busy}
              onCheckedChange={(on) => void setBiometrics(on)}
            />
          </Collapsible>
          <Separator className="ml-4" />
          <View className="px-4 pt-3">
            <SelectField
              label={t('security.settings.autoLock')}
              hint={t('security.settings.autoLockHint')}
              value={String(settings.autoLockSeconds)}
              options={autoLockItems}
              mode="menu"
              onValueChange={(v) => {
                const seconds = Number(v);
                if (isAutoLock(seconds)) update.mutate({ autoLockSeconds: seconds });
              }}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
