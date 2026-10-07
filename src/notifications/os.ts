import * as Notifications from 'expo-notifications';

import { getPermission } from './permission';
import type { NotificationData, NotificationOS } from './types';

/** The real `NotificationOS`: expo-notifications with one-off date triggers. */
export const expoNotificationOS: NotificationOS = {
  schedule: (r) =>
    Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: {
        title: r.title,
        body: r.body,
        data: r.data,
        categoryIdentifier: r.categoryId,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.fireAt,
        channelId: r.channelId,
      },
    }),
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  getAllScheduled: async () =>
    (await Notifications.getAllScheduledNotificationsAsync()).map((n) => ({
      id: n.identifier,
      data: (n.content.data ?? {}) as Partial<NotificationData>,
    })),
  getPermission,
};
