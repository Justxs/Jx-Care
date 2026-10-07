import * as LocalAuthentication from 'expo-local-authentication';

import { i18n } from '@/i18n';

export type BiometricKind = 'face' | 'fingerprint' | 'iris';

export type BiometricsAvailability = {
  available: boolean;
  kind: BiometricKind | null;
};

/**
 * Picks the label O5 and S6 show. Android can report several types; fingerprint wins there
 * because it is the strong sensor on most phones, then face, then iris.
 */
export function pickKind(types: LocalAuthentication.AuthenticationType[]): BiometricKind | null {
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
  return null;
}

/** Whether the phone has biometric hardware with something enrolled, and which kind. */
export async function biometricsAvailable(): Promise<BiometricsAvailability> {
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const kind = pickKind(types);
    if (!hasHardware || !enrolled || kind === null) return { available: false, kind: null };
    return { available: true, kind };
  } catch {
    return { available: false, kind: null };
  }
}

/**
 * Shows the system biometric prompt. The phone passcode is never offered instead
 * (`disableDeviceFallback`, and the iOS fallback button is hidden): the app PIN is the fallback.
 * Android requires a non-empty cancel button once the passcode is ruled out, so it always gets
 * one ("Use PIN"). Cancel, failure and errors all return false.
 */
export async function authenticate(
  promptText: string,
  cancelText: string = i18n.t('security.biometrics.usePin'),
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptText,
      cancelLabel: cancelText,
      disableDeviceFallback: true,
      fallbackLabel: '',
    });
    return result.success;
  } catch {
    return false;
  }
}
