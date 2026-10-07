/** Enum values stored in the database, shared by forms, filters and repositories. */

export const languages = ['lt', 'en'] as const;
export type LanguageCode = (typeof languages)[number];

export const areas = ['skin', 'hair', 'both'] as const;
export type Area = (typeof areas)[number];

export const productCategories = [
  'cleanser',
  'toner',
  'serum',
  'moisturiser',
  'spf',
  'mask',
  'exfoliant',
  'eye_care',
  'shampoo',
  'conditioner',
  'hair_mask',
  'hair_oil',
  'styling',
  'other',
] as const;
export type ProductCategory = (typeof productCategories)[number];

export const units = ['ml', 'g', 'pcs'] as const;
export type Unit = (typeof units)[number];

export const refKinds = ['ingredient', 'group'] as const;
export type RefKind = (typeof refKinds)[number];

export const timesOfDay = ['morning', 'evening', 'custom'] as const;
export type TimeOfDay = (typeof timesOfDay)[number];

export const stepScheduleKinds = ['always', 'days', 'interval'] as const;
export type StepScheduleKind = (typeof stepScheduleKinds)[number];

export const hairTaskKinds = ['wash', 'other'] as const;
export type HairTaskKind = (typeof hairTaskKinds)[number];

export const hairOtherKinds = ['trim', 'colour', 'mask', 'other'] as const;
export type HairOtherKind = (typeof hairOtherKinds)[number];

export const hairScheduleKinds = ['interval', 'days'] as const;
export type HairScheduleKind = (typeof hairScheduleKinds)[number];

export const intervalUnits = ['days', 'weeks'] as const;
export type IntervalUnit = (typeof intervalUnits)[number];

export const shoppingLists = ['to_buy', 'want_to_try'] as const;
export type ShoppingList = (typeof shoppingLists)[number];

export const progressAreas = ['skin', 'hair'] as const;
export type ProgressArea = (typeof progressAreas)[number];

export const photoAngles = ['front', 'left', 'right', 'back', 'top'] as const;
export type PhotoAngle = (typeof photoAngles)[number];

export const conditionAreas = ['skin', 'hair'] as const;
export type ConditionArea = (typeof conditionAreas)[number];

/** Skin tags in the standard order (condition log, photo review, product notes). */
export const skinTags = ['calm', 'glow', 'oily', 'dry', 'breakout', 'redness', 'itchy'] as const;
export type SkinTag = (typeof skinTags)[number];

export const hairTags = ['shiny', 'frizzy', 'oily_roots', 'dry_ends', 'flaky_scalp'] as const;
export type HairTag = (typeof hairTags)[number];

export const notificationEntityTypes = [
  'product',
  'routine',
  'hair_task',
  'weekly_photo',
  'digest',
  'backup',
] as const;
export type NotificationEntityType = (typeof notificationEntityTypes)[number];

export const notificationKinds = [
  'expiry_warning',
  'expiry_day',
  'routine',
  'hair',
  'weekly_photo',
  'digest',
  'backup',
] as const;
export type NotificationKind = (typeof notificationKinds)[number];

export const autoLockOptions = [0, 60, 300] as const;
export type AutoLockSeconds = (typeof autoLockOptions)[number];
