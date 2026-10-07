import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Collapsible } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/empty-state';
import { useAppForm } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { productCategories } from '@/db/enums';
import { showToast } from '@/state/ui';

import { sampleDefaults, sampleSchema } from './sampleForm';

/** The form from the task 009 acceptance criteria. */
export function SampleForm({ onSaved }: { onSaved?: (value: unknown) => void }) {
  const { t } = useTranslation();
  const form = useAppForm({
    schema: sampleSchema,
    defaultValues: sampleDefaults,
    onSubmit: (value) => onSaved?.(value),
  });
  return (
    <View className="gap-1">
      <form.AppField name="name">
        {(field) => <field.TextField label={t('dev.name')} hint={t('dev.nameHint')} />}
      </form.AppField>
      <form.AppField name="price">
        {(field) => <field.TextField label={t('dev.price')} keyboard="decimal" suffix="€" />}
      </form.AppField>
      <form.AppField name="purchased">
        {(field) => <field.DateField label={t('dev.purchased')} />}
      </form.AppField>
      <form.AppField name="category">
        {(field) => (
          <field.SelectField
            label={t('dev.category')}
            options={productCategories.map((c) => ({ value: c, label: c }))}
          />
        )}
      </form.AppField>
      <form.AppField name="tags">
        {(field) => (
          <field.ChipField
            label={t('dev.tags')}
            items={(['calm', 'glow', 'oily', 'dry'] as const).map((v) => ({
              value: v,
              label: t(`common.tags.${v}`),
            }))}
          />
        )}
      </form.AppField>
      <form.AppField name="answer">
        {(field) => <field.TextField label={t('dev.answer')} secret />}
      </form.AppField>
      <form.AppField name="notes">
        {(field) => <field.TextField label={t('dev.notes')} multiline />}
      </form.AppField>
      <Button onPress={() => void form.handleSubmit()}>{t('common.save')}</Button>
    </View>
  );
}

function SheetDemo() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  return (
    <>
      <Button variant="secondary" onPress={() => setOpen(true)}>
        {t('dev.openSheet')}
      </Button>
      <Sheet
        title={t('dev.sampleForm')}
        open={open}
        dirty={text.length > 0}
        onClose={() => {
          setOpen(false);
          setText('');
        }}
        footer={<Button onPress={() => setOpen(false)}>{t('common.save')}</Button>}
      >
        <Input label={t('dev.notes')} value={text} onChangeText={setText} multiline />
      </Sheet>
    </>
  );
}

/** Task 009 pieces for the dev gallery. */
export function FormsGallery() {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState(false);
  const [more, setMore] = useState(false);
  return (
    <View className="gap-6">
      <View className="-mx-4 bg-canvas">
        <ScreenHeader
          title={t('dev.sampleForm')}
          subtitle={t('dev.nameHint')}
          onBack={() => {}}
          action={{
            menu: [
              { label: t('common.edit'), icon: 'pencil', onPress: () => {} },
              { label: t('common.delete'), icon: 'trash-2', destructive: true, onPress: () => {} },
            ],
          }}
        />
        <ScreenHeader
          title={t('dev.category')}
          onBack={() => {}}
          close
          action={{ text: t('common.done'), onPress: () => {} }}
        />
      </View>
      <SampleForm onSaved={() => showToast({ message: t('common.save') })} />
      <SheetDemo />
      <Button variant="danger" onPress={() => setDialog(true)}>
        {t('dev.openDialog')}
      </Button>
      <AlertDialog
        open={dialog}
        onOpenChange={setDialog}
        title={t('dev.resetTitle')}
        description={t('dev.resetBody')}
        actionLabel={t('dev.resetAction')}
        cancelLabel={t('common.cancel')}
        destructive
        confirmText="RESET"
        confirmLabel={t('dev.typeReset')}
        onAction={() => setDialog(false)}
      />
      <Button
        variant="secondary"
        onPress={() =>
          showToast({
            message: t('dev.removed'),
            actionLabel: t('common.undo'),
            onAction: () => {},
          })
        }
      >
        {t('dev.showToast')}
      </Button>
      <View className="gap-2">
        <Button variant="ghost" block={false} onPress={() => setMore((m) => !m)}>
          {t('dev.more')}
        </Button>
        <Collapsible open={more}>
          <Text className="text-body text-ink-muted">{t('dev.resetBody')}</Text>
        </Collapsible>
      </View>
      <EmptyState
        icon="package"
        title={t('dev.emptyTitle')}
        actionLabel={t('dev.addProduct')}
        actionIcon="plus"
        onAction={() => {}}
        secondaryLabel={t('dev.importBackup')}
        onSecondary={() => {}}
      >
        {t('dev.emptyBody')}
      </EmptyState>
    </View>
  );
}
