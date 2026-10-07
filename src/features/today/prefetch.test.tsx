import { saveSettings } from '@/features/settings/repo';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { todayQueries, useToday } from './api';
import { prefetchToday } from './prefetch';
import { MON, seedProduct, seedRoutine } from './testUtils';

describe('prefetchToday', () => {
  it('fills every query Today reads, so its first frame has every section', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en', expiryWarnDays: 14 });
    appStore.setState((s) => ({ ...s, activeDay: MON }));
    const spf = seedProduct(app.db, { name: 'SPF 50 fluid', expiresAt: '2026-10-02' });
    seedRoutine(app.db, { name: 'Morning', timeOfDay: 'morning', steps: [spf] });

    await prefetchToday(app.client, MON);

    // Every query is cached under the key the hooks read (warning window from settings).
    for (const q of Object.values(todayQueries(MON, 14))) {
      expect(app.client.getQueryData(q.queryKey)).toBeDefined();
    }

    // The very first render already has every part, so no section shows a skeleton.
    const { result } = await app.renderHook(() => useToday());
    const first = result.current;
    expect(first.settings?.expiryWarnDays).toBe(14);
    expect(first.setup).toEqual({ product: 'SPF 50 fluid', routine: 'Morning', hair: null });
    expect(first.groups).toHaveLength(1);
    expect(first.skinStreak).toEqual({ current: 0, best: 0 });
    expect(first.expiring?.map((p) => p.name)).toEqual(['SPF 50 fluid']);
    expect(first.anyExpired).toBe(true);
  });
});
