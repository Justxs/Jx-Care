/**
 * The in-context reminder ask (spec refinement 8, P3 reminder ask). Notification permission is
 * never asked at launch; features call `askForReminders` at the moment a reminder makes sense:
 *
 * - `expiry`: the first product with an expiry date was saved (task 021). Always shows the
 *   ReminderAskSheet; Allow turns on expiry reminders, either answer sets `reminderAskDone`.
 * - `routine`, `hair`, `weeklyPhoto`: the first reminder of that kind is switched on (tasks 027,
 *   033, 036). Granted already: nothing to ask. Denied: the "off in phone settings" toast.
 *   Undetermined: the sheet, explained for that kind, then the system prompt on Allow.
 * - `settings`: a switch on the Reminders screen (S5) is turned on. The screen already explains
 *   itself, so an undetermined permission goes straight to the system prompt.
 *
 * The sheet itself (`ReminderAskHost`, mounted once in app/_layout.tsx) reads `reminderAskStore`
 * and answers with `answerReminderAsk`.
 */
import type { QueryClient } from '@tanstack/react-query';
import { createStore } from '@tanstack/react-store';

import { getDb } from '@/db';
import { queryClient as appQueryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import { saveSettings, type SettingsPatch } from '@/features/settings/repo';
import { i18n } from '@/i18n';
import { showToast } from '@/state/ui';

import { getPermission, openPhoneSettings, requestPermission } from './permission';
import { sync } from './scheduler';
import type { PermissionState } from './types';

export type ReminderAskReason = 'expiry' | 'routine' | 'hair' | 'weeklyPhoto' | 'settings';

export type ReminderAsk = {
  reason: ReminderAskReason;
  /** The product the expiry ask names ("Vitamin C serum"). */
  productName?: string;
};

/** What happened: permission granted, refused (or off in phone settings), or Not now. */
export type ReminderAskOutcome = 'granted' | 'denied' | 'notNow';

/** The ask on screen, for the sheet. `id` changes with every new ask. */
export type ShownReminderAsk = ReminderAsk & { id: number };

export const reminderAskStore = createStore<{ ask: ShownReminderAsk | null }>({ ask: null });

/** How the ask reads and requests permission; tests swap in a fake. */
export type PermissionAdapter = {
  get(): Promise<PermissionState>;
  request(): Promise<PermissionState>;
};

const systemPermission: PermissionAdapter = { get: getPermission, request: requestPermission };
let permission: PermissionAdapter = systemPermission;

export function setPermissionAdapter(next: PermissionAdapter | null): void {
  permission = next ?? systemPermission;
}

let nextId = 1;
let pending: { ask: ReminderAsk; resolve: (outcome: ReminderAskOutcome) => void } | null = null;

/** "Notifications are off in phone settings" with "Open settings". */
export function showPermissionOffToast(): void {
  showToast({
    message: i18n.t('notifications.permissionOff.title'),
    actionLabel: i18n.t('reminders.openSettings'),
    onAction: () => {
      openPhoneSettings().catch(() => {});
    },
  });
}

function save(patch: SettingsPatch, client: QueryClient): void {
  if (Object.keys(patch).length === 0) return;
  client.setQueryData(qk.settings, saveSettings(getDb(), patch));
}

/** Allow: the system prompt, then switch on what the ask was about and schedule. */
async function allow(ask: ReminderAsk, client: QueryClient): Promise<ReminderAskOutcome> {
  const state = await permission.request();
  client.setQueryData(qk.notifications.permission, state);
  if (ask.reason === 'expiry') {
    save(
      { reminderAskDone: true, ...(state === 'granted' ? { expiryRemindersOn: true } : {}) },
      client,
    );
  }
  if (state === 'granted') {
    await sync().catch(() => {});
    return 'granted';
  }
  if (state === 'denied') {
    showPermissionOffToast();
    return 'denied';
  }
  // The prompt was dismissed without an answer (Android can do that): nothing changes.
  return 'notNow';
}

/**
 * Asks for reminder permission in context and resolves once it is settled. Never call it at
 * launch. Only one ask is shown at a time; a second while one is open resolves 'notNow'.
 */
export async function askForReminders(
  ask: ReminderAsk,
  opts: { client?: QueryClient } = {},
): Promise<ReminderAskOutcome> {
  const client = opts.client ?? appQueryClient;
  if (ask.reason !== 'expiry') {
    const state = await permission.get();
    if (state === 'granted') return 'granted';
    if (state === 'denied') {
      showPermissionOffToast();
      return 'denied';
    }
    if (ask.reason === 'settings') return allow(ask, client);
  }
  if (pending) return 'notNow';
  return new Promise<ReminderAskOutcome>((resolve) => {
    pending = { ask, resolve };
    reminderAskStore.setState(() => ({ ask: { ...ask, id: nextId++ } }));
  });
}

/**
 * The sheet's answer: Allow reminders, or Not now (also closing the sheet any other way). Not now
 * on the expiry ask is final: it is never shown again from a product save. Returns null when no
 * ask is open (the sheet's close after an answer).
 */
export async function answerReminderAsk(
  answer: 'allow' | 'notNow',
  client: QueryClient = appQueryClient,
): Promise<ReminderAskOutcome | null> {
  const current = pending;
  if (!current) return null;
  pending = null;
  reminderAskStore.setState(() => ({ ask: null }));
  let outcome: ReminderAskOutcome = 'notNow';
  try {
    if (answer === 'allow') {
      outcome = await allow(current.ask, client);
    } else if (current.ask.reason === 'expiry') {
      save({ reminderAskDone: true }, client);
    }
  } finally {
    current.resolve(outcome);
  }
  return outcome;
}

/** Test helper: forgets an open ask without answering it. */
export function resetReminderAsk(): void {
  pending?.resolve('notNow');
  pending = null;
  reminderAskStore.setState(() => ({ ask: null }));
}
