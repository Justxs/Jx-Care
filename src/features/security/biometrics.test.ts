import * as LocalAuthentication from 'expo-local-authentication';

import { authenticate, biometricsAvailable, pickKind } from './biometrics';

jest.mock('expo-local-authentication', () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

const mocked = jest.mocked(LocalAuthentication);
const { FINGERPRINT, FACIAL_RECOGNITION, IRIS } = LocalAuthentication.AuthenticationType;

function phone(hasHardware: boolean, enrolled: boolean, types: number[]) {
  mocked.hasHardwareAsync.mockResolvedValue(hasHardware);
  mocked.isEnrolledAsync.mockResolvedValue(enrolled);
  mocked.supportedAuthenticationTypesAsync.mockResolvedValue(types);
}

describe('biometrics', () => {
  it('names the kind, preferring fingerprint, then face, then iris', () => {
    expect(pickKind([FACIAL_RECOGNITION])).toBe('face');
    expect(pickKind([FACIAL_RECOGNITION, FINGERPRINT])).toBe('fingerprint');
    expect(pickKind([IRIS])).toBe('iris');
    expect(pickKind([])).toBeNull();
  });

  it('is available only with hardware and something enrolled', async () => {
    phone(true, true, [FACIAL_RECOGNITION]);
    expect(await biometricsAvailable()).toEqual({ available: true, kind: 'face' });
    phone(true, false, [FINGERPRINT]);
    expect(await biometricsAvailable()).toEqual({ available: false, kind: null });
    phone(false, false, []);
    expect(await biometricsAvailable()).toEqual({ available: false, kind: null });
    mocked.hasHardwareAsync.mockRejectedValue(new Error('no module'));
    expect(await biometricsAvailable()).toEqual({ available: false, kind: null });
  });

  it('never offers the phone passcode and returns false on cancel or error', async () => {
    mocked.authenticateAsync.mockResolvedValue({ success: true });
    expect(await authenticate('Unlock Jx-Care')).toBe(true);
    expect(mocked.authenticateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        promptMessage: 'Unlock Jx-Care',
        disableDeviceFallback: true,
        cancelLabel: expect.any(String),
      }),
    );
    mocked.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
    expect(await authenticate('Unlock Jx-Care')).toBe(false);
    mocked.authenticateAsync.mockRejectedValue(new Error('boom'));
    expect(await authenticate('Unlock Jx-Care')).toBe(false);
  });
});
