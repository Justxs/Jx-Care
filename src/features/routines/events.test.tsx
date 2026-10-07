import { act } from '@testing-library/react-native';

import { MON, seedRoutine } from '@/features/today/testUtils';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { useTickStep } from './api';
import * as events from './events';
import { getRoutineDay } from './repo';

afterEach(() => jest.restoreAllMocks());

describe('onRoutineCompleted', () => {
  it('is called each time a tick (player or All done on Today) makes a routine complete', async () => {
    const completed = jest.spyOn(events, 'onRoutineCompleted');
    const app = setupTestApp();
    appStore.setState((s) => ({ ...s, activeDay: MON }));
    const id = seedRoutine(app.db, { name: 'Evening', steps: [null, null] });
    const due = getRoutineDay(app.db, id, MON, 30)!.progress.dueStepIds;
    const { result } = await app.renderHook(() => useTickStep());
    const tick = (stepIds: number[], done: boolean) =>
      act(async () => {
        await result.current.mutateAsync({
          routineId: id,
          stepIds,
          day: MON,
          done,
          dueStepIds: due,
        });
      });

    await tick([due[0]!], true);
    expect(completed).not.toHaveBeenCalled();

    // All done on Today ticks the rest at once.
    await tick([due[1]!], true);
    expect(completed).toHaveBeenCalledTimes(1);
    expect(completed).toHaveBeenLastCalledWith(id, MON);

    // Ticking again while complete changes nothing; unticking and finishing again counts again.
    await tick([due[1]!], true);
    expect(completed).toHaveBeenCalledTimes(1);
    await tick([due[1]!], false);
    await tick([due[1]!], true);
    expect(completed).toHaveBeenCalledTimes(2);
  });
});
