import { act, render, screen, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';

import { createTestDb } from '@/db/test-db';
import { setI18nLanguage } from '@/i18n';
import { dismissToast, uiStore } from '@/state/ui';

import { setStoryDbFactory } from '../appData';
import { composeStory, storyEntries, type CsfMeta } from '../compose';
import { storyDecorators, storyQueryClient } from '../decorators';

/**
 * Smoke test for every story under src/: each one renders with its args, decorators and data,
 * and no query fails. Mocks are the ones screen tests use; add one here when a new story needs it.
 */

// Screens get the story stand-ins (params from the story, navigation logged, not followed).
jest.mock('expo-router', () => require('@/storybook/router').storyExpoRouterMock());
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// PIN hashing for the in-memory secure storage of the lock and onboarding stories
// (src/storybook/seeds/settings.tsx): the same node crypto stand-in the security tests use.
jest.mock('expo-crypto', () => {
  const nodeCrypto = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});

// No camera in Jest: the Progress camera stories show the permission-refused screen.
jest.mock('expo-camera', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const permission = { granted: false, status: 'denied', canAskAgain: false, expires: 'never' };
  return {
    CameraView: View,
    useCameraPermissions: () => [permission, jest.fn(() => Promise.resolve(permission))],
  };
});

const SRC = path.resolve(__dirname, '../..');

function findStoryFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : findStoryFiles(full);
    return /\.stories\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const files = findStoryFiles(SRC).sort();

setStoryDbFactory(() => {
  const db = createTestDb();
  return { db, close: () => db.$client.close() };
});

beforeEach(async () => {
  await setI18nLanguage('en');
  uiStore.setState((s) => ({ ...s, toasts: [] }));
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

it('finds the story files', () => {
  expect(files.length).toBeGreaterThan(0);
});

describe.each(files.map((file) => [path.relative(SRC, file), file]))('%s', (_name, file) => {
  const mod = require(file) as Record<string, unknown> & { default: CsfMeta };
  const stories = storyEntries(mod);

  it('has a title and at least one story', () => {
    expect(mod.default?.title).toEqual(expect.any(String));
    expect(stories.length).toBeGreaterThan(0);
  });

  it.each(stories)('%s renders', async (exportName, story) => {
    const Story = composeStory(mod.default, story, exportName, storyDecorators);
    const view = await render(<Story />);
    // Stories with app data show a placeholder until the database is seeded.
    await waitFor(() => expect(screen.queryByTestId('story-data-loading')).toBeNull());
    await act(() => new Promise<void>((r) => setTimeout(r, 0)));
    expect(view.toJSON()).not.toBeNull();

    const failed = (storyQueryClient()?.getQueryCache().getAll() ?? []).filter(
      (q) => q.state.status === 'error',
    );
    expect(failed.map((q) => `${JSON.stringify(q.queryKey)}: ${String(q.state.error)}`)).toEqual(
      [],
    );
    await view.unmount();
  });
});
