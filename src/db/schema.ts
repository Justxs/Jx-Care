import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import type {
  Area,
  AutoLockSeconds,
  ConditionArea,
  HairOtherKind,
  HairScheduleKind,
  HairTaskKind,
  IntervalUnit,
  LanguageCode,
  NotificationEntityType,
  NotificationKind,
  PhotoAngle,
  ProductCategory,
  ProgressArea,
  RefKind,
  ShoppingList,
  StepScheduleKind,
  TimeOfDay,
  Unit,
  ProductView,
} from './enums';

/** Calendar days are 'YYYY-MM-DD' app days; moments are epoch ms. */
const createdAt = () =>
  integer('created_at')
    .notNull()
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`);
const updatedAt = () =>
  integer('updated_at')
    .notNull()
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
    .$onUpdateFn(() => Date.now());
const id = () => integer('id').primaryKey({ autoIncrement: true });
const json = <T>(name: string) => text(name, { mode: 'json' }).$type<T>();
const bool = (name: string) => integer(name, { mode: 'boolean' });

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  language: text('language').$type<LanguageCode>().notNull().default('en'),
  currency: text('currency').notNull().default('EUR'),
  expiryWarnDays: integer('expiry_warn_days').notNull().default(30),
  expiryReminderTime: text('expiry_reminder_time').notNull().default('09:00'),
  expiryRemindersOn: bool('expiry_reminders_on').notNull().default(false),
  expiryDayReminderOn: bool('expiry_day_reminder_on').notNull().default(true),
  routineRemindersOn: bool('routine_reminders_on').notNull().default(true),
  hairRemindersOn: bool('hair_reminders_on').notNull().default(true),
  weeklyPhotoOn: bool('weekly_photo_on').notNull().default(false),
  weeklyPhotoWeekday: integer('weekly_photo_weekday').notNull().default(7),
  weeklyPhotoTime: text('weekly_photo_time').notNull().default('10:00'),
  weeklyDigestOn: bool('weekly_digest_on').notNull().default(true),
  snoozeMinutes: integer('snooze_minutes').notNull().default(15),
  autoLockSeconds: integer('auto_lock_seconds').$type<AutoLockSeconds>().notNull().default(60),
  biometricsOn: bool('biometrics_on').notNull().default(false),
  skinAngles: json<PhotoAngle[]>('skin_angles').notNull().default(['front']),
  hairAlbumOn: bool('hair_album_on').notNull().default(false),
  hairAngles: json<PhotoAngle[]>('hair_angles').notNull().default(['front', 'back', 'top']),
  photoGuideOn: bool('photo_guide_on').notNull().default(true),
  photoGuideOpacity: real('photo_guide_opacity').notNull().default(0.3),
  reminderAskDone: bool('reminder_ask_done').notNull().default(false),
  setupDoneAt: text('setup_done_at'),
  setupHiddenAt: text('setup_hidden_at'),
  lastBackupAt: integer('last_backup_at'),
  /** Products tab: list or shelf view (P1 remembers the choice). */
  productView: text('product_view').$type<ProductView>().notNull().default('list'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const product = sqliteTable(
  'product',
  {
    id: id(),
    name: text('name').notNull(),
    brand: text('brand'),
    area: text('area').$type<Area>().notNull(),
    category: text('category').$type<ProductCategory>().notNull().default('other'),
    photoUri: text('photo_uri'),
    size: real('size'),
    unit: text('unit').$type<Unit>(),
    priceCents: integer('price_cents'),
    purchasedAt: text('purchased_at'),
    expiresAt: text('expires_at'),
    openedAt: text('opened_at'),
    paoMonths: integer('pao_months'),
    notes: text('notes'),
    rating: integer('rating'),
    wouldRebuy: bool('would_rebuy'),
    archivedAt: text('archived_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('product_archived_at_idx').on(t.archivedAt)],
);

export const ingredientGroup = sqliteTable('ingredient_group', {
  id: id(),
  name: text('name').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const ingredient = sqliteTable('ingredient', {
  id: id(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  groupId: integer('group_id').references(() => ingredientGroup.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const productIngredient = sqliteTable(
  'product_ingredient',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    ingredientId: integer('ingredient_id')
      .notNull()
      .references(() => ingredient.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.ingredientId] }),
    index('product_ingredient_ingredient_idx').on(t.ingredientId),
  ],
);

export const conflict = sqliteTable('conflict', {
  id: id(),
  leftKind: text('left_kind').$type<RefKind>().notNull(),
  leftId: integer('left_id').notNull(),
  rightKind: text('right_kind').$type<RefKind>().notNull(),
  rightId: integer('right_id').notNull(),
  note: text('note'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const avoidItem = sqliteTable('avoid_item', {
  id: id(),
  kind: text('kind').$type<RefKind>().notNull(),
  refId: integer('ref_id').notNull(),
  note: text('note'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const routine = sqliteTable('routine', {
  id: id(),
  name: text('name').notNull(),
  timeOfDay: text('time_of_day').$type<TimeOfDay>().notNull(),
  customName: text('custom_name'),
  sortTime: text('sort_time').notNull().default('07:00'),
  daysOfWeek: json<number[]>('days_of_week').notNull().default([1, 2, 3, 4, 5, 6, 7]),
  reminderTime: text('reminder_time'),
  active: bool('active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const routineStep = sqliteTable('routine_step', {
  id: id(),
  routineId: integer('routine_id')
    .notNull()
    .references(() => routine.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => product.id, { onDelete: 'set null' }),
  position: integer('position').notNull().default(0),
  note: text('note'),
  scheduleKind: text('schedule_kind').$type<StepScheduleKind>().notNull().default('always'),
  daysOfWeek: json<number[]>('days_of_week'),
  everyNDays: integer('every_n_days'),
  startDate: text('start_date'),
  waitSeconds: integer('wait_seconds').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const routineLog = sqliteTable(
  'routine_log',
  {
    id: id(),
    routineId: integer('routine_id')
      .notNull()
      .references(() => routine.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    dueStepIds: json<number[]>('due_step_ids').notNull().default([]),
    doneStepIds: json<number[]>('done_step_ids').notNull().default([]),
    completedAt: integer('completed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('routine_log_routine_day_uq').on(t.routineId, t.day),
    index('routine_log_day_idx').on(t.day),
  ],
);

export const routineChoice = sqliteTable(
  'routine_choice',
  {
    id: id(),
    timeOfDayKey: text('time_of_day_key').notNull(),
    weekday: integer('weekday').notNull(),
    routineId: integer('routine_id')
      .notNull()
      .references(() => routine.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('routine_choice_key_weekday_uq').on(t.timeOfDayKey, t.weekday)],
);

export const hairTask = sqliteTable('hair_task', {
  id: id(),
  name: text('name').notNull(),
  kind: text('kind').$type<HairTaskKind>().notNull(),
  otherKind: text('other_kind').$type<HairOtherKind>(),
  productIds: json<number[]>('product_ids').notNull().default([]),
  scheduleKind: text('schedule_kind').$type<HairScheduleKind>().notNull().default('interval'),
  everyNDays: integer('every_n_days'),
  intervalUnit: text('interval_unit').$type<IntervalUnit>().notNull().default('days'),
  daysOfWeek: json<number[]>('days_of_week'),
  lastDoneAt: text('last_done_at'),
  reminderTime: text('reminder_time'),
  active: bool('active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const hairLog = sqliteTable(
  'hair_log',
  {
    id: id(),
    hairTaskId: integer('hair_task_id')
      .notNull()
      .references(() => hairTask.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    dueDay: text('due_day'),
    productIds: json<number[]>('product_ids').notNull().default([]),
    note: text('note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('hair_log_task_day_idx').on(t.hairTaskId, t.day)],
);

export const shoppingItem = sqliteTable(
  'shopping_item',
  {
    id: id(),
    productId: integer('product_id').references(() => product.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    brand: text('brand'),
    area: text('area').$type<Area>(),
    note: text('note'),
    list: text('list').$type<ShoppingList>().notNull().default('to_buy'),
    boughtAt: integer('bought_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('shopping_item_bought_at_idx').on(t.boughtAt)],
);

export const shoppingDismissal = sqliteTable('shopping_dismissal', {
  id: id(),
  productId: integer('product_id')
    .notNull()
    .unique()
    .references(() => product.id, { onDelete: 'cascade' }),
  dismissedAt: integer('dismissed_at').notNull(),
  createdAt: createdAt(),
});

export const progressEntry = sqliteTable(
  'progress_entry',
  {
    id: id(),
    area: text('area').$type<ProgressArea>().notNull(),
    weekStart: text('week_start').notNull(),
    takenAt: integer('taken_at'),
    skipped: bool('skipped').notNull().default(false),
    rating: integer('rating'),
    tags: json<string[]>('tags').notNull().default([]),
    note: text('note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('progress_entry_area_week_uq').on(t.area, t.weekStart)],
);

export const progressPhoto = sqliteTable('progress_photo', {
  id: id(),
  entryId: integer('entry_id')
    .notNull()
    .references(() => progressEntry.id, { onDelete: 'cascade' }),
  angle: text('angle').$type<PhotoAngle>().notNull(),
  fileUri: text('file_uri').notNull(),
  createdAt: createdAt(),
});

export const conditionLog = sqliteTable(
  'condition_log',
  {
    id: id(),
    day: text('day').notNull(),
    area: text('area').$type<ConditionArea>().notNull(),
    states: json<string[]>('states').notNull().default([]),
    note: text('note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('condition_log_day_area_uq').on(t.day, t.area),
    index('condition_log_day_idx').on(t.day),
  ],
);

export const productNote = sqliteTable(
  'product_note',
  {
    id: id(),
    productId: integer('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    text: text('text').notNull(),
    tags: json<string[]>('tags').notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('product_note_product_idx').on(t.productId)],
);

export const scheduledNotification = sqliteTable('scheduled_notification', {
  id: id(),
  entityType: text('entity_type').$type<NotificationEntityType>().notNull(),
  entityId: integer('entity_id'),
  kind: text('kind').$type<NotificationKind>().notNull(),
  notificationId: text('notification_id').notNull(),
  fireAt: integer('fire_at').notNull(),
  createdAt: createdAt(),
});

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;
export type Ingredient = typeof ingredient.$inferSelect;
export type NewIngredient = typeof ingredient.$inferInsert;
export type IngredientGroup = typeof ingredientGroup.$inferSelect;
export type NewIngredientGroup = typeof ingredientGroup.$inferInsert;
export type ProductIngredient = typeof productIngredient.$inferSelect;
export type Conflict = typeof conflict.$inferSelect;
export type NewConflict = typeof conflict.$inferInsert;
export type AvoidItem = typeof avoidItem.$inferSelect;
export type NewAvoidItem = typeof avoidItem.$inferInsert;
export type Routine = typeof routine.$inferSelect;
export type NewRoutine = typeof routine.$inferInsert;
export type RoutineStep = typeof routineStep.$inferSelect;
export type NewRoutineStep = typeof routineStep.$inferInsert;
export type RoutineLog = typeof routineLog.$inferSelect;
export type NewRoutineLog = typeof routineLog.$inferInsert;
export type RoutineChoice = typeof routineChoice.$inferSelect;
export type HairTask = typeof hairTask.$inferSelect;
export type NewHairTask = typeof hairTask.$inferInsert;
export type HairLog = typeof hairLog.$inferSelect;
export type NewHairLog = typeof hairLog.$inferInsert;
export type ShoppingItem = typeof shoppingItem.$inferSelect;
export type NewShoppingItem = typeof shoppingItem.$inferInsert;
export type ShoppingDismissal = typeof shoppingDismissal.$inferSelect;
export type ProgressEntry = typeof progressEntry.$inferSelect;
export type NewProgressEntry = typeof progressEntry.$inferInsert;
export type ProgressPhoto = typeof progressPhoto.$inferSelect;
export type NewProgressPhoto = typeof progressPhoto.$inferInsert;
export type ConditionLog = typeof conditionLog.$inferSelect;
export type NewConditionLog = typeof conditionLog.$inferInsert;
export type ProductNote = typeof productNote.$inferSelect;
export type NewProductNote = typeof productNote.$inferInsert;
export type ScheduledNotification = typeof scheduledNotification.$inferSelect;
export type NewScheduledNotification = typeof scheduledNotification.$inferInsert;
