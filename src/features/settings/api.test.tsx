import { act, waitFor } from '@testing-library/react-native';

import { setupTestApp } from '@/test/render';

import { useSettings, useUpdateSettings } from './api';

describe('settings hooks', () => {
  it('returns defaults, then saved values after an update', async () => {
    const app = setupTestApp();
    const { result } = await app.renderHook(() => ({
      settings: useSettings(),
      update: useUpdateSettings(),
    }));
    await waitFor(() => expect(result.current.settings.data).toBeDefined());
    expect(result.current.settings.data?.currency).toBe('EUR');

    await act(async () => {
      await result.current.update.mutateAsync({ currency: 'GBP', expiryWarnDays: 7 });
    });
    await waitFor(() => expect(result.current.settings.data?.currency).toBe('GBP'));
    expect(result.current.settings.data?.expiryWarnDays).toBe(7);
  });
});
