/** Condition log data for stories, built on `seedDemo` through the repo functions. */
import type { Db } from '@/db';
import { saveConditionDay } from '@/features/condition/repo';

import { FIXTURE_TODAY, seedDemo } from '../fixtures';

/** `seedDemo` plus today's log: skin Oily and Breakout with a note, hair Frizzy. */
export function seedConditionToday(db: Db, today: string = FIXTURE_TODAY): void {
  seedDemo(db, today);
  saveConditionDay(db, today, {
    skin: { states: ['oily', 'breakout'], note: 'A new spot on the forehead.' },
    hair: { states: ['frizzy'], note: null },
  });
}
