import { setupTestApp } from '@/test/render';
import { getSettings, saveSettings } from '@/features/settings/repo';
import { i18n } from '@/i18n';

import { appStore, refreshActiveDay, setLanguage, startDayClock } from './app';
import { dismissToast, setScreenReaderOn, showToast, uiStore } from './ui';

describe('uiStore toasts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    for (const t of uiStore.state.toasts) dismissToast(t.id);
    setScreenReaderOn(false);
  });
  afterEach(() => jest.useRealTimers());

  it('drops a toast after 8 s', () => {
    showToast({ message: 'Vitamin C serum moved to Archive', actionLabel: 'Undo' });
    expect(uiStore.state.toasts).toHaveLength(1);
    jest.advanceTimersByTime(7999);
    expect(uiStore.state.toasts).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(uiStore.state.toasts).toHaveLength(0);
  });

  it('keeps a toast while a screen reader is on until dismissed or replaced', () => {
    setScreenReaderOn(true);
    const first = showToast({ message: 'First' });
    jest.advanceTimersByTime(60_000);
    expect(uiStore.state.toasts.map((t) => t.message)).toEqual(['First']);
    showToast({ message: 'Second' });
    expect(uiStore.state.toasts.map((t) => t.message)).toEqual(['Second']);
    dismissToast(first);
    expect(uiStore.state.toasts).toHaveLength(1);
    dismissToast(uiStore.state.toasts[0]!.id);
    expect(uiStore.state.toasts).toHaveLength(0);
  });
});

describe('activeDay', () => {
  afterEach(() => jest.useRealTimers());

  it('changes from one app day to the next at 04:00', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 6, 23, 0));
    const stop = startDayClock();
    expect(appStore.state.activeDay).toBe('2026-10-06');
    jest.advanceTimersByTime(4 * 60 * 60 * 1000 + 59 * 60 * 1000); // 03:59
    expect(appStore.state.activeDay).toBe('2026-10-06');
    jest.advanceTimersByTime(60 * 1000 + 1000); // past 04:00
    expect(appStore.state.activeDay).toBe('2026-10-07');
    stop();
  });

  it('refreshes on demand', () => {
    expect(refreshActiveDay(new Date(2026, 0, 2, 12).getTime())).toBe('2026-01-02');
    expect(appStore.state.activeDay).toBe('2026-01-02');
  });
});

describe('setLanguage', () => {
  it('switches i18next and persists once the settings row exists', async () => {
    const app = setupTestApp();
    await setLanguage('lt');
    expect(appStore.state.language).toBe('lt');
    expect(i18n.language).toBe('lt');
    // No row yet (onboarding not finished): nothing is saved.
    expect(getSettings(app.db).language).toBe('en');

    saveSettings(app.db, { language: 'lt' });
    await setLanguage('en');
    expect(getSettings(app.db).language).toBe('en');
    expect(i18n.language).toBe('en');
  });
});
