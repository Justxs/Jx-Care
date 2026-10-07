import { cancelTodaysRoutineReminders } from './reminders';

/**
 * Called whenever a routine becomes complete on an app day: the last tick in the player, All
 * done in the player, or All done on Today. Cancels today's pending reminder for the routine's
 * time of day and any snoozed copy (task 027).
 */
export function onRoutineCompleted(routineId: number, _day: string): void {
  void cancelTodaysRoutineReminders(routineId);
}
