import { router, type Href } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';

import {
  ConflictExplainSheet,
  MildConflictExplainSheet,
  type ConflictExplain,
} from '@/components/ExplainSheet';
import { ConflictTag } from '@/components/ui/conflict-tag';

import { sheetFor, type ConflictTarget } from '../warnings';

type State = {
  kind: 'conflict' | 'mild';
  open: boolean;
  conflict: ConflictExplain | null;
  step: ConflictTarget['mildStep'];
};

export type ConflictSheets = {
  /** Opens what a tag with these targets explains: the conflict sheet or the Mild one. */
  open: (targets: readonly ConflictTarget[]) => void;
  /** "What does mild mean?": the Mild conflict sheet, about a step when one is known. */
  openMild: (step?: ConflictTarget['mildStep']) => void;
  /** The two sheets; render once. */
  element: ReactNode;
};

/**
 * The conflict sheet ("Why this warning") and the Mild conflict sheet (ExplainSheets, task 025)
 * for one screen or card. "Edit the routine" shows when `editRoutineId` is set (not inside the
 * editor itself); "See the rule" opens S3. Both navigate once the sheet has closed.
 */
export function useConflictSheets(editRoutineId: number | null = null): ConflictSheets {
  const [state, setState] = useState<State>({
    kind: 'conflict',
    open: false,
    conflict: null,
    step: null,
  });
  const after = useRef<Href | null>(null);

  const close = () => setState((s) => ({ ...s, open: false }));
  const onClosed = () => {
    close();
    const next = after.current;
    after.current = null;
    if (next) router.push(next);
  };
  const go = (href: Href) => {
    after.current = href;
    close();
  };

  return {
    open: (targets) => {
      const sheet = sheetFor(targets);
      if (!sheet) return;
      setState(
        sheet.kind === 'conflict'
          ? { kind: 'conflict', open: true, conflict: sheet.conflict, step: null }
          : { kind: 'mild', open: true, conflict: null, step: sheet.step },
      );
    },
    openMild: (step = null) => setState({ kind: 'mild', open: true, conflict: null, step }),
    element: (
      <>
        <ConflictExplainSheet
          open={state.open && state.kind === 'conflict'}
          onClose={onClosed}
          conflict={state.conflict}
          onEditRoutine={
            editRoutineId !== null ? () => go(`/routines/${editRoutineId}`) : undefined
          }
          onSeeRule={() => go('/settings/conflicts')}
        />
        <MildConflictExplainSheet
          open={state.open && state.kind === 'mild'}
          onClose={onClosed}
          step={state.step}
        />
      </>
    ),
  };
}

export type ConflictTagButtonProps = {
  targets: readonly ConflictTarget[];
  /** The routine the tag belongs to: the conflict sheet offers to edit it. */
  routineId?: number | null;
  className?: string;
};

/**
 * A tappable ConflictTag ("Conflict", or "Mild conflict" when every conflict is mild) that opens
 * its sheet. Renders nothing without conflicts.
 */
export function ConflictTagButton({
  targets,
  routineId = null,
  className,
}: ConflictTagButtonProps) {
  const sheets = useConflictSheets(routineId);
  if (targets.length === 0) return null;
  return (
    <>
      <ConflictTag
        mild={targets.every((t) => t.mild)}
        onPress={() => sheets.open(targets)}
        className={className}
      />
      {sheets.element}
    </>
  );
}
