import { addDays, addMonths, diffDays } from './appDay';

/** Product expiry rules (spec P1 status rules and refinement 4). Effective expiry is never stored. */

export type ExpiryInput = {
  expiresAt: string | null;
  openedAt: string | null;
  paoMonths: number | null;
  purchasedAt?: string | null;
};

export type ExpiryStatus = 'ok' | 'expiring' | 'expired' | 'unopened' | 'nodate';

/** The earlier of the printed expiry and opened date + period after opening; null when neither exists. */
export function effectiveExpiry(p: ExpiryInput): string | null {
  const afterOpening =
    p.openedAt && p.paoMonths != null && p.paoMonths > 0
      ? addMonths(p.openedAt, p.paoMonths)
      : null;
  if (p.expiresAt && afterOpening) return p.expiresAt < afterOpening ? p.expiresAt : afterOpening;
  return p.expiresAt ?? afterOpening;
}

export function expiryStatus(p: ExpiryInput, today: string, warnDays: number): ExpiryStatus {
  const eff = effectiveExpiry(p);
  if (!eff) return 'nodate';
  const left = diffDays(eff, today);
  if (left < 0) return 'expired';
  if (left <= warnDays) return 'expiring';
  if (!p.openedAt) return 'unopened';
  return 'ok';
}

/** Days until the effective expiry (0 = today, negative when expired); null without a date. */
export function daysLeft(p: ExpiryInput, today: string): number | null {
  const eff = effectiveExpiry(p);
  return eff ? diffDays(eff, today) : null;
}

/** 0–1 progress from opened (or purchased) to the effective expiry, for the P2 bar. */
export function expiryProgress(p: ExpiryInput, today: string): number | null {
  const eff = effectiveExpiry(p);
  const from = p.openedAt ?? p.purchasedAt ?? null;
  if (!eff || !from) return null;
  const total = diffDays(eff, from);
  if (total <= 0) return 1;
  const done = diffDays(today, from);
  return Math.min(1, Math.max(0, done / total));
}

/** The day the expiry warning fires (effective expiry − warnDays). */
export function warningDay(p: ExpiryInput, warnDays: number): string | null {
  const eff = effectiveExpiry(p);
  return eff ? addDays(eff, -warnDays) : null;
}

/** Expired first (most overdue first), then soonest, then no date last; ties by name. */
export function sortBySoonestExpiry<T extends ExpiryInput & { name: string }>(
  products: readonly T[],
): T[] {
  const keyed = products.map((p, i) => ({ p, i, eff: effectiveExpiry(p) }));
  keyed.sort((a, b) => {
    if (a.eff && b.eff && a.eff !== b.eff) return a.eff < b.eff ? -1 : 1;
    if (a.eff && !b.eff) return -1;
    if (!a.eff && b.eff) return 1;
    const byName = a.p.name.localeCompare(b.p.name);
    return byName !== 0 ? byName : a.i - b.i;
  });
  return keyed.map((k) => k.p);
}
