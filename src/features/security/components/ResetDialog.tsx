import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { getDb } from '@/db';
import { isLanguage, type Language } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { appDay } from '@/lib/appDay';
import { showToast } from '@/state/ui';

import { resetCounts, type ResetCounts } from '../repo';
import { resetApp } from '../resetApp';
import { PinConfirmDialog } from './PinConfirmDialog';

/** The word the person types to confirm (the same in both languages, as the spec writes it). */
export const RESET_WORD = 'RESET';

/**
 * What Reset app deletes, with real counts, and whether a backup can bring it back. Never
 * suggests exporting: from Forgot PIN the person is locked out (spec L2).
 */
export function resetDescription(
  t: TFunction,
  counts: ResetCounts,
  lang: Language,
  now: number = Date.now(),
): string {
  const parts = [
    t('lock.reset.lost', {
      products: t('lock.reset.products', { count: counts.products }),
      routines: t('lock.reset.routines', { count: counts.routines }),
      photos: t('lock.reset.photos', { count: counts.photos }),
    }),
  ];
  if (counts.photos > 0) parts.push(t('lock.reset.notInGallery'));
  if (counts.lastBackupAt !== null) {
    const date = formatDate(appDay(counts.lastBackupAt), lang, appDay(now));
    parts.push(t('lock.reset.lastBackup', { date }));
  } else {
    parts.push(t('lock.reset.noUndo'));
  }
  return parts.join(' ');
}

export type ResetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Settings, Reset app (task 040): the PIN is asked first, and an Export backup button sits
   * above Reset app.
   */
  fromSettings?: boolean;
  /** Export backup (only with `fromSettings`). */
  onExport?: () => void;
  /** Called when the reset failed and nothing was deleted; defaults to a toast. */
  onFailed?: () => void;
  /** The lock screen renders its dialogs into its own PortalHost. */
  portalHost?: string;
  /** Replaces the real reset in tests. */
  reset?: () => Promise<void>;
};

/** Reset app and delete all data: real counts, then typing RESET (spec L2, S8). */
export function ResetDialog({
  open,
  onOpenChange,
  fromSettings = false,
  onExport,
  onFailed,
  portalHost,
  reset = resetApp,
}: ResetDialogProps) {
  const { t, i18n } = useTranslation();
  const [pinOk, setPinOk] = useState(false);
  const lang: Language = isLanguage(i18n.language) ? i18n.language : 'en';

  // Every opening from Settings asks for the PIN again (state reset while rendering).
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    // On opening too: a PIN check that finished after Cancel must not carry over.
    setPinOk(false);
  }

  // Counted each time the dialog opens, so they are never stale.
  const description = useMemo(
    () => (open ? resetDescription(t, resetCounts(getDb()), lang) : ''),
    [open, t, lang],
  );

  const onAction = () => {
    reset().catch(() => {
      if (onFailed) onFailed();
      else showToast({ message: t('lock.reset.failed') });
    });
  };

  if (fromSettings && !pinOk) {
    return (
      <PinConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t('lock.reset.pinTitle')}
        description={t('lock.reset.pinBody')}
        onConfirmed={() => setPinOk(true)}
        portalHost={portalHost}
      />
    );
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('lock.reset.title')}
      description={description}
      actionLabel={t('lock.reset.action')}
      cancelLabel={t('common.cancel')}
      destructive
      onAction={onAction}
      confirmText={RESET_WORD}
      confirmLabel={t('lock.reset.confirmLabel')}
      secondaryAction={
        fromSettings && onExport
          ? { label: t('lock.reset.exportBackup'), onPress: onExport }
          : undefined
      }
      portalHost={portalHost}
    />
  );
}
