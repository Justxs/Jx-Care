import { createStore, useSelector } from '@tanstack/react-store';

import type { Db } from '@/db';
import { pinService, type PinService } from '@/features/security/pin';
import { hasSettingsRow } from '@/features/settings/repo';

/**
 * Whether this launch has to go through onboarding. The settings row is the quick check (it is
 * written at the end of O4); the PIN check needs secure storage, which is async, so it runs once
 * at boot (`checkOnboarding`) and its answer is kept here.
 */
export const gateStore = createStore({ pinMissing: false });

/**
 * Runs once at launch, after migrations:
 * - No settings row means a first launch. The iOS Keychain survives an uninstall while the
 *   database does not, so any PIN or answer left from an old install is wiped first.
 * - A settings row without a PIN (killed mid-way after an old reset) also goes to onboarding.
 * Returns whether onboarding is needed.
 */
export async function checkOnboarding(
  db: Db,
  service: Pick<PinService, 'isPinSet' | 'resetAll'> = pinService,
): Promise<boolean> {
  if (!hasSettingsRow(db)) {
    await service.resetAll().catch(() => {});
    setPinMissing(true);
    return true;
  }
  // If secure storage can't be read, assume the PIN is there: onboarding would overwrite it.
  const pinSet = await service.isPinSet().catch(() => true);
  setPinMissing(!pinSet);
  return !pinSet;
}

function setPinMissing(pinMissing: boolean): void {
  gateStore.setState(() => ({ pinMissing }));
}

/** O4 saved the PIN and the settings row. */
export function markOnboarded(): void {
  setPinMissing(false);
}

/** The current answer, for one-off checks outside React. */
export function needsOnboarding(db: Db): boolean {
  return gateStore.state.pinMissing || !hasSettingsRow(db);
}

/** The same answer for a layout; re-renders when onboarding finishes. */
export function useNeedsOnboarding(db: Db): boolean {
  const pinMissing = useSelector(gateStore, (s) => s.pinMissing);
  return pinMissing || !hasSettingsRow(db);
}
