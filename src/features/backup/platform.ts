import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { withAutoLockPaused } from '@/features/security/lock';
import { i18n } from '@/i18n';

import { MIME_TYPES, type ExportKind } from './export';

/** iOS file types for the share sheet. */
const UTIS: Record<ExportKind, string> = { json: 'public.json', zip: 'public.zip-archive' };

/**
 * Opens the phone's share sheet for a backup file (save to Files, Drive or email). The sheet is
 * a phone screen: a short trip there doesn't lock the app.
 */
export async function shareBackup(uri: string, kind: ExportKind): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  await withAutoLockPaused(() =>
    Sharing.shareAsync(uri, {
      mimeType: MIME_TYPES[kind],
      UTI: UTIS[kind],
      dialogTitle: i18n.t('backup.export.shareTitle'),
    }),
  );
}

/**
 * Lets the person pick a backup file; returns its uri (copied into the cache), or null when they
 * cancelled. Any file can be picked: cloud drives often label JSON and zip files loosely, and the
 * file is checked anyway.
 */
export async function pickBackupFile(): Promise<string | null> {
  const result = await withAutoLockPaused(() =>
    DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false }),
  );
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
