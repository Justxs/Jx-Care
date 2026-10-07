import { createTestDb } from '@/db/test-db';
import { remainingIds } from '@/features/routines/playerLogic';
import { chosenRoutine, getTodayRoutines, tickSteps } from '@/features/routines/repo';

import {
  doneTransition,
  expiredProducts,
  firstUnfinishedKey,
  greetingFor,
  sectionOrder,
  setupView,
} from './logic';
import { MON, TUE, seedProduct, seedRoutine } from './testUtils';

const at = (hour: number, minute = 0) => new Date(2026, 9, 6, hour, minute).getTime();

describe('greetingFor', () => {
  it('says good morning until 12:00, good afternoon until 18:00, good evening after', () => {
    expect(greetingFor(at(4))).toBe('morning');
    expect(greetingFor(at(11, 59))).toBe('morning');
    expect(greetingFor(at(12))).toBe('afternoon');
    expect(greetingFor(at(17, 59))).toBe('afternoon');
    expect(greetingFor(at(18))).toBe('evening');
    expect(greetingFor(at(23, 30))).toBe('evening');
  });

  it('keeps the evening greeting until the app day ends at 04:00', () => {
    expect(greetingFor(at(0, 30))).toBe('evening');
    expect(greetingFor(at(3, 59))).toBe('evening');
  });
});

describe('routine card helpers', () => {
  it('lists remaining steps, expired products once and the first unfinished card', () => {
    const db = createTestDb();
    const expired = seedProduct(db, { name: 'SPF 50 fluid', expiresAt: '2026-10-02' });
    const fine = seedProduct(db, { name: 'Serum', expiresAt: '2027-10-02' });
    const morning = seedRoutine(db, {
      name: 'Morning',
      timeOfDay: 'morning',
      steps: [expired, fine, expired],
    });
    seedRoutine(db, { name: 'Evening', steps: [null] });

    let groups = getTodayRoutines(db, MON, 30);
    const r = chosenRoutine(groups[0]!);
    expect(r.id).toBe(morning);
    expect(expiredProducts(r).map((p) => p.name)).toEqual(['SPF 50 fluid']);
    expect(firstUnfinishedKey(groups)).toBe('morning');

    tickSteps(db, morning, [r.steps[0]!.id], MON, true, r.progress.dueStepIds);
    groups = getTodayRoutines(db, MON, 30);
    expect(remainingIds(chosenRoutine(groups[0]!))).toEqual([r.steps[1]!.id, r.steps[2]!.id]);

    tickSteps(db, morning, remainingIds(chosenRoutine(groups[0]!)), MON, true, []);
    groups = getTodayRoutines(db, MON, 30);
    expect(groups[0]!.complete).toBe(true);
    expect(firstUnfinishedKey(groups)).toBe('evening');
  });

  it('shows the remembered pick, or the ticked option once started', () => {
    const db = createTestDb();
    const a = seedRoutine(db, { name: 'Evening A' });
    const b = seedRoutine(db, { name: 'Evening B' });
    const [group] = getTodayRoutines(db, TUE, 30);
    expect(group!.routines.map((x) => x.id)).toEqual([a, b]);
    expect(chosenRoutine(group!).id).toBe(a);
    expect(chosenRoutine({ ...group!, chosenId: b }).id).toBe(b);
  });
});

describe('setupView', () => {
  const none = { setupDoneAt: null, setupHiddenAt: null };

  it('opens the next step to do and counts the done ones', () => {
    const v = setupView({ product: 'Serum', routine: null, hair: null }, none, TUE);
    expect(v).toMatchObject({
      visible: true,
      mode: 'progress',
      done: 1,
      total: 3,
      next: 'routine',
    });
    expect(v.saveDoneAt).toBe(false);
    expect(setupView({ product: null, routine: 'R', hair: null }, none, TUE).next).toBe('product');
  });

  it("becomes You're set, saves the day, and is gone the next app day", () => {
    const all = { product: 'Serum', routine: 'Evening', hair: 'Wash' };
    expect(setupView(all, none, TUE)).toMatchObject({
      visible: true,
      mode: 'set',
      next: null,
      saveDoneAt: true,
    });
    const saved = { setupDoneAt: TUE, setupHiddenAt: null };
    expect(setupView(all, saved, TUE)).toMatchObject({ visible: true, saveDoneAt: false });
    expect(setupView(all, saved, '2026-10-07').visible).toBe(false);
  });

  it('is gone at once when hidden', () => {
    const hidden = { setupDoneAt: null, setupHiddenAt: TUE };
    const v = setupView({ product: null, routine: null, hair: null }, hidden, TUE);
    expect(v.visible).toBe(false);
    expect(v.saveDoneAt).toBe(false);
  });
});

describe('sectionOrder', () => {
  const all = { setup: false, routines: true, expiring: true, hair: true };

  it('puts Expiring soon under the routine cards while anything is expired', () => {
    expect(sectionOrder({ ...all, anyExpired: true })).toEqual([
      'routines',
      'expiring',
      'hair',
      'checkIn',
    ]);
  });

  it('puts Expiring soon after Hair due otherwise', () => {
    expect(sectionOrder({ ...all, anyExpired: false })).toEqual([
      'routines',
      'hair',
      'expiring',
      'checkIn',
    ]);
  });

  it('leaves out empty sections', () => {
    expect(
      sectionOrder({
        setup: true,
        routines: false,
        expiring: false,
        anyExpired: false,
        hair: false,
      }),
    ).toEqual(['setup', 'checkIn']);
  });
});

describe('doneTransition', () => {
  it('collapses in 250 ms, or fades in 100 ms with Reduce Motion', () => {
    expect(doneTransition(false)).toEqual({ kind: 'collapse', duration: 250 });
    expect(doneTransition(true)).toEqual({ kind: 'fade', duration: 100 });
  });
});
