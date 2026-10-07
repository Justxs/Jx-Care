/** The notification layer every feature uses. Features only describe what to schedule. */
export {
  cancelAllNotifications,
  cancelSnoozes,
  MAX_SCHEDULED,
  notificationKey,
  registerPlanner,
  scheduleSnooze,
  sync,
  syncEntity,
  WINDOW_MS,
  type SyncResult,
} from './scheduler';
export { getPermission, openPhoneSettings, requestPermission, usePermission } from './permission';
export {
  openPendingUrl,
  openUrl,
  registerAction,
  snoozeHandler,
  type ActionContext,
  type ActionHandler,
} from './responses';
export type {
  ActionId,
  CategoryId,
  ChannelId,
  NotificationData,
  NotificationOS,
  PermissionState,
  PlannedNotification,
  Planner,
  PlannerContext,
} from './types';
