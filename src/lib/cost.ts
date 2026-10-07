import { diffDays } from './appDay';

export type CostPerDay = { cents: number; days: number };

/** Price spread over the days a product was in use (P2 "€0.21 a day over 142 days"). */
export function costPerDayCents(
  priceCents: number | null | undefined,
  openedAt: string | null | undefined,
  finishedAt: string | null | undefined,
): CostPerDay | null {
  if (priceCents == null || !openedAt || !finishedAt) return null;
  if (finishedAt < openedAt) return null;
  const days = Math.max(1, diffDays(finishedAt, openedAt));
  return { cents: Math.round(priceCents / days), days };
}
