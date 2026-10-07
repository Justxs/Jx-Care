import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useStore } from '@tanstack/react-form';
import { useSelector } from '@tanstack/react-store';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { ModalSheet } from '@/components/ModalSheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { useAppForm, useFormDirty } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useProductsForPicker } from '@/features/products/api';
import { useFormat } from '@/i18n/useFormat';
import { appStore } from '@/state/app';
import { uiStore } from '@/state/ui';
import { motion } from '@/theme/motion';

import { useHairTask, useMarkHairDone } from '../api';
import type { HairTaskDetail } from '../repo';
import { hairDoneSchema, type HairDoneFormValues } from '../schema';
import { HairProductPickerSheet } from './HairProductPickerSheet';

/** How long "Next wash: Friday, 9 Oct" stays before the sheet closes by itself. */
export const NEXT_LINE_MS = 1800;

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export type HairDoneSheetProps = { taskId: number };

/**
 * T3 Hair task done, the sheet the `/hair/done/[taskId]` route shows (from Today's hair rows and
 * a hair reminder). Its own sheet provider keeps the product picker and the iOS date picker above
 * this modal screen.
 */
export function HairDoneSheet({ taskId }: HairDoneSheetProps) {
  return (
    <BottomSheetModalProvider>
      <HairDoneContent taskId={taskId} />
    </BottomSheetModalProvider>
  );
}

function HairDoneContent({ taskId }: HairDoneSheetProps) {
  const { t } = useTranslation();
  const task = useHairTask(taskId);
  // The task as it was when the sheet opened: refetches after saving never reset the form.
  const [loaded, setLoaded] = useState<HairTaskDetail | null>(null);
  if (task.data && loaded === null) setLoaded(task.data);

  if (loaded) return <HairDoneForm task={loaded} />;
  return (
    <ModalSheet title={t('screens.hairDone')}>
      {task.data === null ? (
        <EmptyState icon="info" title={t('hair.editor.missing')} />
      ) : (
        <View className="gap-4">
          <Skeleton height={48} />
          <Skeleton height={36} />
          <Skeleton height={48} />
        </View>
      )}
    </ModalSheet>
  );
}

/** "Next wash: Friday, 9 Oct", "Next trim: …". */
function nextLineKey(task: Pick<HairTaskDetail, 'kind' | 'otherKind'>): string {
  if (task.kind === 'wash') return 'hair.done.next.wash';
  return `hair.done.next.${task.otherKind ?? 'other'}`;
}

function HairDoneForm({ task }: { task: HairTaskDetail }) {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const today = useSelector(appStore, (s) => s.activeDay);
  const schema = useMemo(() => hairDoneSchema(today), [today]);
  const markDone = useMarkHairDone();
  const isWash = task.kind === 'wash';
  const pickerProducts = useProductsForPicker({ area: 'hair' }, i18n.language).data;
  const [picker, setPicker] = useState({ open: false, key: 0 });
  // Chips stay on screen once shown, so unselecting one never moves the others.
  const [shown, setShown] = useState<number[]>(() => task.products.map((p) => p.id));
  const [nextDue, setNextDue] = useState<string | null>(null);

  const names = useMemo(() => {
    const map = new Map<number, string>(task.products.map((p) => [p.id, p.name]));
    for (const p of pickerProducts ?? []) map.set(p.id, p.name);
    return map;
  }, [task.products, pickerProducts]);

  const [initial] = useState<HairDoneFormValues>(() => ({
    day: today,
    productIds: isWash ? task.products.map((p) => p.id) : [],
    note: '',
  }));
  const form = useAppForm({
    schema,
    defaultValues: initial,
    onSubmit: async (value) => {
      const result = await markDone.mutateAsync({ taskId: task.id, ...value });
      setNextDue(result.nextDue);
    },
  });
  const dirty = useFormDirty(form);
  const submitting = useStore(form.store, (s) => s.isSubmitting);

  const nextText = nextDue ? t(nextLineKey(task), { date: f.weekdayDate(nextDue) }) : null;

  // The next due line shows for a moment, then the sheet closes (it stays for a screen reader
  // until tapped, like toasts do).
  useEffect(() => {
    if (!nextText) return;
    AccessibilityInfo.announceForAccessibility(nextText);
    if (uiStore.state.screenReaderOn) return;
    const id = setTimeout(close, NEXT_LINE_MS);
    return () => clearTimeout(id);
  }, [nextText]);

  const onPick = useCallback((ids: number[], setIds: (ids: number[]) => void) => {
    setIds(ids);
    setShown((s) => [...s, ...ids.filter((id) => !s.includes(id))]);
  }, []);

  let footer: ReactNode;
  if (nextText) {
    footer = (
      <Animated.View entering={FadeIn.duration(motion.duration.base)}>
        <Pressable
          testID="hair-done-next"
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('hair.done.nextLabel', { text: nextText })}
          accessibilityLiveRegion="polite"
          className="min-h-[52px] items-center justify-center rounded-md bg-hair-soft px-4 py-3 active:opacity-85"
        >
          <Text className="text-center text-body-strong text-hair">{nextText}</Text>
        </Pressable>
      </Animated.View>
    );
  } else {
    footer = (
      <Button loading={submitting} onPress={() => void form.handleSubmit()}>
        {t('hair.done.markDone')}
      </Button>
    );
  }

  return (
    <ModalSheet
      title={task.name}
      dirty={dirty && !nextDue}
      // Same height before and after: the button and the next due line are both 52 pt.
      footer={<View className="min-h-[52px] justify-center">{footer}</View>}
    >
      <View>
        <form.AppField name="day">
          {(field) => <field.DateField label={t('hair.done.date')} max={today} />}
        </form.AppField>

        {isWash ? (
          <form.Field name="productIds">
            {(field) => {
              const selected = field.state.value;
              const visible = shown.filter((id) => names.has(id));
              return (
                <Field label={t('hair.done.products')}>
                  <View
                    accessibilityLabel={t('hair.done.products')}
                    className="flex-row flex-wrap gap-2"
                  >
                    {visible.map((id) => (
                      <Chip
                        key={id}
                        selected={selected.includes(id)}
                        onPressedChange={(on) =>
                          field.handleChange(
                            on ? [...selected, id] : selected.filter((x) => x !== id),
                          )
                        }
                      >
                        {names.get(id) ?? ''}
                      </Chip>
                    ))}
                    <Chip
                      icon="plus"
                      accessibilityLabel={t('hair.done.addProduct')}
                      onPressedChange={() => setPicker((p) => ({ open: true, key: p.key + 1 }))}
                    >
                      {t('hair.done.addProduct')}
                    </Chip>
                  </View>
                  <HairProductPickerSheet
                    key={picker.key}
                    open={picker.open}
                    onClose={() => setPicker((p) => ({ ...p, open: false }))}
                    selected={selected}
                    onPick={(ids) => onPick(ids, field.handleChange)}
                  />
                </Field>
              );
            }}
          </form.Field>
        ) : null}

        <form.AppField name="note">
          {(field) => (
            <field.TextField
              label={t('hair.done.note')}
              hint={t('hair.done.noteHint')}
              multiline
              autoCapitalize="sentences"
            />
          )}
        </form.AppField>
      </View>
    </ModalSheet>
  );
}
