import { useTranslation } from 'react-i18next';

import { useBuyAgain } from '@/features/shopping/api';
import { showToast } from '@/state/ui';

import { useMarkFinishedMany, useRestoreProduct, useUndoFinished } from './api';

type Named = { id: number; name: string };

/**
 * Mark finished (P1 rows and select bar, P2) with its toast: "Vitamin C serum moved to Archive"
 * (or "3 products …") with Undo, and Buy again when the shopping list is there.
 */
export function useFinishProducts() {
  const { t } = useTranslation();
  const finish = useMarkFinishedMany();
  const undo = useUndoFinished();
  const buyAgain = useBuyAgain();
  const run = async (products: Named[]) => {
    const previous = await finish.mutateAsync(products.map((p) => p.id));
    showToast({
      message:
        products.length === 1
          ? t('products.finishedToast', { name: products[0]!.name })
          : t('products.finishedManyToast', { count: previous.length }),
      actionLabel: t('common.undo'),
      onAction: () => undo.mutate(previous),
      secondaryLabel: t('common.buyAgain'),
      onSecondary: () => buyAgain(products),
    });
  };
  return { run, isPending: finish.isPending };
}

/** Restore to Products (P2, P5) with "Clay mask restored to Products" and Undo. */
export function useRestoreFromArchive() {
  const { t } = useTranslation();
  const restore = useRestoreProduct();
  const undo = useUndoFinished();
  const run = async (p: Named & { archivedAt: string | null }) => {
    await restore.mutateAsync(p.id);
    showToast({
      message: t('products.archive.restoredToast', { name: p.name }),
      actionLabel: t('common.undo'),
      onAction: () => undo.mutate([{ id: p.id, archivedAt: p.archivedAt }]),
    });
  };
  return { run, isPending: restore.isPending };
}
