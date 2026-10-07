/** Calendar data for stories, built on `seedDemo`. */
import type { Db } from '@/db';
import { addDays } from '@/lib/appDay';

import type { Seed } from '../appData';
import { seedDemo } from '../fixtures';

/**
 * `seedDemo` as if it ran `days` earlier: the same ids, every date moved back. With 2, the
 * 5-day streak ends two days ago and its first day (7 days ago) is past the 7-day edit window.
 */
export function seedDemoEarlier(days: number): Seed {
  return (db: Db, today: string) => {
    seedDemo(db, addDays(today, -days));
  };
}
