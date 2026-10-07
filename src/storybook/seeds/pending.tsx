import type { Decorator } from '@storybook/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

function PendingData({ children }: { children: ReactNode }) {
  // Queries that never run stay pending, so the story keeps its loading skeleton.
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { enabled: false, retry: 0 } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Story decorator for the loading state: every query under it stays pending (none of them run),
 * so screens and sections show their skeletons. Put it before `withAppData` when the story also
 * needs the fixed day: `decorators: [withPendingData(), withAppData({ seed: seedEmpty })]`.
 */
export function withPendingData(): Decorator {
  return (Story) => (
    <PendingData>
      <Story />
    </PendingData>
  );
}
