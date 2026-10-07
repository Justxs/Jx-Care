import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { RadioList } from '@/components/ui/radio-list';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { showToast } from '@/state/ui';

import { useMergeIngredients } from '../api';
import type { IngredientListItem } from '../repo';

export type MergeSheetProps = {
  open: boolean;
  onClose: () => void;
  /** The selected ingredients, two or more. */
  items: readonly IngredientListItem[];
  onMerged: () => void;
};

/** The name in the most products is the default to keep; ties keep list order. */
function defaultKeep(items: readonly IngredientListItem[]): number | undefined {
  return items.toSorted((a, b) => b.productCount - a.productCount)[0]?.id;
}

/** S2 merge: choose which name to keep for duplicates. Mount with a new `key` each time. */
export function MergeSheet({ open, onClose, items, onMerged }: MergeSheetProps) {
  const { t } = useTranslation();
  const [keepId, setKeepId] = useState(defaultKeep(items));
  const merge = useMergeIngredients();
  const keep = items.find((i) => i.id === keepId);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('ingredients.mergeSheet.title')}
      footer={
        <Button
          disabled={!keep}
          loading={merge.isPending}
          onPress={async () => {
            if (!keep) return;
            await merge.mutateAsync({
              keepId: keep.id,
              mergeIds: items.filter((i) => i.id !== keep.id).map((i) => i.id),
            });
            onClose();
            onMerged();
            showToast({ message: t('ingredients.mergedToast', { name: keep.name }) });
          }}
        >
          {t('ingredients.mergeSheet.save', { name: keep?.name ?? '' })}
        </Button>
      }
    >
      <Text className="text-body text-ink-muted">{t('ingredients.mergeSheet.body')}</Text>
      <RadioList
        accessibilityLabel={t('ingredients.mergeSheet.title')}
        value={keepId === undefined ? undefined : String(keepId)}
        onValueChange={(v) => setKeepId(Number(v))}
        items={items.map((i) => ({
          value: String(i.id),
          label: i.name,
          detail:
            i.productCount > 0
              ? t('ingredients.inProducts', { count: i.productCount })
              : t('ingredients.inNoProducts'),
        }))}
      />
    </Sheet>
  );
}
