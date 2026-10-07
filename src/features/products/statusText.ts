import type { TFunction } from 'i18next';

import type { BadgeStatus } from '@/components/ui/badge';
import type { ProductCategory } from '@/db/enums';
import type { Formatter } from '@/i18n/useFormat';

import type { ExpiryFields } from './types';

type Dated = ExpiryFields & { openedAt: string | null };

/** The status badge, only for a status that needs attention (an OK product has none). */
export function statusBadge(
  p: ExpiryFields,
  f: Formatter,
  t: TFunction,
): { status: BadgeStatus; label: string } | null {
  switch (p.status) {
    case 'ok':
      return null;
    case 'expired':
      return {
        status: 'expired',
        label: p.effectiveExpiry
          ? t('products.expiredOn', { date: f.date(p.effectiveExpiry) })
          : t('common.status.expired'),
      };
    default:
      return { status: p.status, label: t(`common.status.${p.status}`) };
  }
}

/**
 * The row's date line. It never repeats the badge: an expired product's badge carries the
 * date, so the line says when it was opened instead (or nothing).
 */
export function dateLine(p: Dated, f: Formatter, t: TFunction): string | null {
  if (p.status === 'expired' || p.status === 'nodate' || !p.effectiveExpiry) {
    return p.openedAt ? t('products.openedOn', { date: f.date(p.openedAt) }) : null;
  }
  return t('products.expiresOn', { date: f.date(p.effectiveExpiry) });
}

export function categoryLabel(category: ProductCategory, t: TFunction): string {
  return t(`products.categories.${category}`);
}

/** "Brand · Category", or just the category. */
export function metaLine(
  p: { brand: string | null; category: ProductCategory },
  t: TFunction,
): string {
  const category = categoryLabel(p.category, t);
  return p.brand ? `${p.brand} · ${category}` : category;
}
