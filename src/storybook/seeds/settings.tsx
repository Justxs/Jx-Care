/**
 * Story data and phone stand-ins for Settings, security, onboarding, conflicts and backup.
 *
 * Seeds write through the repo functions, like ../fixtures. `withPhoneSandbox` keeps a story off
 * the phone itself: the PIN, recovery answer and lockouts go to an in-memory secure store (written
 * through `pinService`, so the stored format is always the real one), notifications to an
 * in-memory scheduler, and backups to an in-memory file system.
 */
import { useQueryClient } from '@tanstack/react-query';
import { sql } from 'drizzle-orm';
import type { Decorator } from '@storybook/react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { getDb, type Db } from '@/db';
import { qk } from '@/db/queryKeys';
import { setBackupPlatform, type BackupPlatform } from '@/features/backup/api';
import { writeBackup } from '@/features/backup/export';
import { createFakeBackupFiles } from '@/features/backup/fakeFiles';
import { backupFiles } from '@/features/backup/files';
import { pickBackupFile, shareBackup } from '@/features/backup/platform';
import { addAvoidIngredientByName } from '@/features/conflicts/avoidRepo';
import { listIngredients, saveRule } from '@/features/conflicts/repo';
import { clearDraft } from '@/features/onboarding/draft';
import { createProduct } from '@/features/products/repo';
import { pinService, type PinService, type RecoveryQuestion } from '@/features/security/pin';
import { createMemoryKV, secureKV } from '@/features/security/secureStore';
import { saveSettings } from '@/features/settings/repo';
import { addDays, momentOf } from '@/lib/appDay';
import { getNotificationOS, setNotificationOS } from '@/notifications/scheduler';
import type { NotificationOS, OsNotificationRequest, PermissionState } from '@/notifications/types';
import { appStore } from '@/state/app';
import { lockStore } from '@/state/lock';

import type { Seed } from '../appData';
import { seedDemo, seedEmpty } from '../fixtures';

/** A moment `days` before the story's day, in the evening. */
const daysBefore = (today: string, days: number) => momentOf(addDays(today, -days), '20:00');

// ─── Secure storage ─────────────────────────────────────────────────────────

/** The PIN every lock story accepts. */
export const STORY_PIN = '2580';
/** The recovery answer every Forgot PIN story accepts (any case, accents, spaces). */
export const STORY_ANSWER = 'Rex';

const presetQuestion: RecoveryQuestion = { kind: 'preset', id: 'first_pet' };

/** Fills the story's in-memory secure storage through `pinService`. */
export type SecureSeed = (service: PinService) => Promise<void>;

/** PIN 2580; recovery question "first pet", answer "Rex". */
export const pinSet: SecureSeed = (service) =>
  service.completeOnboarding({ pin: STORY_PIN, question: presetQuestion, answer: STORY_ANSWER });

/** PIN 2580 and no recovery question (an old install): Forgot PIN can only offer Reset app. */
export const pinOnly: SecureSeed = (service) => service.setPin(STORY_PIN);

/** As `pinSet`, with a long question of the person's own in Lithuanian. */
export const pinSetLongQuestion: SecureSeed = (service) =>
  service.completeOnboarding({
    pin: STORY_PIN,
    question: {
      kind: 'custom',
      text: 'Kaip vadinosi kaimynų šuniukas, su kuriuo vaikystėje vaikščiodavome prie ežero?',
    },
    answer: STORY_ANSWER,
  });

async function wrongPins(service: PinService, times: number, now: number): Promise<void> {
  for (let i = 0; i < times; i++) await service.verifyPin('0000', now);
}

/** `pinSet`, then 5 wrong PINs: the keypad is locked for 30 s. */
export const pinLockedShort: SecureSeed = async (service) => {
  await pinSet(service);
  await wrongPins(service, 5, Date.now());
};

/** `pinSet`, then 10 wrong PINs: the keypad is locked for 5 min ("Try again in 4:59"). */
export const pinLockedLong: SecureSeed = async (service) => {
  await pinSet(service);
  // The first five ran a minute ago, so their 30 s lockout is over and the next five count.
  await wrongPins(service, 5, Date.now() - 60_000);
  await wrongPins(service, 5, Date.now());
};

/** `pinSet`, then 5 wrong recovery answers: the answer field is locked for 15 min. */
export const recoveryLocked: SecureSeed = async (service) => {
  await pinSet(service);
  const now = Date.now();
  for (let i = 0; i < 5; i++) await service.verifyRecoveryAnswer('wrong', now);
};

// ─── Notifications ──────────────────────────────────────────────────────────

/** A scheduler that keeps notifications in memory instead of on the phone. */
function memoryNotificationOS(permission: PermissionState): NotificationOS {
  const pending = new Map<string, OsNotificationRequest>();
  return {
    schedule: async (r) => {
      pending.set(r.id, r);
      return r.id;
    },
    cancel: async (id) => {
      pending.delete(id);
    },
    getAllScheduled: async () => [...pending.values()].map((r) => ({ id: r.id, data: r.data })),
    getPermission: async () => permission,
  };
}

function currentNotificationOS(): NotificationOS | null {
  try {
    return getNotificationOS();
  } catch {
    return null;
  }
}

// ─── Backup files ───────────────────────────────────────────────────────────

/** The phone side of backups for a story: files in memory, sharing and picking logged. */
export type StoryBackup = {
  /** Product photos on the in-memory disk, for the zip option and the storage line. */
  photos?: number;
  /** What Import picks: a backup of the story's own data, or a JSON file that isn't one. */
  pick?: 'backup' | 'notBackup';
};

function fakeBackupPlatform({ photos = 0, pick = 'backup' }: StoryBackup): BackupPlatform {
  const files = createFakeBackupFiles();
  for (let i = 1; i <= photos; i++) {
    files.addPhoto(`products/photo-${i}.jpg`, new Uint8Array(180_000 + i * 20_000));
  }
  return {
    files,
    share: async (uri) => {
      console.info('[storybook] share backup', uri);
    },
    pick: async () => {
      if (pick === 'notBackup') return files.writeCacheText('notes.json', '{"hello":"world"}');
      // A backup of the story's own data, made three days before the story's day.
      const now = daysBefore(appStore.state.activeDay, 3);
      return writeBackup('json', { db: getDb(), files, now });
    },
  };
}

const realBackupPlatform: BackupPlatform = {
  files: backupFiles,
  share: shareBackup,
  pick: pickBackupFile,
};

// ─── The sandbox ────────────────────────────────────────────────────────────

export type PhoneSandboxOptions = {
  /** What the in-memory secure storage holds. Default: nothing (no PIN). */
  secure?: SecureSeed;
  /** Notification permission, for the scheduler and the S5 card. Default 'granted'. */
  notifications?: PermissionState;
  /** Sets up the onboarding draft (`setDraftPin`, `markDraftSaved` …). Cleared afterwards. */
  draft?: () => void;
  /** Backup files in memory instead of the phone's. */
  backup?: StoryBackup;
};

function PhoneSandbox({
  options,
  children,
}: {
  options: PhoneSandboxOptions;
  children: ReactNode;
}) {
  const client = useQueryClient();
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  const [setup] = useState(() => options);

  useEffect(() => {
    let cancelled = false;
    const real = { get: secureKV.get, set: secureKV.set, delete: secureKV.delete };
    const memory = createMemoryKV();
    const toMemory = () =>
      Object.assign(secureKV, { get: memory.get, set: memory.set, delete: memory.delete });
    const toReal = () => Object.assign(secureKV, real);

    // `pinService` reads `secureKV` on every call, so swapping its methods moves every PIN check
    // in the story to memory. If the app locks while the story is open, its lock screen gets the
    // phone's secure storage back until it unlocks.
    toMemory();
    const sub = lockStore.subscribe((s) => (s.locked ? toReal() : toMemory()));

    const permission = setup.notifications ?? 'granted';
    const previousOS = currentNotificationOS();
    setNotificationOS(memoryNotificationOS(permission));
    client.setQueryData(qk.notifications.permission, permission);

    if (setup.backup) setBackupPlatform(fakeBackupPlatform(setup.backup));
    setup.draft?.();

    const start = async () => {
      await setup.secure?.(pinService);
      if (!cancelled) setReady(true);
    };
    start().catch((error: unknown) => {
      if (!cancelled) setFailure({ error });
    });

    return () => {
      cancelled = true;
      sub.unsubscribe();
      toReal();
      setNotificationOS(previousOS);
      if (setup.backup) setBackupPlatform(realBackupPlatform);
      // A PIN typed on O2 in a story must not reach the next one (the app is past onboarding).
      clearDraft();
    };
  }, [client, setup]);

  if (failure) throw failure.error;
  if (!ready) return <View testID="story-data-loading" className="flex-1 bg-canvas" />;
  return children;
}

/**
 * Keeps a story off the phone: secure storage (PIN, recovery answer, lockouts), notifications and
 * backup files live in memory while it is open. List it before `withAppData` so it runs inside it:
 *
 *   decorators: [withPhoneSandbox({ secure: pinSet }), withAppData({ seed: seedDemo })]
 */
export function withPhoneSandbox(options: PhoneSandboxOptions = {}): Decorator {
  return (Story) => (
    <PhoneSandbox options={options}>
      <Story />
    </PhoneSandbox>
  );
}

// ─── Database seeds ─────────────────────────────────────────────────────────

/**
 * Wraps a seed so Reset app can't run in the story. The real reset also deletes the phone's photo
 * folders and sends the app back to onboarding, so the story database refuses to lose its
 * settings row: `resetApp` fails at its first database step, before it touches anything else,
 * and the dialog shows its "couldn't reset" message. (Its notifications step runs first, on the
 * sandbox's in-memory scheduler.) Not for stories that restore a backup, which replaces rows too.
 */
export function withoutReset(seed: Seed): Seed {
  return (db, today) => {
    seed(db, today);
    db.run(
      sql.raw(
        "CREATE TRIGGER story_no_reset BEFORE DELETE ON settings BEGIN SELECT RAISE(ABORT, 'Reset app does not run in Storybook'); END",
      ),
    );
  };
}

/** `seedDemo` with the last backup two days ago. */
export function seedRecentBackup(db: Db, today: string): void {
  seedDemo(db, today);
  saveSettings(db, { lastBackupAt: daysBefore(today, 2) });
}

/** `seedDemo` with the last backup 45 days ago: the amber callout. */
export function seedOldBackup(db: Db, today: string): void {
  seedDemo(db, today);
  saveSettings(db, { lastBackupAt: daysBefore(today, 45) });
}

/** `seedDemo` with Face ID / fingerprint on, the auto-lock immediate and a backup last week. */
export function seedBiometricsOn(db: Db, today: string): void {
  seedDemo(db, today);
  saveSettings(db, {
    biometricsOn: true,
    autoLockSeconds: 0,
    lastBackupAt: daysBefore(today, 7),
  });
}

/** `seedEmpty` with every reminder switched off. */
export function seedRemindersOff(db: Db): void {
  seedEmpty(db);
  saveSettings(db, {
    expiryRemindersOn: false,
    expiryDayReminderOn: false,
    routineRemindersOn: false,
    hairRemindersOn: false,
    weeklyPhotoOn: false,
    weeklyDigestOn: false,
  });
}

/** `seedDemo` with every reminder on (the weekly photo on Sunday 10:00), 14 days, 30 min snooze. */
export function seedRemindersAllOn(db: Db, today: string): void {
  seedDemo(db, today);
  saveSettings(db, { weeklyPhotoOn: true, expiryWarnDays: 14, snoozeMinutes: 30 });
}

/** `seedDemo` with the hair album on, side angles and a stronger guide. */
export function seedProgressPrefs(db: Db, today: string): void {
  seedDemo(db, today);
  saveSettings(db, {
    skinAngles: ['front', 'left', 'right'],
    hairAlbumOn: true,
    hairAngles: ['front', 'top'],
    photoGuideOpacity: 0.5,
  });
}

/**
 * `seedDemo` plus a near-duplicate ingredient ("L-Ascorbic acid" next to "Ascorbic acid"), a rule
 * and an avoided ingredient with long Lithuanian notes, to see wrapping.
 */
export function seedLongNotes(db: Db, today: string): void {
  seedDemo(db, today);
  createProduct(db, {
    name: 'Brightening Drops',
    brand: 'Lumi Lab',
    area: 'skin',
    category: 'serum',
    size: 15,
    unit: 'ml',
    price: null,
    purchasedAt: null,
    expiresAt: null,
    openedAt: null,
    paoMonths: null,
    notes: null,
    photoUri: null,
    ingredients: ['Aqua', 'L-Ascorbic acid', 'Niacinamide'],
  });
  const byName = new Map(listIngredients(db).map((i) => [i.name, i.id]));
  const niacinamide = byName.get('Niacinamide');
  const ascorbic = byName.get('L-Ascorbic acid');
  if (niacinamide === undefined || ascorbic === undefined) {
    throw new Error('seedLongNotes: Niacinamide or L-Ascorbic acid is missing');
  }
  saveRule(db, {
    leftKind: 'ingredient',
    leftId: niacinamide,
    rightKind: 'ingredient',
    rightId: ascorbic,
    note: 'Kartu gali sukelti paraudimą ir dilgčiojimą, ypač jautriai odai po šveitimo',
  });
  addAvoidIngredientByName(db, 'Alcohol denat.', 'Labai sausina odą, ypač žiemą ir po saulės');
}
