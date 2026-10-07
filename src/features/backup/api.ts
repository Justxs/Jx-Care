import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import { getSettings } from '@/features/settings/repo';
import { i18n } from '@/i18n';
import { sync } from '@/notifications';
import { setLanguage } from '@/state/app';
import { showToast } from '@/state/ui';

import { exportBackup, type BackupProgress, type ExportKind } from './export';
import { backupFiles, type BackupFiles } from './files';
import { prepareImport, restoreBackup, type PreparedImport } from './import';
import { pickBackupFile, shareBackup } from './platform';

/** The phone side of backups; tests swap it with `setBackupPlatform`. */
export type BackupPlatform = {
  files: BackupFiles;
  share: (uri: string, kind: ExportKind) => Promise<void>;
  pick: () => Promise<string | null>;
};

let platform: BackupPlatform = { files: backupFiles, share: shareBackup, pick: pickBackupFile };

export function setBackupPlatform(next: Partial<BackupPlatform>): void {
  platform = { ...platform, ...next };
}

export type PhotoStats = { count: number; bytes: number };

/** Product and progress photos on the phone: what a zip holds, and the storage line. */
export function usePhotoStats() {
  return useQuery({
    queryKey: [...qk.backup.all, 'photos'],
    queryFn: (): PhotoStats => {
      const photos = platform.files.listPhotoFiles();
      return { count: photos.length, bytes: photos.reduce((sum, p) => sum + p.bytes, 0) };
    },
  });
}

/** Export backup: write, share, then remember the date and drop the backup reminder. */
export function useExportBackup(onProgress: (progress: BackupProgress) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (kind: ExportKind) =>
      exportBackup(kind, {
        db: getDb(),
        files: platform.files,
        share: platform.share,
        onProgress,
      }),
    onSuccess: () => {
      client.setQueryData(qk.settings, getSettings(getDb()));
      sync().catch(() => {});
    },
  });
}

/** Import backup: pick a file and check it. Resolves to null when the picker was cancelled. */
export function usePickBackup() {
  return useMutation({
    mutationFn: async (): Promise<PreparedImport | null> => {
      const uri = await platform.pick();
      return uri ? prepareImport(uri, platform.files) : null;
    },
  });
}

/**
 * After a restore: the app's language follows the restored settings, every query starts over
 * (the ones on screen fetch again), notifications are planned from the new data and the ones
 * the database no longer knows are cancelled, then Today opens with "Backup restored".
 */
export async function finishRestore(client: QueryClient): Promise<void> {
  const settings = getSettings(getDb());
  if (i18n.language !== settings.language) {
    await setLanguage(settings.language, { persist: false });
  }
  await client.resetQueries();
  sync(Date.now(), { reconcile: true }).catch(() => {});
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/');
  showToast({ message: i18n.t('backup.import.restored') });
}

/** Replace all data with a prepared backup. */
export function useRestoreBackup(onProgress: (progress: BackupProgress) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (prepared: PreparedImport) =>
      restoreBackup(prepared, { db: getDb(), files: platform.files, onProgress }),
    onSuccess: () => finishRestore(client),
  });
}
