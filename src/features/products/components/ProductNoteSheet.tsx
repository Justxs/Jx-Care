import { useStore } from '@tanstack/react-form';
import { useSelector } from '@tanstack/react-store';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useAppForm, useFormDirty } from '@/components/ui/form';
import { Sheet } from '@/components/ui/sheet';
import { skinTags } from '@/db/enums';
import { appStore } from '@/state/app';

import { useAddNote, useUpdateNote } from '../notesApi';
import { NOTE_MAX, type ProductNoteItem } from '../notesRepo';
import { noteSchema, type NoteFormValues } from '../noteSchema';

export type ProductNoteSheetProps = {
  productId: number;
  open: boolean;
  /** Asks the sheet to close (after saving) and is called once it has closed. */
  onClose: () => void;
  /** Edits this note instead of adding one. */
  editing?: ProductNoteItem | null;
};

/** P8 Product note: date (default today), text (required, max 280, counter) and quick tags. */
export function ProductNoteSheet({ productId, open, onClose, editing }: ProductNoteSheetProps) {
  const { t } = useTranslation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const add = useAddNote();
  const update = useUpdateNote();

  const defaults: NoteFormValues = editing
    ? { day: editing.day, text: editing.text, tags: editing.tags }
    : { day: today, text: '', tags: [] };

  const form = useAppForm({
    schema: noteSchema(today),
    defaultValues: defaults,
    onSubmit: async (value) => {
      if (editing) await update.mutateAsync({ id: editing.id, input: value });
      else await add.mutateAsync({ productId, ...value });
      onClose();
    },
  });
  const dirty = useFormDirty(form);
  const submitting = useStore(form.store, (s) => s.isSubmitting);
  const used = useStore(form.store, (s) => s.values.text.length);

  const submit = () => {
    // Re-check first: a field still focused after a failed try keeps its old error otherwise.
    void Promise.resolve(form.validate('blur')).then(() => form.handleSubmit());
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dirty={dirty}
      title={editing ? t('products.notes.editTitle') : t('products.notes.add')}
      footer={
        <Button onPress={submit} loading={submitting}>
          {t('common.save')}
        </Button>
      }
    >
      <form.AppField name="day">
        {(field) => <field.DateField label={t('products.notes.date')} max={today} />}
      </form.AppField>
      <form.AppField name="text">
        {(field) => (
          <field.TextField
            label={t('products.notes.text')}
            placeholder={t('products.notes.placeholder')}
            hint={t('products.notes.counter', { used, max: NOTE_MAX })}
            maxLength={NOTE_MAX}
            multiline
            autoCapitalize="sentences"
          />
        )}
      </form.AppField>
      <form.AppField name="tags">
        {(field) => (
          <field.ChipField
            label={t('products.notes.tags')}
            noHelper
            items={skinTags.map((tag) => ({ value: tag, label: t(`common.tags.${tag}`) }))}
          />
        )}
      </form.AppField>
    </Sheet>
  );
}
