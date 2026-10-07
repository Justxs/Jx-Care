import { getDb } from '@/db';
import { getSettings } from '@/features/settings/repo';
import { askForReminders } from '@/notifications/askPermission';

/**
 * Called after a product is saved from the product form. The first product with an expiry date
 * opens the reminder ask ("Get a reminder before it expires?", P3) over whatever the form returns
 * to, once: after either answer `reminderAskDone` keeps it from showing again.
 */
export function onProductSaved(
  product: { id: number; name: string },
  opts: { isFirstWithExpiry: boolean },
): void {
  if (!opts.isFirstWithExpiry) return;
  if (getSettings(getDb()).reminderAskDone) return;
  askForReminders({ reason: 'expiry', productName: product.name }).catch(() => {});
}
