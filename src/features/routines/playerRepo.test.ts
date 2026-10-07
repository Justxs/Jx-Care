import { createTestDb } from '@/db/test-db';
import { MON, TUE, seedRoutine } from '@/features/today/testUtils';

import { nextUp } from './playerRepo';
import { getRoutineDay, setChoice, tickSteps } from './repo';

const WARN = 30;

function finish(db: ReturnType<typeof createTestDb>, id: number, day: string) {
  const r = getRoutineDay(db, id, day, WARN)!;
  tickSteps(db, id, r.progress.dueStepIds, day, true, r.progress.dueStepIds);
}

describe('nextUp', () => {
  it('is the evening today after the morning, then the morning tomorrow', () => {
    const db = createTestDb();
    const morning = seedRoutine(db, {
      name: 'Morning',
      timeOfDay: 'morning',
      reminderTime: '07:30',
    });
    const evening = seedRoutine(db, { name: 'Evening' });

    finish(db, morning, MON);
    expect(nextUp(db, morning, MON, WARN)).toEqual({
      day: MON,
      timeOfDay: 'evening',
      customName: null,
      time: '21:00',
    });

    finish(db, evening, MON);
    expect(nextUp(db, evening, MON, WARN)).toEqual({
      day: TUE,
      timeOfDay: 'morning',
      customName: null,
      time: '07:30',
    });
  });

  it('skips days with nothing due and uses the remembered A/B pick', () => {
    const db = createTestDb();
    const a = seedRoutine(db, { name: 'Evening A', days: [1], reminderTime: '21:00' });
    const b = seedRoutine(db, { name: 'Evening B', days: [1, 4], reminderTime: '22:15' });
    // Thursdays remember Evening B.
    setChoice(db, 'evening', 4, b);

    finish(db, a, MON);
    expect(nextUp(db, a, MON, WARN)).toEqual({
      day: '2026-10-08',
      timeOfDay: 'evening',
      customName: null,
      time: '22:15',
    });
  });

  it('looks ahead to next week, and is null with no routines', () => {
    const db = createTestDb();
    const id = seedRoutine(db, { name: 'Evening', days: [1] });
    finish(db, id, MON);
    // Monday again next week counts.
    expect(nextUp(db, id, MON, WARN)?.day).toBe('2026-10-12');
    expect(nextUp(createTestDb(), 99, MON, WARN)).toBeNull();
  });
});
