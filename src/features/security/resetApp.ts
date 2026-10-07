import type { QueryClient } from '@tanstack/react-query';
import { Directory, Paths } from 'expo-file-system';
import { router } from 'expo-router';

import { getDb, type Db } from '@/db';
import { DB_BACKUP_FOLDER } from '@/db/migrate';
import { queryClient as appQueryClient } from '@/db/queryClient';
import { PHOTO_ROOTS } from '@/features/backup/format';
import { clearDraft } from '@/features/onboarding/draft';
import { markNeedsOnboarding } from '@/features/onboarding/gate';
import { cancelAllNotifications } from '@/notifications';
import { lockStore } from '@/state/lock';
import { dismissToast, uiStore } from '@/state/ui';

import { pinService } from './pin';
import { deleteAllRows } from './repo';

export type ResetDeps = {
  db: Db;
  queryClient: QueryClient;
  /** Cancels every scheduled notification (task 020). */
  cancelNotifications: () => Promise<void>;
  /** Deletes the `products/` and `progress/` photo folders and the pre-update database copies. */
  deletePhotoFolders: () => void;
  /** Deletes the PIN, the recovery answer and the lockout counters (task 016). */
  resetSecureKeys: () => Promise<void>;
  /** Opens O1 Welcome with nothing to go back to. */
  openWelcome: () => void;
};

function deletePhotoFolders(): void {
  for (const name of [...PHOTO_ROOTS, DB_BACKUP_FOLDER]) {
    const dir = new Directory(Paths.document, name);
    if (dir.exists) dir.delete();
  }
}

function openWelcome(): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/welcome');
}

function withDefaults(overrides: Partial<ResetDeps>): ResetDeps {
  return {
    db: overrides.db ?? getDb(),
    queryClient: appQueryClient,
    cancelNotifications: cancelAllNotifications,
    deletePhotoFolders,
    resetSecureKeys: () => pinService.resetAll(),
    openWelcome,
    ...overrides,
  };
}

/**
 * Reset app (spec L2, S8): deletes everything and starts onboarding again.
 *
 * 1. Cancels every notification (before the rows that track them go).
 * 2. Deletes every row of every table in one transaction (the database file stays open and
 *    migrated). If this fails nothing else runs and the error is thrown, so the person can try
 *    again with their data and PIN intact.
 * 3. Deletes the photo folders and the secure keys.
 * 4. Clears the query cache and the in-memory stores, then opens O1.
 *
 * Steps other than 2 are best effort: a leftover notification or file must not stop the reset.
 */
export async function resetApp(overrides: Partial<ResetDeps> = {}): Promise<void> {
  const deps = withDefaults(overrides);

  await deps.cancelNotifications().catch(() => {});
  deleteAllRows(deps.db);
  try {
    deps.deletePhotoFolders();
  } catch {
    // A file that can't be deleted is left behind; the rows that pointed at it are gone.
  }
  await deps.resetSecureKeys().catch(() => {});

  deps.queryClient.clear();
  clearDraft();
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);

  // Navigate while the lock layer still covers the app, then let it go.
  deps.openWelcome();
  lockStore.setState(() => ({ locked: false, lastBackgroundAt: null, pendingUrl: null }));
  markNeedsOnboarding();
}
