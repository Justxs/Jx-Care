import type { RoutineFormValues } from './schema';

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

/** One line of the editor's conflict panel (spec R2). */
export type EditorConflictHit = {
  key: string;
  /** Index of the step in the editor's list that the line is about. */
  stepIndex: number;
  /** An every-few-days step: shown with the "mild" label. */
  mild: boolean;
  /** "Retinol (step 3) × Glycolic acid in Evening B, Tue". */
  text: string;
};

/**
 * Conflicts between the routine being edited (not saved yet) and the other routines on the same
 * weekdays. Task 030 fills this in; until then there are none, so the panel stays closed.
 */
export function useEditorConflicts(
  _draft: { id: number | null } & Pick<RoutineFormValues, 'timeOfDay' | 'daysOfWeek' | 'steps'>,
): readonly EditorConflictHit[] {
  return [];
}
