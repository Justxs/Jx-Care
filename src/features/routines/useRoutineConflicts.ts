/**
 * The conflict warnings routines show, from task 030's conflict hooks: `useRoutineConflicts` for
 * the R1 card's tag, `useEditorConflicts` for R2's step tags and conflict panel.
 */
export {
  useEditorConflicts,
  useRoutineConflicts,
  type ConflictTarget as RoutineConflictTag,
  type DraftRoutine,
  type EditorConflictHit,
  type EditorConflicts,
} from '@/features/conflicts/hooks';
