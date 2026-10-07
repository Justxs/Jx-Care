import { act, waitFor } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';

import { routine } from '@/db/schema';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import {
  applyTickToGroups,
  useDuplicateRoutine,
  useRoutines,
  useSaveRoutine,
  useSkinStreak,
  useTickStep,
  useTodayRoutines,
} from './api';
import * as repo from './repo';
import type { SaveRoutineInput } from './repo';

const MON = '2026-10-05';

const input = (over: Partial<SaveRoutineInput> = {}): SaveRoutineInput => ({
  name: 'Evening',
  timeOfDay: 'evening',
  customName: null,
  sortTime: '21:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  reminderTime: null,
  steps: [1, 2].map(() => ({
    id: null,
    productId: null,
    note: null,
    scheduleKind: 'always' as const,
    daysOfWeek: null,
    everyNDays: null,
    startDate: null,
    waitSeconds: 0,
  })),
  ...over,
});

function setup() {
  const app = setupTestApp();
  appStore.setState((s) => ({ ...s, activeDay: MON }));
  const id = repo.saveRoutine(app.db, input());
  app.db
    .update(routine)
    .set({ createdAt: new Date(2026, 0, 1, 12).getTime() })
    .where(eq(routine.id, id))
    .run();
  return { ...app, id };
}

afterEach(() => jest.restoreAllMocks());

describe('useTickStep', () => {
  it('shows the tick in the cache before it is saved, then completes the routine', async () => {
    const app = setup();
    const { result } = await app.renderHook(() => ({
      today: useTodayRoutines(),
      streak: useSkinStreak(),
      tick: useTickStep(),
    }));
    await waitFor(() => expect(result.current.today.data).toHaveLength(1));
    expect(result.current.streak.data).toEqual({ current: 0, best: 0 });
    const r = result.current.today.data![0]!.routines[0]!;
    const due = r.progress.dueStepIds;

    let doneWhenSaving = -1;
    const save = repo.tickSteps;
    jest.spyOn(repo, 'tickSteps').mockImplementation((...args) => {
      const [groups] = app.client
        .getQueriesData<repo.TodayRoutineGroup[]>({ queryKey: ['today', MON, 'routines'] })
        .map(([, data]) => data);
      doneWhenSaving = groups![0]!.routines[0]!.progress.done;
      return save(...args);
    });

    await act(async () => {
      await result.current.tick.mutateAsync({
        routineId: r.id,
        stepIds: due,
        day: MON,
        done: true,
        dueStepIds: due,
      });
    });
    expect(doneWhenSaving).toBe(2);
    await waitFor(() => expect(result.current.today.data![0]!.complete).toBe(true));
    expect(repo.getDayLog(app.db, r.id, MON)!.completedAt).not.toBeNull();
    await waitFor(() => expect(result.current.streak.data?.current).toBe(1));
  });

  it('rolls the cache back when saving fails', async () => {
    const app = setup();
    const { result } = await app.renderHook(() => ({
      today: useTodayRoutines(),
      tick: useTickStep(),
    }));
    await waitFor(() => expect(result.current.today.data).toHaveLength(1));
    const r = result.current.today.data![0]!.routines[0]!;
    jest.spyOn(repo, 'tickSteps').mockImplementation(() => {
      throw new Error('disk full');
    });
    jest.spyOn(repo, 'getTodayRoutines').mockImplementation(() => {
      throw new Error('disk full');
    });

    await act(async () => {
      await result.current.tick
        .mutateAsync({
          routineId: r.id,
          stepIds: [r.steps[0]!.id],
          day: MON,
          done: true,
          dueStepIds: r.progress.dueStepIds,
        })
        .catch(() => {});
    });
    expect(result.current.tick.isError).toBe(true);
    expect(result.current.today.data![0]!.routines[0]!.progress.done).toBe(0);
    expect(repo.getDayLog(app.db, r.id, MON)).toBeNull();
  });
});

describe('applyTickToGroups', () => {
  it('ticks, fixes the A/B choice to the started routine and unticks again', () => {
    const app = setup();
    const b = repo.saveRoutine(app.db, input({ name: 'Evening B' }));
    app.db
      .update(routine)
      .set({ createdAt: new Date(2026, 0, 1, 12).getTime() })
      .where(eq(routine.id, b))
      .run();
    const groups = repo.getTodayRoutines(app.db, MON, 30);
    expect(groups[0]!.chosenId).toBe(app.id);
    const rb = groups[0]!.routines[1]!;
    const vars = {
      routineId: b,
      stepIds: [rb.steps[0]!.id],
      day: MON,
      done: true,
      dueStepIds: rb.progress.dueStepIds,
    };
    const ticked = applyTickToGroups(groups, vars, 42)[0]!;
    expect(ticked).toMatchObject({ chosenId: b, started: true, complete: false });
    expect(ticked.routines[1]!.progress.done).toBe(1);

    const all = applyTickToGroups([ticked], { ...vars, stepIds: rb.progress.dueStepIds }, 43)[0]!;
    expect(all.complete).toBe(true);
    expect(all.routines[1]!.log!.completedAt).toBe(43);

    const undone = applyTickToGroups([all], { ...vars, done: false }, 44)[0]!;
    expect(undone.complete).toBe(false);
    expect(undone.routines[1]!.log!.completedAt).toBeNull();
    // Other routines are untouched.
    expect(undone.routines[0]).toBe(groups[0]!.routines[0]);
  });
});

describe('routine mutations', () => {
  it('saves and duplicates, refreshing the list', async () => {
    const app = setup();
    const { result } = await app.renderHook(() => ({
      list: useRoutines(),
      save: useSaveRoutine(),
      duplicate: useDuplicateRoutine(),
    }));
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));
    await act(async () => {
      await result.current.save.mutateAsync(input({ name: 'Morning', timeOfDay: 'morning' }));
    });
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
    await act(async () => {
      await result.current.duplicate.mutateAsync(app.id);
    });
    await waitFor(() =>
      expect(result.current.list.data?.map((r) => r.name)).toContain('Evening (copy)'),
    );
  });
});
