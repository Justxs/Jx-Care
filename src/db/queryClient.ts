import { QueryClient } from '@tanstack/react-query';

/** Defaults for a local database: data only changes through our own mutations. */
export function createQueryClient(opts: { gcTime?: number } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: opts.gcTime ?? 30 * 60 * 1000,
        retry: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        networkMode: 'always',
      },
      mutations: { retry: 0, networkMode: 'always', gcTime: opts.gcTime ?? 5 * 60 * 1000 },
    },
  });
}

export const queryClient = createQueryClient();
