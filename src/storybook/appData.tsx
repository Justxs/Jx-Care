import type { Decorator } from '@storybook/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { getDb, setDb, type Db } from '@/db';
import { qk } from '@/db/queryKeys';
import { getSettings } from '@/features/settings/repo';
import { appStore } from '@/state/app';

import { FIXTURE_TODAY } from './fixtures';
import { StoryRouteProvider, type StoryParams } from './router';

/** A fresh database with every migration applied, and how to let it go. */
export type StoryDb = { db: Db; close?: () => void };
export type StoryDbFactory = () => StoryDb | Promise<StoryDb>;

let dbFactory: StoryDbFactory | null = null;

/**
 * Where story databases come from: expo-sqlite in memory on the device (.rnstorybook/preview.tsx),
 * `createTestDb()` in Jest (src/storybook/__tests__/stories.test.tsx).
 */
export function setStoryDbFactory(factory: StoryDbFactory): void {
  dbFactory = factory;
}

export type Seed = (db: Db, today: string) => void;

export type AppDataOptions = {
  /** Fills the fresh database through the repo functions (see ./fixtures). Default: nothing. */
  seed?: Seed;
  /** What `useLocalSearchParams()` returns, e.g. `{ id: String(demoIds.products.retinol) }`. */
  params?: StoryParams;
  /** The app day the story runs on. Default `FIXTURE_TODAY`. */
  today?: string;
};

function currentDb(): Db | null {
  try {
    return getDb();
  } catch {
    return null;
  }
}

function AppData({
  seed,
  params,
  today = FIXTURE_TODAY,
  children,
}: AppDataOptions & { children: ReactNode }) {
  const client = useQueryClient();
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  // Set up once per story (the shell remounts for every story), with the options it started with.
  const [setup] = useState(() => ({ seed, today }));

  useEffect(() => {
    let cancelled = false;
    let handle: StoryDb | null = null;
    const previousDb = currentDb();
    const previousDay = appStore.state.activeDay;

    const start = async () => {
      if (!dbFactory) throw new Error('No story database; call setStoryDbFactory() first');
      const made = await dbFactory();
      if (cancelled) {
        made.close?.();
        return;
      }
      handle = made;
      setDb(made.db);
      setup.seed?.(made.db, setup.today);
      appStore.setState((s) => ({ ...s, activeDay: setup.today }));
      client.clear();
      // As after boot in the app: the settings query is already filled.
      client.setQueryData(qk.settings, getSettings(made.db));
      setReady(true);
    };
    start().catch((error: unknown) => {
      if (!cancelled) setFailure({ error });
    });

    return () => {
      cancelled = true;
      // Leaving Storybook hands the app its own database and day back.
      if (previousDb) setDb(previousDb);
      appStore.setState((s) => ({ ...s, activeDay: previousDay }));
      handle?.close?.();
    };
  }, [client, setup]);

  // A broken seed or migration fails the story (and the smoke test) with the real error.
  if (failure) throw failure.error;
  if (!ready) return <View testID="story-data-loading" className="flex-1 bg-canvas" />;
  return <StoryRouteProvider params={params}>{children}</StoryRouteProvider>;
}

/**
 * For screens and data-bound components: a fresh in-memory database with every migration, seeded,
 * set as the app database, `activeDay` on a fixed day and the settings query filled. Shows nothing
 * until the data is ready. Use with `parameters: { layout: 'fullscreen' }` for screens.
 *
 *   decorators: [withAppData({ seed: seedDemo, params: { id: String(demoIds.products.retinol) } })]
 */
export function withAppData(options: AppDataOptions = {}): Decorator {
  return (Story) => (
    <AppData {...options}>
      <Story />
    </AppData>
  );
}
