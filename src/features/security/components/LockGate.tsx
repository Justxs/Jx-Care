import { useBottomSheetModal } from '@gorhom/bottom-sheet';
import { PortalHost } from '@rn-primitives/portal';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Keyboard, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import { gateStore, needsOnboarding } from '@/features/onboarding/gate';
import { hasSettingsRow, type AppSettings } from '@/features/settings/repo';
import { prefetchToday } from '@/features/today/prefetch';
import { appStore } from '@/state/app';
import { lockStore } from '@/state/lock';
import { dismissToast, uiStore } from '@/state/ui';
import { motion } from '@/theme/motion';
import { useMotion } from '@/theme/useMotion';

import { startAutoLock, unlock } from '../lock';
import { ForgotPinScreen } from '../screens/ForgotPinScreen';
import { LockScreen } from '../screens/LockScreen';

/** The lock layer's own PortalHost, so its dialogs sit above it (the app's host is below). */
export const LOCK_PORTAL = 'lock';

const DEFAULT_AUTO_LOCK_SECONDS = 60;

/** Lands on Today with every pushed screen dismissed (after a new PIN from Forgot PIN). */
function openToday(): void {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/');
}

export type LockGateProps = {
  /** Fonts loaded and database migrated: until then there is nothing to lock. */
  ready: boolean;
  /** The whole app: navigation, toasts, dialogs. */
  children: ReactNode;
};

/** Whether the lock layer shows: locked, except while onboarding runs (no PIN yet). */
function useLockShown(ready: boolean): boolean {
  const locked = useSelector(lockStore, (s) => s.locked);
  const pinMissing = useSelector(gateStore, (s) => s.pinMissing);
  // The settings row is only read once the database is migrated (O4 writes it).
  return ready && locked && !pinMissing && hasSettingsRow(getDb());
}

/**
 * The lock (spec L1, L2): a full-screen layer above the app, not a route, so unlocking reveals
 * exactly the screen the person left, with its state. It shows while `lockStore.locked` is set,
 * except while onboarding runs (no PIN yet). Everything under it is hidden from screen readers,
 * and it renders after the app (sheets, toasts and the PortalHost), so a dialog left open stays
 * under it.
 */
export function LockGate({ ready, children }: LockGateProps) {
  const visible = useLockShown(ready);
  return (
    <>
      <View
        className="flex-1"
        importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={visible}
      >
        {children}
      </View>
      {ready ? <AutoLock /> : null}
      {visible ? <LockLayer /> : null}
    </>
  );
}

/**
 * Inside BottomSheetModalProvider (the lock layer renders outside it): locking puts away open
 * sheets, so none is left on screen or holds unsaved edits behind the lock.
 */
export function SheetsAwayOnLock({ ready }: { ready: boolean }) {
  const shown = useLockShown(ready);
  const { dismissAll } = useBottomSheetModal();
  useEffect(() => {
    if (shown) dismissAll();
  }, [shown, dismissAll]);
  return null;
}

/** Re-locks after time away and drives the privacy cover (`startAutoLock`). */
function AutoLock() {
  const client = useQueryClient();
  useEffect(
    () =>
      startAutoLock({
        autoLockSeconds: () =>
          client.getQueryData<AppSettings>(qk.settings)?.autoLockSeconds ??
          DEFAULT_AUTO_LOCK_SECONDS,
        onboarding: () => needsOnboarding(getDb()),
      }),
    [client],
  );
  return null;
}

function LockLayer() {
  const m = useMotion();
  const client = useQueryClient();
  const activeDay = useSelector(appStore, (s) => s.activeDay);
  const [forgot, setForgot] = useState(false);

  // Locking puts away what was open over the app: keyboard and toasts (sheets: SheetsAwayOnLock).
  useEffect(() => {
    Keyboard.dismiss();
    for (const toast of uiStore.state.toasts) dismissToast(toast.id);
  }, []);

  // Paint Today complete: its data is read while the lock is up.
  useEffect(() => {
    prefetchToday(client, activeDay).catch(() => {});
  }, [client, activeDay]);

  // Android back on L1 leaves the app instead of going back in the stack behind the lock.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, []);

  const onDone = useCallback(() => {
    openToday();
    unlock();
  }, []);

  const fade = m.reduced ? motion.duration.reduced : motion.duration.base;
  // Enter with ease-out, leave with ease-in (motion.ts).
  const easeOut = Easing.bezier(...motion.easing.enter);
  const easeIn = Easing.bezier(...motion.easing.exit);

  return (
    <Animated.View
      exiting={FadeOut.duration(fade).easing(easeIn)}
      accessibilityViewIsModal
      className="absolute inset-0 bg-canvas"
    >
      <LockScreen onForgot={() => setForgot(true)} covered={forgot} />
      {forgot ? (
        <Animated.View
          entering={
            m.allowMovement
              ? SlideInRight.duration(motion.duration.slow).easing(easeOut)
              : FadeIn.duration(motion.duration.reduced)
          }
          exiting={
            m.allowMovement
              ? SlideOutRight.duration(motion.duration.slow).easing(easeIn)
              : FadeOut.duration(motion.duration.reduced)
          }
          className="absolute inset-0 bg-canvas"
        >
          <ForgotPinScreen
            onClose={() => setForgot(false)}
            onDone={onDone}
            portalHost={LOCK_PORTAL}
          />
        </Animated.View>
      ) : null}
      <PortalHost name={LOCK_PORTAL} />
    </Animated.View>
  );
}
