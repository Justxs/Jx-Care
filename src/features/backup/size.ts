import type { TFunction } from 'i18next';

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

/**
 * "840 KB", "14.2 MB", "1.3 GB" (decimals in the phone's locale through `number`). Anything
 * above zero shows at least 1 KB.
 */
export function formatBytes(
  bytes: number,
  t: TFunction,
  number: (value: number, digits?: number) => string,
): string {
  if (bytes >= GB) return t('backup.size.gb', { value: number(bytes / GB, 1) });
  if (bytes >= MB) return t('backup.size.mb', { value: number(bytes / MB, 1) });
  const kb = bytes > 0 ? Math.max(1, Math.round(bytes / KB)) : 0;
  return t('backup.size.kb', { value: number(kb) });
}
