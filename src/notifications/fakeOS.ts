/**
 * An in-memory `NotificationOS` for tests (this task's and every feature's planner tests):
 * `setNotificationOS(createFakeOS())`, then look at `os.pending` and the jest mocks.
 */
import type {
  NotificationOS,
  OsNotificationRequest,
  OsScheduledNotification,
  PermissionState,
} from './types';

export type FakeOS = NotificationOS & {
  /** What the phone has pending, by id. */
  pending: Map<string, OsNotificationRequest>;
  permission: PermissionState;
  schedule: jest.Mock<Promise<string>, [OsNotificationRequest]>;
  cancel: jest.Mock<Promise<void>, [string]>;
  getAllScheduled: jest.Mock<Promise<OsScheduledNotification[]>, []>;
  getPermission: jest.Mock<Promise<PermissionState>, []>;
  /** Clears the call records (not the pending list). */
  resetCalls(): void;
};

export function createFakeOS(permission: PermissionState = 'granted'): FakeOS {
  const pending = new Map<string, OsNotificationRequest>();
  const os: FakeOS = {
    pending,
    permission,
    schedule: jest.fn(async (r: OsNotificationRequest) => {
      pending.set(r.id, r);
      return r.id;
    }),
    cancel: jest.fn(async (id: string) => {
      pending.delete(id);
    }),
    getAllScheduled: jest.fn(async () =>
      [...pending.values()].map((r) => ({ id: r.id, data: r.data })),
    ),
    getPermission: jest.fn(async () => os.permission),
    resetCalls() {
      os.schedule.mockClear();
      os.cancel.mockClear();
      os.getAllScheduled.mockClear();
      os.getPermission.mockClear();
    },
  };
  return os;
}
