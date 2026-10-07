import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Linking } from 'react-native';

import { queryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';

import type { PermissionState } from './types';

/** Maps the expo status to ours. iOS provisional and ephemeral permission count as granted. */
export function toPermissionState(
  status: Notifications.NotificationPermissionsStatus,
): PermissionState {
  const ios = status.ios?.status;
  if (
    status.granted ||
    ios === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    ios === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'granted';
  }
  return status.status === 'denied' ? 'denied' : 'undetermined';
}

export async function getPermission(): Promise<PermissionState> {
  return toPermissionState(await Notifications.getPermissionsAsync());
}

/**
 * Shows the system prompt. Only call it from an in-context ask (task 021's reminder ask, task
 * 027's first routine reminder), never at launch.
 */
export async function requestPermission(): Promise<PermissionState> {
  const state = toPermissionState(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
  queryClient.setQueryData(qk.notifications.permission, state);
  return state;
}

/** Opens the app's page in the phone's settings ("Open phone settings"). */
export function openPhoneSettings(): Promise<void> {
  return Linking.openSettings();
}

/**
 * The current permission for the S5 banner, re-checked whenever the app returns to the
 * foreground (the person may have changed it in phone settings). `null` until the first check.
 */
export function usePermission(): PermissionState | null {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: qk.notifications.permission,
    queryFn: getPermission,
    staleTime: Infinity,
  });
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        client.invalidateQueries({ queryKey: qk.notifications.permission }).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [client]);
  return query.data ?? null;
}
