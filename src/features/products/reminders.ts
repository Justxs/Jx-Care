/**
 * Expiry notifications and the weekly digest (spec Notifications table, task 021), registered
 * with the notification layer (task 020). Imported by src/notifications/tasks.ts so the planners
 * and the action buttons exist in a headless start too.
 *
 * Every notification's text is its title (the spec's example text, "Vitamin C serum expires in
 * 30 days"); the body stays empty.
 */
import { queryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import { addToShoppingList } from '@/features/shopping/api';
import { addDays, appDay, diffDays, momentOf, weekdayOf } from '@/lib/appDay';
import { warningDay } from '@/lib/expiry';
import {
  notificationKey,
  registerAction,
  registerPlanner,
  syncEntity,
  type PlannedNotification,
  type PlannerContext,
  WINDOW_MS,
} from '@/notifications';

import { getProduct, listProducts, markFinished } from './repo';
import { defaultProductFilters, type ProductListItem } from './types';

/** The weekly digest: Mondays at 09:00 (spec S5). */
export const DIGEST_WEEKDAY = 1;
export const DIGEST_TIME = '09:00';

function activeProducts({ db, now, settings }: PlannerContext): ProductListItem[] {
  return listProducts(db, defaultProductFilters, appDay(now), settings.expiryWarnDays);
}

/**
 * For every active product with an effective expiry: a warning `expiryWarnDays` before it and,
 * when `expiryDayReminderOn`, one on the day, both at `expiryReminderTime`. Nothing while expiry
 * reminders are off; days already past are skipped.
 */
export function planExpiry(ctx: PlannerContext): PlannedNotification[] {
  const { now, settings, t } = ctx;
  if (!settings.expiryRemindersOn) return [];
  const out: PlannedNotification[] = [];
  for (const p of activeProducts(ctx)) {
    const expiry = p.effectiveExpiry;
    if (p.status === 'nodate' || !expiry) continue;
    const base = {
      entityType: 'product' as const,
      entityId: p.id,
      body: '',
      channelId: 'expiry' as const,
      data: { url: `/products/${p.id}` },
    };
    const warnDay = warningDay(p, settings.expiryWarnDays);
    if (warnDay) {
      const fireAt = momentOf(warnDay, settings.expiryReminderTime);
      if (fireAt > now) {
        out.push({
          ...base,
          key: notificationKey('product', p.id, 'expiry_warning', warnDay),
          kind: 'expiry_warning',
          fireAt,
          title: t('reminders.notify.expiresIn', {
            name: p.name,
            count: diffDays(expiry, warnDay),
          }),
          categoryId: 'expiry_warning',
        });
      }
    }
    if (settings.expiryDayReminderOn) {
      const fireAt = momentOf(expiry, settings.expiryReminderTime);
      if (fireAt > now) {
        out.push({
          ...base,
          key: notificationKey('product', p.id, 'expiry_day', expiry),
          kind: 'expiry_day',
          fireAt,
          title: t('reminders.notify.expiresToday', { name: p.name }),
          categoryId: 'expiry_day',
        });
      }
    }
  }
  return out;
}

export type DigestCounts = { expiring: number; expired: number; unopened: number };

/** Active products by status, at the moment of planning. */
export function digestCounts(ctx: PlannerContext): DigestCounts {
  const counts: DigestCounts = { expiring: 0, expired: 0, unopened: 0 };
  for (const p of activeProducts(ctx)) {
    if (p.status === 'expiring' || p.status === 'expired' || p.status === 'unopened') {
      counts[p.status]++;
    }
  }
  return counts;
}

/** "2 expiring soon, 1 expired, 3 unopened"; parts that are 0 are left out. */
export function digestText(counts: DigestCounts, t: PlannerContext['t']): string {
  return (['expiring', 'expired', 'unopened'] as const)
    .filter((k) => counts[k] > 0)
    .map((k) => t(`reminders.notify.digest.${k}`, { count: counts[k] }))
    .join(', ');
}

/**
 * The weekly digest every Monday at 09:00 in the window, with the counts at the moment of
 * planning (re-planned on every app open and the daily background sync, so they stay close).
 * Nothing when it is off or every count is 0.
 */
export function planDigest(ctx: PlannerContext): PlannedNotification[] {
  const { now, settings, t } = ctx;
  if (!settings.weeklyDigestOn) return [];
  const counts = digestCounts(ctx);
  if (counts.expiring + counts.expired + counts.unopened === 0) return [];
  const title = digestText(counts, t);
  const today = appDay(now);
  const out: PlannedNotification[] = [];
  for (let i = 0; i <= WINDOW_MS / 86_400_000; i++) {
    const day = addDays(today, i);
    if (weekdayOf(day) !== DIGEST_WEEKDAY) continue;
    const fireAt = momentOf(day, DIGEST_TIME);
    if (fireAt <= now) continue;
    out.push({
      key: notificationKey('digest', null, 'digest', day),
      entityType: 'digest',
      entityId: null,
      kind: 'digest',
      fireAt,
      title,
      body: '',
      channelId: 'digest',
      data: { url: '/products?filter=expiring' },
    });
  }
  return out;
}

registerPlanner('expiry', planExpiry);
registerPlanner('digest', planDigest);

function refreshProducts(): void {
  queryClient.invalidateQueries({ queryKey: qk.products.all }).catch(() => {});
  queryClient.invalidateQueries({ queryKey: ['today'] }).catch(() => {});
  queryClient.invalidateQueries({ queryKey: qk.shopping.all }).catch(() => {});
}

// Expiry day, "Mark finished": archives the product (if it is still active) without opening the
// app, then drops its other reminders.
registerAction('expiry_day', 'mark_finished', async ({ db, data, now, settings }) => {
  const id = data.entityId;
  if (data.entityType !== 'product' || id === null) return;
  const today = appDay(now);
  const p = getProduct(db, id, today, settings.expiryWarnDays);
  if (!p || p.archivedAt) return;
  markFinished(db, id, today);
  refreshProducts();
  await syncEntity('product', id, now);
});

// Expiry warning, "Buy again": adds the product to the shopping list (task 034).
registerAction('expiry_warning', 'buy_again', ({ data }) => {
  if (data.entityType !== 'product' || data.entityId === null) return;
  addToShoppingList(queryClient, [data.entityId]);
});
