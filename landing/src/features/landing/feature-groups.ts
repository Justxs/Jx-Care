import type { ComponentType } from 'react';

import {
  HairCard,
  IngredientsCard,
  PhotoCard,
  ProductDetailCard,
  RoutineCard,
  ShoppingCard,
  StreakCard,
} from './showcase/sample-cards';

type Visual = ComponentType<{ className?: string; delay?: number }>;

export const featureGroups = [
  {
    key: 'products',
    features: ['shelf', 'expiry', 'notes', 'costPerDay'],
    visuals: [ProductDetailCard],
  },
  {
    key: 'routines',
    features: ['timeOfDay', 'alternatives', 'stepSchedule', 'player', 'reminders'],
    visuals: [RoutineCard, StreakCard],
  },
  { key: 'hair', features: ['washCycle', 'otherCare', 'streaks'], visuals: [HairCard] },
  { key: 'ingredients', features: ['conflicts', 'groups', 'avoid'], visuals: [IngredientsCard] },
  { key: 'progress', features: ['weeklyPhoto', 'compare', 'condition'], visuals: [PhotoCard] },
  { key: 'shopping', features: ['buyAgain', 'addAsNew', 'share'], visuals: [ShoppingCard] },
] as const satisfies readonly {
  key: string;
  features: readonly string[];
  visuals: readonly Visual[];
}[];

export type FeatureGroup = (typeof featureGroups)[number];
