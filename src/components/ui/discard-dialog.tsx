import { useTranslation } from 'react-i18next';

import { AlertDialog } from './alert-dialog';

export type DiscardDialogProps = {
  open: boolean;
  onDiscard: () => void;
  onKeepEditing: () => void;
};

/** "Discard changes?" with Discard / Keep editing, for forms and sheets with unsaved edits. */
export function DiscardDialog({ open, onDiscard, onKeepEditing }: DiscardDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onKeepEditing();
      }}
      title={t('common.discardTitle')}
      description={t('common.discardBody')}
      actionLabel={t('common.discard')}
      cancelLabel={t('common.keepEditing')}
      destructive
      onAction={onDiscard}
      onCancel={onKeepEditing}
    />
  );
}
