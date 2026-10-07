import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strFromU8 } from 'fflate';

import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { pinService } from '@/features/security/pin';
import { getSettings, hasSettingsRow, saveSettings } from '@/features/settings/repo';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { i18n, setI18nLanguage } from '@/i18n';
import { createFakeOS } from '@/notifications/fakeOS';
import { setNotificationOS } from '@/notifications/scheduler';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { setBackupPlatform } from '../../api';
import { writeBackup } from '../../export';
import { createFakeBackupFiles } from '../../fakeFiles';
import { BackupScreen } from '../BackupScreen';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    canDismiss: jest.fn(() => false),
    dismissAll: jest.fn(),
  },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Error: 'error' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system', () => {
  class Directory {
    exists = false;
    delete() {}
  }
  return { Directory, File: jest.fn(), Paths: { document: { uri: 'file:///documents/' } } };
});
jest.mock('expo-crypto', () => {
  const nodeCrypto = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});
const mockSecure = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecure.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecure.delete(key);
  }),
}));
jest.mock('@/db/queryClient', () => {
  const actual = jest.requireActual('@/db/queryClient');
  return { ...actual, queryClient: actual.createQueryClient({ gcTime: Infinity }) };
});

const { router } = jest.requireMock<{
  router: Record<'push' | 'navigate' | 'replace', jest.Mock>;
}>('expo-router');

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

let files: ReturnType<typeof createFakeBackupFiles>;
let share: jest.Mock;
let pick: jest.Mock;

beforeEach(async () => {
  await setI18nLanguage('en');
  files = createFakeBackupFiles();
  share = jest.fn(async () => {});
  pick = jest.fn(async () => null);
  setBackupPlatform({ files, share, pick });
  setNotificationOS(createFakeOS());
  mockSecure.clear();
  jest.clearAllMocks();
});

afterEach(async () => {
  // Let the query layer's batched notifications land inside act before the screen unmounts.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
  setNotificationOS(null);
});

async function renderBackup(patch: Parameters<typeof saveSettings>[1] = {}) {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en', ...patch });
  await app.render(
    <>
      <BackupScreen />
      <PortalHost />
    </>,
  );
  // The photo storage query resolves right after the first render.
  await act(async () => {});
  return app;
}

/** A backup from another phone, written to the fake disk; returns its uri. */
async function backupFromAnotherPhone(exportedAt: number) {
  const other = createTestDb();
  saveSettings(other, { language: 'lt', currency: 'GBP' });
  other
    .insert(schema.product)
    .values([
      { name: 'Retinol serum', area: 'skin' },
      { name: 'Shampoo', area: 'hair' },
    ])
    .run();
  other.insert(schema.routine).values({ name: 'Evening', timeOfDay: 'evening' }).run();
  return writeBackup('json', { db: other, files, now: exportedAt });
}

describe('BackupScreen', () => {
  it('with no backup yet: says so, with the amber callout', async () => {
    await renderBackup();
    expect(screen.getByText('No backup yet')).toBeTruthy();
    expect(screen.getByTestId('backup-callout')).toBeTruthy();
    expect(screen.getByText("You haven't made a backup yet.")).toBeTruthy();
  });

  it('a recent backup has no callout', async () => {
    await renderBackup({ lastBackupAt: NOW - 2 * DAY });
    expect(screen.getByText(/^Last backup /)).toBeTruthy();
    expect(screen.queryByTestId('backup-callout')).toBeNull();
  });

  it('a backup older than 30 days gets the callout', async () => {
    await renderBackup({ lastBackupAt: NOW - 40 * DAY });
    expect(screen.getByText(/^Your last backup is from /)).toBeTruthy();
  });

  it('exports JSON through the share sheet and remembers the date', async () => {
    const app = await renderBackup();
    await fireEvent.press(screen.getByRole('button', { name: 'Export backup' }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const [uri, kind] = share.mock.calls[0] as [string, string];
    expect(kind).toBe('json');
    expect(uri).toMatch(/jx-care-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(strFromU8(files.disk.get(uri)!))).toMatchObject({ app: 'jx-care' });
    await waitFor(() => expect(getSettings(app.db).lastBackupAt).not.toBeNull());
    expect(await screen.findByText(/^Last backup /)).toBeTruthy();
    expect(screen.queryByTestId('backup-callout')).toBeNull();
  });

  it('offers a zip with photos, showing their count and size first', async () => {
    files.addPhoto('products/a.jpg', new Uint8Array(3000));
    files.addPhoto('progress/skin/2026-10-05/front-1.jpg', new Uint8Array(2 * 1024 * 1024));
    await renderBackup();
    const zip = await screen.findByRole('radio', {
      name: 'Zip with photos. All data and 2 photos, 2.0 MB',
    });
    expect(
      screen.getByRole('radio', { name: /^JSON file\. .*Photos are not included/ }),
    ).toBeTruthy();
    await fireEvent.press(zip);
    await fireEvent.press(screen.getByRole('button', { name: 'Export backup' }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0]![1]).toBe('zip');
    expect(await screen.findByText(/^Last backup /)).toBeTruthy();
    expect(screen.getByText('Storage used by photos')).toBeTruthy();
  });

  it('imports: preview counts, then Replace all data with a dialog, then Today', async () => {
    const exportedAt = new Date(2026, 8, 1, 12).getTime();
    const uri = await backupFromAnotherPhone(exportedAt);
    pick.mockResolvedValue(uri);
    const app = await renderBackup();
    app.db.insert(schema.product).values({ name: 'Old product', area: 'skin' }).run();

    await fireEvent.press(screen.getByRole('button', { name: 'Import backup' }));
    expect(await screen.findByText('Backup from 1 Sep')).toBeTruthy();
    expect(screen.getByText('2 products, 1 routine, 0 photos')).toBeTruthy();
    expect(screen.getByText('Photos are not included in this file.')).toBeTruthy();
    // Nothing changed yet.
    expect(
      app.db
        .select()
        .from(schema.product)
        .all()
        .map((p) => p.name),
    ).toEqual(['Old product']);

    await fireEvent.press(screen.getByRole('button', { name: 'Replace all data' }));
    expect(await screen.findByText('Replace all data?')).toBeTruthy();
    expect(
      screen.getByText(
        "This replaces everything on this phone with the backup from 1 Sep. This can't be undone.",
      ),
    ).toBeTruthy();
    const buttons = screen.getAllByRole('button', { name: 'Replace all data' });
    await fireEvent.press(buttons[buttons.length - 1]!);

    await waitFor(() => expect(router.navigate).toHaveBeenCalledWith('/'));
    expect(
      getDb()
        .select()
        .from(schema.product)
        .all()
        .map((p) => p.name),
    ).toEqual(['Retinol serum', 'Shampoo']);
    expect(getSettings(getDb())).toMatchObject({ currency: 'GBP', lastBackupAt: exportedAt });
    // The restored language applies at once; the toast is in it.
    expect(i18n.language).toBe('lt');
    expect(uiStore.state.toasts.map((t) => t.message)).toEqual(['Atsarginė kopija atkurta']);
  });

  it('a file that is not a backup shows why, and changes nothing', async () => {
    files.disk.set('file:///cache/notes.json', new TextEncoder().encode('{"hello":1}'));
    pick.mockResolvedValue('file:///cache/notes.json');
    await renderBackup();
    await fireEvent.press(screen.getByRole('button', { name: 'Import backup' }));
    expect(
      await screen.findByText(
        "This file isn't a Jx-Care backup. Pick the JSON or zip file you exported.",
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId('backup-preview')).toBeNull();
  });

  it('a backup from a newer app is refused with its own message', async () => {
    const uri = await backupFromAnotherPhone(NOW);
    const file = JSON.parse(strFromU8(files.disk.get(uri)!)) as Record<string, unknown>;
    files.disk.set(uri, new TextEncoder().encode(JSON.stringify({ ...file, formatVersion: 2 })));
    pick.mockResolvedValue(uri);
    await renderBackup();
    await fireEvent.press(screen.getByRole('button', { name: 'Import backup' }));
    expect(
      await screen.findByText(
        'This backup is from a newer version of Jx-Care. Update the app first.',
      ),
    ).toBeTruthy();
  });

  it('a cancelled picker does nothing', async () => {
    await renderBackup();
    await fireEvent.press(screen.getByRole('button', { name: 'Import backup' }));
    await act(async () => {});
    expect(pick).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('backup-preview')).toBeNull();
  });
});

describe('Reset app from Settings', () => {
  it('asks for the PIN, offers Export backup, needs RESET and wipes everything', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en' });
    app.db.insert(schema.product).values({ name: 'Serum', area: 'skin' }).run();
    app.db.insert(schema.routine).values({ name: 'Morning', timeOfDay: 'morning' }).run();
    await pinService.completeOnboarding({
      pin: '2580',
      question: { kind: 'preset', id: 'first_pet' },
      answer: 'Rex',
    });
    await app.render(
      <>
        <SettingsScreen />
        <PortalHost />
      </>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Reset app' }));
    expect(await screen.findByText('Enter your PIN')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('PIN'), '2580');
    expect(await screen.findByText('Reset app and delete all data?')).toBeTruthy();
    expect(
      screen.getByText(
        "This deletes 1 product, 1 routine and 0 progress photos. This can't be undone.",
      ),
    ).toBeTruthy();

    // Export backup goes to Backup and restore.
    await fireEvent.press(screen.getByRole('button', { name: 'Export backup' }));
    expect(router.push).toHaveBeenCalledWith('/settings/backup');

    // Open again: the PIN is asked again, then RESET.
    await fireEvent.press(screen.getByRole('button', { name: 'Reset app' }));
    await fireEvent.changeText(await screen.findByLabelText('PIN'), '2580');
    await fireEvent.changeText(await screen.findByLabelText('Type RESET to confirm'), 'RESET');
    const actions = screen.getAllByRole('button', { name: 'Reset app' });
    await fireEvent.press(actions[actions.length - 1]!);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/welcome'));
    expect(app.db.select().from(schema.product).all()).toEqual([]);
    expect(app.db.select().from(schema.routine).all()).toEqual([]);
    expect(hasSettingsRow(app.db)).toBe(false);
    expect(mockSecure.size).toBe(0);
  });
});
