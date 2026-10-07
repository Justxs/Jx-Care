/**
 * Hair reminders (spec Notifications: Hair task due, Other care due; sequence 6). The planner
 * describes one notification per task on its next due day; the Done button marks the task done
 * for today without opening the app. Registered when this module loads; `src/notifications/
 * tasks.ts` imports it so a headless start has both.
 */
import type { TFunction } from 'i18next';

import { queryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import { appDay, momentOf } from '@/lib/appDay';
import {
  cancelSnoozes,
  notificationKey,
  registerAction,
  registerPlanner,
  syncEntity,
  type ActionHandler,
  type PlannedNotification,
  type Planner,
} from '@/notifications';

import {
  getHairTask,
  hasHairLogOn,
  listReminderTasks,
  markHairDone,
  type HairTaskRow,
} from './repo';

type ReminderTask = Pick<
  HairTaskRow,
  'name' | 'kind' | 'otherKind' | 'scheduleKind' | 'everyNDays' | 'intervalUnit' | 'productNames'
>;

/** "8 weeks" or "10 days" for an interval; nothing for set days. */
function span(task: ReminderTask, t: TFunction): string | null {
  if (task.scheduleKind !== 'interval') return null;
  const n = Math.max(1, task.everyNDays ?? 1);
  if (task.intervalUnit === 'weeks' && n % 7 === 0) {
    return t('hair.reminder.weeks', { count: n / 7 });
  }
  return t('hair.reminder.days', { count: n });
}

/** "Hair wash day: shampoo + conditioner", "Time for a trim (8 weeks)". */
export function reminderBody(task: ReminderTask, t: TFunction): string {
  if (task.kind === 'wash') {
    return task.productNames.length > 0
      ? t('hair.reminder.washWith', { products: task.productNames.join(' + ') })
      : t('hair.reminder.wash');
  }
  const text = t(`hair.reminder.other.${task.otherKind ?? 'other'}`, { name: task.name });
  const s = span(task, t);
  return s ? t('hair.reminder.withSpan', { text, span: s }) : text;
}

/**
 * One notification per active task with a reminder time, on its next due day at that time,
 * while the Hair tasks master switch is on. A due day already past (overdue) or a time already
 * gone today gets none: the task waits on Today until it is done. The scheduler keeps the 14-day
 * window.
 */
export const hairPlanner: Planner = ({ db, now, settings, t }) => {
  if (!settings.hairRemindersOn) return [];
  const today = appDay(now);
  return listReminderTasks(db, today).flatMap((task): PlannedNotification[] => {
    if (!task.reminderTime || task.nextDue < today) return [];
    const fireAt = momentOf(task.nextDue, task.reminderTime);
    if (fireAt <= now) return [];
    const wash = task.kind === 'wash';
    return [
      {
        key: notificationKey('hair_task', task.id, 'hair', task.nextDue),
        entityType: 'hair_task',
        entityId: task.id,
        kind: 'hair',
        fireAt,
        title: task.name,
        body: reminderBody(task, t),
        categoryId: wash ? 'hair' : 'other_care',
        channelId: 'hair',
        data: { url: `/hair/done/${task.id}` },
      },
    ];
  });
};

/** Today, the calendar, the hair lists and progress weeks read again (when the app is running). */
function refreshHairQueries(): void {
  for (const queryKey of [qk.hair.all, qk.today.all, qk.calendar.all, qk.progress.all]) {
    queryClient.invalidateQueries({ queryKey }).catch(() => {});
  }
}

/**
 * Done (both categories): marks the task done for today with its products, in the background,
 * then plans its next reminder. A task already logged today keeps that log (and its note).
 */
export const hairDoneHandler: ActionHandler = async (ctx) => {
  const id = ctx.data.entityId;
  if (id == null) return;
  const today = appDay(ctx.now);
  const task = getHairTask(ctx.db, id, today);
  if (task?.active && !hasHairLogOn(ctx.db, id, today)) {
    markHairDone(ctx.db, id, {
      day: today,
      productIds: task.products.map((p) => p.id),
      note: null,
    });
    refreshHairQueries();
  }
  await cancelSnoozes('hair_task', id).catch(() => {});
  await syncEntity('hair_task', id, ctx.now).catch(() => {});
};

registerPlanner('hair', hairPlanner);
registerAction('hair', 'done', hairDoneHandler);
registerAction('other_care', 'done', hairDoneHandler);
