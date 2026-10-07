/**
 * The app's entry into the notification layer. Importing this module (app/_layout.tsx does, at
 * the top) defines the background tasks; `startAppNotifications()` runs once after boot.
 */
import { expoNotificationOS } from './os';
import { setNotificationOS } from './scheduler';
import { startNotifications } from './start';
import { registerBackgroundTasks } from './tasks';

setNotificationOS(expoNotificationOS);

export function startAppNotifications(): () => void {
  setNotificationOS(expoNotificationOS);
  registerBackgroundTasks().catch(() => {});
  return startNotifications();
}
