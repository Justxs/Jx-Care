import type { TFunction } from 'i18next';

import type { Db } from '@/db';
import type { NotificationEntityType, NotificationKind } from '@/db/enums';
import type { AppSettings } from '@/features/settings/repo';

export type { NotificationEntityType, NotificationKind };

export type PermissionState = 'granted' | 'denied' | 'undetermined';

/** Android channel ids (spec: Notifications). */
export const channelIds = ['expiry', 'routines', 'hair', 'photos', 'digest'] as const;
export type ChannelId = (typeof channelIds)[number];

/** Categories with action buttons (spec table "Actions"). */
export const categoryIds = [
  'expiry_warning',
  'expiry_day',
  'routine',
  'hair',
  'other_care',
  'weekly_photo',
] as const;
export type CategoryId = (typeof categoryIds)[number];

/** Action ids, one per button. */
export type ActionId = 'buy_again' | 'mark_finished' | 'snooze' | 'done' | 'skip_week';

/** One notification a feature wants on the phone. */
export type PlannedNotification = {
  /**
   * Stable and unique, built with `notificationKey()`, e.g. 'product:12:expiry_warning:2026-11-05'.
   * Never contains '#'.
   */
  key: string;
  entityType: NotificationEntityType;
  entityId: number | null;
  kind: NotificationKind;
  /** Epoch ms. */
  fireAt: number;
  title: string;
  body: string;
  categoryId?: CategoryId;
  channelId: ChannelId;
  /** `url` is an Expo Router path the tap opens, e.g. '/products/12'. */
  data: { url: string };
};

export type PlannerContext = {
  db: Db;
  now: number;
  settings: AppSettings;
  /** Translates in the app's language (settings.language). */
  t: TFunction;
};

/** Describes what one feature wants scheduled. Pure: reads the database, no side effects. */
export type Planner = (ctx: PlannerContext) => PlannedNotification[];

/** What the scheduler hands the OS for one notification. */
export type OsNotificationRequest = {
  /** Our identifier; the OS keeps it, so scheduling the same id again replaces the old one. */
  id: string;
  fireAt: number;
  title: string;
  body: string;
  categoryId?: CategoryId;
  channelId: ChannelId;
  data: NotificationData;
};

/** The data every notification carries; responses and actions read it back. */
export type NotificationData = {
  url: string;
  key: string;
  entityType: NotificationEntityType;
  entityId: number | null;
  kind: NotificationKind;
  /** Where a snoozed copy goes. */
  channelId: ChannelId;
};

export type OsScheduledNotification = { id: string; data: Partial<NotificationData> };

/**
 * The thin wrapper around expo-notifications, so the planner and the diff run in Jest with a fake.
 */
export type NotificationOS = {
  schedule(request: OsNotificationRequest): Promise<string>;
  cancel(id: string): Promise<void>;
  getAllScheduled(): Promise<OsScheduledNotification[]>;
  getPermission(): Promise<PermissionState>;
};
