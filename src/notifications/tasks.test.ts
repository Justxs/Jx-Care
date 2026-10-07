import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { saveSettings } from '@/features/settings/repo';
import { setupTestApp } from '@/test/render';

import {
  notificationKey,
  registerPlanner,
  setNotificationOS,
  unregisterPlanner,
} from './scheduler';
import { RESPONSE_TASK, SYNC_INTERVAL_MINUTES, SYNC_TASK, registerBackgroundTasks } from './tasks';

type Executor = (body: { data: unknown; error: null; executionInfo: object }) => Promise<unknown>;

function executor(name: string): Executor {
  const call = jest.mocked(TaskManager.defineTask).mock.calls.find((c) => c[0] === name);
  if (!call) throw new Error(`task ${name} not defined`);
  return call[1] as unknown as Executor;
}

const granted = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
} as unknown as Notifications.NotificationPermissionsStatus;

beforeEach(() => {
  jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
  jest.mocked(BackgroundTask.registerTaskAsync).mockClear();
});

afterEach(() => {
  unregisterPlanner('tasks-test');
  setNotificationOS(null);
});

it('defines the daily sync and the action-button task at import', () => {
  expect(TaskManager.defineTask).toHaveBeenCalledWith(SYNC_TASK, expect.any(Function));
  expect(TaskManager.defineTask).toHaveBeenCalledWith(RESPONSE_TASK, expect.any(Function));
});

it('registers the daily sync at least 24 h apart, and the response task', async () => {
  await registerBackgroundTasks();
  expect(SYNC_INTERVAL_MINUTES).toBe(24 * 60);
  expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(SYNC_TASK, {
    minimumInterval: 1440,
  });
  expect(Notifications.registerTaskAsync).toHaveBeenCalledWith(RESPONSE_TASK);
});

it('skips the background sync where the OS restricts it', async () => {
  jest
    .mocked(BackgroundTask.getStatusAsync)
    .mockResolvedValueOnce(BackgroundTask.BackgroundTaskStatus.Restricted);
  await registerBackgroundTasks();
  expect(BackgroundTask.registerTaskAsync).not.toHaveBeenCalled();
});

it('the background sync schedules through expo-notifications with a date trigger', async () => {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  const fireAt = Date.now() + 60 * 60 * 1000;
  registerPlanner('tasks-test', () => [
    {
      key: notificationKey('weekly_photo', null, 'weekly_photo', 'w'),
      entityType: 'weekly_photo',
      entityId: null,
      kind: 'weekly_photo',
      fireAt,
      title: 'Weekly photo',
      body: "Time for this week's skin photo",
      categoryId: 'weekly_photo',
      channelId: 'photos',
      data: { url: '/progress/camera' },
    },
  ]);
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce(granted);
  const result = await executor(SYNC_TASK)({ data: null, error: null, executionInfo: {} });
  expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
    identifier: expect.stringMatching(/^weekly_photo:-:weekly_photo:w#/),
    content: expect.objectContaining({
      title: 'Weekly photo',
      categoryIdentifier: 'weekly_photo',
      data: expect.objectContaining({ url: '/progress/camera' }),
    }),
    trigger: { type: 'date', date: fireAt, channelId: 'photos' },
  });
});

it('runs an action button in the background', async () => {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en', snoozeMinutes: 5 });
  const data = {
    url: '/hair/done/3',
    key: 'hair_task:3:hair:2026-10-07',
    entityType: 'hair_task',
    entityId: 3,
    kind: 'hair',
    channelId: 'hair',
  };
  const response = {
    actionIdentifier: 'snooze',
    notification: {
      date: 1,
      request: {
        identifier: `${data.key}#x`,
        content: { title: 'Hair wash day', body: 'shampoo', data, categoryIdentifier: 'hair' },
        trigger: null,
      },
    },
  };
  await executor(RESPONSE_TASK)({ data: response, error: null, executionInfo: {} });
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      identifier: `snooze:${data.key}`,
      trigger: expect.objectContaining({ channelId: 'hair' }),
    }),
  );
});
