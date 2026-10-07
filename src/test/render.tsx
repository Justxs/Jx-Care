import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { setDb } from '@/db';
import { createQueryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import { createTestDb } from '@/db/test-db';
import { getSettings } from '@/features/settings/repo';

/** A fresh test database and query client, wired up the way the app does it. */
export function setupTestApp() {
  const db = createTestDb();
  setDb(db);
  // No garbage-collection timers in tests, so Jest can exit cleanly.
  const client = createQueryClient({ gcTime: Infinity });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    db,
    client,
    wrapper,
    /** Renders like the app does after boot: the settings query is already filled. */
    render: (ui: ReactElement) => {
      client.setQueryData(qk.settings, getSettings(db));
      return render(ui, { wrapper });
    },
    renderHook: <R,>(hook: () => R) => renderHook(hook, { wrapper }),
  };
}
