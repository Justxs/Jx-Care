/**
 * Jest stand-ins for expo-notifications, expo-task-manager and expo-background-task (wired in
 * jest.setup.js). Every function is a jest.fn with a harmless default; tests override them with
 * `jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce(...)`.
 */

const permission = {
  status: 'undetermined',
  granted: false,
  canAskAgain: true,
  expires: 'never',
};

export function expoNotificationsMock() {
  return {
    DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
    AndroidImportance: {
      UNKNOWN: 0,
      UNSPECIFIED: 1,
      NONE: 2,
      MIN: 3,
      LOW: 4,
      DEFAULT: 5,
      HIGH: 6,
      MAX: 7,
    },
    IosAuthorizationStatus: {
      NOT_DETERMINED: 0,
      DENIED: 1,
      AUTHORIZED: 2,
      PROVISIONAL: 3,
      EPHEMERAL: 4,
    },
    SchedulableTriggerInputTypes: {
      CALENDAR: 'calendar',
      DAILY: 'daily',
      WEEKLY: 'weekly',
      MONTHLY: 'monthly',
      YEARLY: 'yearly',
      DATE: 'date',
      TIME_INTERVAL: 'timeInterval',
    },
    BackgroundNotificationTaskResult: { NewData: 0, NoData: 1, Failed: 2 },
    getPermissionsAsync: jest.fn(async () => permission),
    requestPermissionsAsync: jest.fn(async () => permission),
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    setNotificationCategoryAsync: jest.fn(async () => null),
    scheduleNotificationAsync: jest.fn(async (r: { identifier?: string }) => r.identifier ?? 'id'),
    cancelScheduledNotificationAsync: jest.fn(async () => {}),
    cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
    getAllScheduledNotificationsAsync: jest.fn(async () => []),
    dismissNotificationAsync: jest.fn(async () => {}),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    getLastNotificationResponseAsync: jest.fn(async () => null),
    clearLastNotificationResponseAsync: jest.fn(async () => {}),
    registerTaskAsync: jest.fn(async () => null),
    unregisterTaskAsync: jest.fn(async () => null),
  };
}

export function expoTaskManagerMock() {
  return {
    defineTask: jest.fn(),
    isTaskDefined: jest.fn(() => false),
    isTaskRegisteredAsync: jest.fn(async () => false),
    unregisterTaskAsync: jest.fn(async () => {}),
  };
}

export function expoBackgroundTaskMock() {
  return {
    BackgroundTaskStatus: { Restricted: 1, Available: 2 },
    BackgroundTaskResult: { Success: 1, Failed: 2 },
    getStatusAsync: jest.fn(async () => 2),
    registerTaskAsync: jest.fn(async () => {}),
    unregisterTaskAsync: jest.fn(async () => {}),
  };
}
