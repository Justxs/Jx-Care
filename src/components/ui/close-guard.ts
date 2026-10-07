import { useCallback, useState } from 'react';

/**
 * "Discard changes?" before closing something with unsaved edits. `requestClose` closes at once
 * when nothing changed; otherwise it opens the confirm dialog, whose Discard closes and whose
 * Keep editing stays.
 */
export function useCloseGuard(opts: { dirty: boolean; onClose: () => void }) {
  const { dirty, onClose } = opts;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const requestClose = useCallback(() => {
    if (dirty) setConfirmOpen(true);
    else onClose();
  }, [dirty, onClose]);
  const discard = useCallback(() => {
    setConfirmOpen(false);
    onClose();
  }, [onClose]);
  const keepEditing = useCallback(() => setConfirmOpen(false), []);
  return { confirmOpen, setConfirmOpen, requestClose, discard, keepEditing };
}
