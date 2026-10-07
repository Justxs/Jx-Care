/** A conflict a routine's card shows a ConflictTag for. */
export type RoutineConflictTag = {
  /** Every-few-days steps only meet the other on some days ("Mild conflict"). */
  mild: boolean;
};

/**
 * The conflicts a routine has with other routines on the same weekdays. Task 030 fills this from
 * its conflict cache; until then there are none, so the card shows no tag.
 */
export function useRoutineConflicts(_routineId: number): readonly RoutineConflictTag[] {
  return [];
}
