import type { ConflictExplain } from '@/components/ExplainSheet';

/**
 * Places in the routine player and the Routine done screen that later tasks fill in. Each task
 * registers its hook once at module load (the hook must follow the rules of hooks); until then
 * the default returns nothing and the thing stays hidden.
 */

// ─── Conflicts (task 030) ───────────────────────────────────────────────────

/** A conflict on one of the player's steps; task 030 builds it from `dayConflicts`. */
export type PlayerConflict = {
  /** The step in this routine that carries the ConflictTag. */
  stepId: number;
  /** `first` is this step's product and routine; `second` is the other side. */
  conflict: ConflictExplain;
};

const NO_CONFLICTS: readonly PlayerConflict[] = [];

let useConflictsImpl: (routineId: number, day: string) => readonly PlayerConflict[] = () =>
  NO_CONFLICTS;

/** Task 030: the conflicts of a routine's steps on an app day. */
export function registerPlayerConflicts(
  hook: (routineId: number, day: string) => readonly PlayerConflict[],
): void {
  useConflictsImpl = hook;
}

/** The ConflictTags and amber lines in the player. None until task 030 registers its hook. */
export function usePlayerConflicts(routineId: number, day: string): readonly PlayerConflict[] {
  return useConflictsImpl(routineId, day);
}

// ─── Add a note (task 038) ──────────────────────────────────────────────────

/** Opens the Condition log sheet (T4) on a side. */
export type OpenConditionLog = (side: 'skin' | 'hair') => void;

let useAddNoteImpl: () => OpenConditionLog | null = () => null;

/** Task 038: how "Add a note" on the Routine done screen opens the Condition log sheet. */
export function registerAddNote(hook: () => OpenConditionLog | null): void {
  useAddNoteImpl = hook;
}

/** "Add a note" stays hidden while this is null. */
export function useAddNote(): OpenConditionLog | null {
  return useAddNoteImpl();
}
