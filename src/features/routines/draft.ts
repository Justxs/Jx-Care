import { createStore } from '@tanstack/react-store';

import type { RoutineFormValues } from './schema';

/** The editor route for a routine that isn't saved yet: `/routines/new`. */
export const NEW_ROUTINE_ID = 'new';

/**
 * Starting values for the R2 editor, set by "Create routine" in the starter sheet. Nothing is
 * saved until the editor saves; the editor (task 024) reads this with `takeRoutineDraft` when it
 * opens at `/routines/new`.
 */
export const routineDraftStore = createStore<{ draft: RoutineFormValues | null }>({ draft: null });

export function setRoutineDraft(draft: RoutineFormValues): void {
  routineDraftStore.setState(() => ({ draft }));
}

/** Returns the waiting draft and clears it, so a later "new routine" never starts from it. */
export function takeRoutineDraft(): RoutineFormValues | null {
  const { draft } = routineDraftStore.state;
  routineDraftStore.setState(() => ({ draft: null }));
  return draft;
}
