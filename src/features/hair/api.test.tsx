import { act, waitFor } from '@testing-library/react-native';

import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import {
  useDeleteHairLog,
  useDeleteHairTask,
  useHairDueToday,
  useHairLogsOnDay,
  useHairMonth,
  useHairStreak,
  useHairTask,
  useHairTasks,
  useHasHairTask,
  useMarkHairDone,
  useQuickHairSetup,
  useSaveHairTask,
} from './api';

const TODAY = '2026-10-07';

beforeEach(() => {
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
});

describe('hair hooks', () => {
  it('quick setup, mark done and delete the log refresh the lists, month and streak', async () => {
    const app = setupTestApp();
    const { result } = await app.renderHook(() => ({
      tasks: useHairTasks(),
      any: useHasHairTask(),
      due: useHairDueToday(),
      streak: useHairStreak(),
      month: useHairMonth('2026-10'),
      day: useHairLogsOnDay(TODAY),
      setup: useQuickHairSetup(),
      markDone: useMarkHairDone(),
      deleteLog: useDeleteHairLog(),
    }));
    await waitFor(() => expect(result.current.any.data).toBe(false));

    await act(async () => {
      await result.current.setup.mutateAsync({
        frequency: 'every_3_days',
        lastWash: '2026-10-04',
        trim: true,
      });
    });
    await waitFor(() => expect(result.current.tasks.data?.washes).toHaveLength(1));
    expect(result.current.any.data).toBe(true);
    expect(result.current.tasks.data?.washes[0]?.name).toBe('Wash');
    expect(result.current.tasks.data?.other[0]?.name).toBe('Trim');
    await waitFor(() => expect(result.current.due.data).toHaveLength(1));
    expect(result.current.month.data?.[TODAY]?.washDue).toBe(true);

    const washId = result.current.tasks.data?.washes[0]?.id as number;
    let nextDue = '';
    await act(async () => {
      ({ nextDue } = await result.current.markDone.mutateAsync({
        taskId: washId,
        day: TODAY,
        productIds: [],
        note: null,
      }));
    });
    expect(nextDue).toBe('2026-10-10');
    await waitFor(() => expect(result.current.due.data).toEqual([]));
    await waitFor(() => expect(result.current.streak.data).toEqual({ current: 1, best: 1 }));
    await waitFor(() => expect(result.current.day.data).toHaveLength(1));
    expect(result.current.month.data?.[TODAY]?.washDone).toBe(true);

    const logId = result.current.day.data?.[0]?.id as number;
    await act(async () => {
      await result.current.deleteLog.mutateAsync(logId);
    });
    await waitFor(() => expect(result.current.day.data).toEqual([]));
    await waitFor(() => expect(result.current.due.data).toHaveLength(1));
    expect(result.current.tasks.data?.washes[0]?.lastDoneAt).toBe('2026-10-04');
  });

  it('saves, reads and deletes one task', async () => {
    const app = setupTestApp();
    const save = await app.renderHook(() => useSaveHairTask());
    let id = 0;
    await act(async () => {
      id = await save.result.current.mutateAsync({
        input: {
          name: 'Hair mask',
          kind: 'other',
          otherKind: 'mask',
          productIds: [],
          scheduleKind: 'interval',
          everyNDays: 14,
          intervalUnit: 'weeks',
          daysOfWeek: null,
          lastDoneAt: TODAY,
          reminderTime: '20:00',
        },
      });
    });
    const { result } = await app.renderHook(() => ({
      task: useHairTask(id),
      remove: useDeleteHairTask(),
    }));
    await waitFor(() => expect(result.current.task.data?.nextDue).toBe('2026-10-21'));

    await act(async () => {
      await result.current.remove.mutateAsync(id);
    });
    await waitFor(() => expect(result.current.task.data).toBeNull());
  });
});
