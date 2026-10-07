import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { AppState, type AppStateStatus } from 'react-native';

import { useWaitTimer } from './useWaitTimer';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const START = new Date(2026, 9, 5, 21, 0, 0).getTime();

let appStateListeners: ((state: AppStateStatus) => void)[] = [];

beforeEach(() => {
  jest.useFakeTimers({ now: START });
  appStateListeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListeners.push(listener as (state: AppStateStatus) => void);
    return {
      remove: () => {
        appStateListeners = appStateListeners.filter((l) => l !== listener);
      },
    } as ReturnType<typeof AppState.addEventListener>;
  });
  jest.mocked(Haptics.impactAsync).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useWaitTimer', () => {
  it('counts down from the end time and ends with a light haptic', async () => {
    const { result } = await renderHook(() => useWaitTimer());
    expect(result.current.stepId).toBeNull();
    expect(result.current.remaining).toBe(0);

    await act(async () => result.current.start(60, 7));
    expect(result.current.stepId).toBe(7);
    expect(result.current.remaining).toBe(60);

    await act(async () => jest.advanceTimersByTime(18_000));
    expect(result.current.remaining).toBe(42);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTime(42_000));
    expect(result.current.stepId).toBeNull();
    expect(result.current.remaining).toBe(0);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('is right after the app comes back from the background', async () => {
    const { result } = await renderHook(() => useWaitTimer());
    await act(async () => result.current.start(60, 1));

    // In the background no timer runs, but the clock moves on.
    await act(async () => {
      jest.setSystemTime(START + 45_000);
      for (const listener of appStateListeners) listener('active');
    });
    expect(result.current.remaining).toBe(15);

    // Back after the end: it ends at once.
    await act(async () => {
      jest.setSystemTime(START + 90_000);
      for (const listener of appStateListeners) listener('active');
    });
    expect(result.current.stepId).toBeNull();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('stops on Skip wait without a haptic, and a new start replaces the wait', async () => {
    const { result } = await renderHook(() => useWaitTimer());
    await act(async () => result.current.start(30, 1));
    await act(async () => result.current.start(120, 2));
    expect(result.current.stepId).toBe(2);
    expect(result.current.remaining).toBe(120);

    await act(async () => result.current.stop());
    expect(result.current.stepId).toBeNull();
    await act(async () => jest.advanceTimersByTime(200_000));
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    // Nothing is left listening once the wait is over.
    expect(appStateListeners).toHaveLength(0);
  });
});
