/** Hair data for stories, built on `seedDemo` through the repo functions. */
import type { Db } from '@/db';
import { markHairDone, type HairProductRef, type HairTaskRow } from '@/features/hair/repo';

import { FIXTURE_TODAY, demoIds } from '../fixtures';
import { seedDemoEarlier } from './calendar';

/**
 * `seedDemo` as if it ran two days earlier: the wash was due two days ago ("Overdue 2 days") and
 * the trim comes two days sooner. Same ids as `demoIds`.
 */
export function seedHairOverdue(db: Db, today: string = FIXTURE_TODAY): void {
  seedDemoEarlier(2)(db, today);
}

/** `seedHairOverdue`, then the wash done today with shampoo: a late wash on today's Day detail. */
export function seedHairLateWash(db: Db, today: string = FIXTURE_TODAY): void {
  seedHairOverdue(db, today);
  markHairDone(db, demoIds.hairTasks.wash, {
    day: today,
    productIds: [demoIds.products.shampoo],
    note: 'Finally washed, scalp much better.',
  });
}

// ─── Rows for list components (no database) ─────────────────────────────────

const shampoo: HairProductRef = {
  id: 7,
  name: 'Repair Shampoo',
  brand: 'Hair Studio',
  area: 'hair',
  archived: false,
};
const conditioner: HairProductRef = { ...shampoo, id: 8, name: 'Silk Conditioner' };

/** The demo wash (every 3 days, due today) as the Routines Hair list gets it. */
const wash: HairTaskRow = {
  id: 1,
  name: 'Wash',
  kind: 'wash',
  otherKind: null,
  productIds: [7, 8],
  scheduleKind: 'interval',
  everyNDays: 3,
  intervalUnit: 'days',
  daysOfWeek: null,
  lastDoneAt: '2026-10-04',
  reminderTime: '19:00',
  active: true,
  createdAt: 0,
  updatedAt: 0,
  nextDue: '2026-10-07',
  state: 'due',
  overdueDays: 0,
  products: [shampoo, conditioner],
  productNames: [shampoo.name, conditioner.name],
};

const trim: HairTaskRow = {
  ...wash,
  id: 2,
  name: 'Trim',
  kind: 'other',
  otherKind: 'trim',
  productIds: [],
  everyNDays: 56,
  intervalUnit: 'weeks',
  lastDoneAt: '2026-08-18',
  reminderTime: null,
  nextDue: '2026-10-13',
  state: 'upcoming',
  products: [],
  productNames: [],
};

const overdueWash: HairTaskRow = {
  ...wash,
  lastDoneAt: '2026-10-02',
  nextDue: '2026-10-05',
  state: 'overdue',
  overdueDays: 2,
};

/** Hair task rows as the Routines Hair list and Today's due rows get them (FIXTURE_TODAY). */
export const hairRowFixtures = {
  /** Wash every 3 days with shampoo and conditioner, due today. */
  wash,
  /** Wash two days overdue. */
  overdueWash,
  /** Trim every 8 weeks, next on 13 Oct. */
  trim,
};
