import { useStore, type AnyFieldApi } from '@tanstack/react-form';
import { useSelector } from '@tanstack/react-store';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { BOTTOM_BAR_HEIGHT, BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { ChipField } from '@/components/ui/chip-field';
import { Chip } from '@/components/ui/chip';
import { useCloseGuard } from '@/components/ui/close-guard';
import { Collapsible } from '@/components/ui/collapsible';
import { DiscardDialog } from '@/components/ui/discard-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { useAppForm, useFieldError, useFormDirty } from '@/components/ui/form';
import { RadioList } from '@/components/ui/radio-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { WeekdayPicker } from '@/components/ui/weekday-picker';
import { hairOtherKinds, type HairOtherKind, type HairTaskKind } from '@/db/enums';
import { useProductsForPicker } from '@/features/products/api';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';
import { appStore } from '@/state/app';
import { showToast } from '@/state/ui';
import { motion } from '@/theme/motion';
import { askForReminders } from '@/notifications';

import { useDeleteHairTask, useHairTask, useSaveHairTask } from '../api';
import { HairProductPickerSheet } from '../components/HairProductPickerSheet';
import { defaultHairName, formNextDue, hairTaskIcon, isDefaultHairName } from '../display';
import type { HairProductRef, HairTaskDetail } from '../repo';
import {
  emptyHairTaskForm,
  hairTaskSchema,
  hairTaskToForm,
  type HairTaskFormValues,
} from '../schema';

/** The reminder time a switched-on reminder starts at. */
const DEFAULT_REMINDER_TIME = '19:00';

type Frequency = 'everyFewDays' | 'everyFewWeeks' | 'setDays';

/** R5 Hair task editor at `/routines/hair/[id]`; `new` makes a new task. */
export function HairTaskEditorScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id && params.id !== 'new' ? Number(params.id) : null;
  if (id !== null && Number.isFinite(id)) return <EditHairTask id={id} />;
  return <NewHairTask />;
}

function NewHairTask() {
  const { t } = useTranslation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const [initial] = useState<HairTaskFormValues>(() => ({
    ...emptyHairTaskForm(today),
    name: defaultHairName('wash', null, t),
  }));
  return <HairTaskForm initial={initial} known={[]} />;
}

function detailToForm(task: HairTaskDetail): HairTaskFormValues {
  return hairTaskToForm({
    name: task.name,
    kind: task.kind,
    otherKind: task.otherKind,
    productIds: task.productIds,
    scheduleKind: task.scheduleKind,
    everyNDays: task.everyNDays,
    intervalUnit: task.intervalUnit,
    daysOfWeek: task.daysOfWeek,
    lastDoneAt: task.lastDoneAt ?? '',
    reminderTime: task.reminderTime,
  });
}

function EditHairTask({ id }: { id: number }) {
  const { t } = useTranslation();
  const task = useHairTask(id);
  // The values the form starts from are kept once loaded, so refetches (or the task going away
  // after Delete) never reset or blank the form while it is on screen.
  const [loaded, setLoaded] = useState<{
    initial: HairTaskFormValues;
    known: HairProductRef[];
  } | null>(null);
  if (task.data && loaded === null) {
    setLoaded({ initial: detailToForm(task.data), known: task.data.products });
  }
  if (loaded) return <HairTaskForm taskId={id} initial={loaded.initial} known={loaded.known} />;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('hair.editor.editTitle')} onBack={() => router.back()} />
      {task.data === null ? (
        <EmptyState icon="info" title={t('hair.editor.missing')} />
      ) : (
        <View className="gap-4 p-4">
          <Skeleton height={42} />
          <Skeleton height={48} />
          <Skeleton height={112} />
          <Skeleton height={48} />
        </View>
      )}
    </SafeAreaView>
  );
}

/** "3" → 3; anything else → null. */
function whole(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
}

function frequencyOf(v: Pick<HairTaskFormValues, 'scheduleKind' | 'intervalUnit'>): Frequency {
  if (v.scheduleKind === 'days') return 'setDays';
  return v.intervalUnit === 'weeks' ? 'everyFewWeeks' : 'everyFewDays';
}

function HairTaskForm({
  taskId,
  initial,
  known,
}: {
  taskId?: number;
  initial: HairTaskFormValues;
  /** The task's saved products, so archived ones still show their names. */
  known: readonly HairProductRef[];
}) {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const navigation = useNavigation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const schema = useMemo(() => hairTaskSchema(today), [today]);
  const saveTask = useSaveHairTask();
  const deleteTask = useDeleteHairTask();
  const pickerProducts = useProductsForPicker({ area: 'hair' }, i18n.language).data;
  const leaving = useRef(false);
  const [picker, setPicker] = useState({ open: false, key: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const productNames = useMemo(() => {
    const names = new Map<number, string>(known.map((p) => [p.id, p.name]));
    for (const p of pickerProducts ?? []) names.set(p.id, p.name);
    return names;
  }, [known, pickerProducts]);

  const form = useAppForm({
    schema,
    defaultValues: initial,
    onSubmit: async (value) => {
      await saveTask.mutateAsync({ id: taskId, input: value });
      showToast({
        message: t(taskId === undefined ? 'hair.editor.addedToast' : 'hair.editor.savedToast', {
          name: value.name,
        }),
      });
      leaving.current = true;
      router.back();
    },
  });
  const dirty = useFormDirty(form);
  const submitting = useStore(form.store, (s) => s.isSubmitting);
  const kind = useStore(form.store, (s) => s.values.kind);

  const close = () => {
    leaving.current = true;
    router.back();
  };
  const guard = useCloseGuard({ dirty, onClose: close });

  // Android back and any other way of leaving go through the same "Discard changes?".
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (leaving.current || !dirty) return;
        e.preventDefault();
        guard.setConfirmOpen(true);
      }),
    [navigation, dirty, guard],
  );

  // Values set from code skip the blur that validates, so check again: an error that no longer
  // applies (or a new one, after a Save attempt) shows at once, and Save is never stuck on it.
  const revalidate = () => void form.validate('blur');

  const setKind = (next: HairTaskKind) => {
    const v = form.state.values;
    if (next === v.kind) return;
    const otherKind: HairOtherKind | null = next === 'wash' ? null : (v.otherKind ?? 'trim');
    form.setFieldValue('kind', next);
    form.setFieldValue('otherKind', otherKind);
    if (isDefaultHairName(v.name, t))
      form.setFieldValue('name', defaultHairName(next, otherKind, t));
    // Every few weeks is for other care only: a wash keeps the same interval in days.
    if (next === 'wash' && v.scheduleKind === 'interval' && v.intervalUnit === 'weeks') {
      const n = whole(v.interval);
      form.setFieldValue('intervalUnit', 'days');
      if (n !== null) form.setFieldValue('interval', String(n * 7));
    }
    revalidate();
  };

  const setOtherKind = (next: HairOtherKind) => {
    const v = form.state.values;
    form.setFieldValue('otherKind', next);
    if (isDefaultHairName(v.name, t)) form.setFieldValue('name', defaultHairName('other', next, t));
    revalidate();
  };

  const setFrequency = (next: Frequency) => {
    const v = form.state.values;
    if (next === 'setDays') {
      form.setFieldValue('scheduleKind', 'days');
      revalidate();
      return;
    }
    form.setFieldValue('scheduleKind', 'interval');
    const unit = next === 'everyFewWeeks' ? 'weeks' : 'days';
    if (unit === v.intervalUnit) {
      revalidate();
      return;
    }
    const n = whole(v.interval);
    if (n !== null && unit === 'days') form.setFieldValue('interval', String(n * 7));
    if (n !== null && unit === 'weeks' && n % 7 === 0)
      form.setFieldValue('interval', String(n / 7));
    form.setFieldValue('intervalUnit', unit);
    revalidate();
  };

  const remove = async () => {
    if (taskId === undefined) return;
    setConfirmDelete(false);
    leaving.current = true;
    await deleteTask.mutateAsync(taskId);
    showToast({ message: t('hair.editor.deletedToast', { name: initial.name }) });
    router.back();
  };

  const frequencyItems = [
    {
      value: 'everyFewDays',
      label: t('common.everyFewDays'),
      detail: t('hair.editor.everyFewDaysDetail'),
    },
    ...(kind === 'other'
      ? [
          {
            value: 'everyFewWeeks',
            label: t('hair.editor.everyFewWeeks'),
            detail: t('hair.editor.everyFewWeeksDetail'),
          },
        ]
      : []),
    { value: 'setDays', label: t('common.setDays'), detail: t('hair.editor.setDaysDetail') },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader
        title={taskId === undefined ? t('hair.editor.newTitle') : t('hair.editor.editTitle')}
        onBack={guard.requestClose}
      />
      <KeyboardAwareScrollView
        bottomOffset={BOTTOM_BAR_HEIGHT + 16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 4, paddingBottom: 32 }}
      >
        <Field label={t('hair.editor.type')} noHelper>
          <ToggleGroup
            accessibilityLabel={t('hair.editor.type')}
            value={kind}
            onValueChange={(v) => setKind(v as HairTaskKind)}
            items={[
              { value: 'wash', label: t('hair.editor.wash') },
              { value: 'other', label: t('common.otherCare') },
            ]}
          />
        </Field>
        {/* Reserved line: the caption swaps in place. */}
        <View className="min-h-[36px] pt-1.5">
          <Text testID="hair-type-caption" className="text-caption text-ink-muted">
            {kind === 'wash' ? t('hair.editor.washCaption') : t('hair.editor.otherCaption')}
          </Text>
        </View>

        <Collapsible open={kind === 'other'}>
          <form.Subscribe selector={(s) => s.values.otherKind}>
            {(otherKind) => (
              <ChipField
                label={t('hair.editor.kind')}
                single
                allowEmpty={false}
                noHelper
                className="pb-4"
                value={otherKind ? [otherKind] : []}
                onValueChange={([v]) => {
                  if (v) setOtherKind(v as HairOtherKind);
                }}
                items={hairOtherKinds.map((k) => ({
                  value: k,
                  label: t(`hair.kinds.${k}`),
                  icon: hairTaskIcon('other', k) ?? undefined,
                }))}
              />
            )}
          </form.Subscribe>
        </Collapsible>

        <form.AppField name="name">
          {(field) => <field.TextField label={t('hair.editor.name')} autoCapitalize="sentences" />}
        </form.AppField>

        <Collapsible open={kind === 'wash'}>
          <form.Field name="productIds">
            {(field) => {
              const ids = field.state.value.filter((id) => productNames.has(id));
              return (
                <Field label={t('hair.editor.products')} className="pb-1">
                  {ids.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {ids.map((id) => {
                        const label = productNames.get(id) ?? '';
                        return (
                          <Chip
                            key={id}
                            selected
                            icon="x"
                            accessibilityLabel={t('hair.editor.removeProduct', { name: label })}
                            onPressedChange={() =>
                              field.handleChange(field.state.value.filter((x) => x !== id))
                            }
                          >
                            {label}
                          </Chip>
                        );
                      })}
                    </View>
                  ) : (
                    <Text className="text-body text-ink-muted">{t('hair.editor.noProducts')}</Text>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    block={false}
                    icon={ids.length > 0 ? 'pencil' : 'plus'}
                    onPress={() => setPicker((p) => ({ open: true, key: p.key + 1 }))}
                    className="mt-1"
                  >
                    {ids.length > 0
                      ? t('hair.editor.changeProducts')
                      : t('hair.editor.pickProducts')}
                  </Button>
                  <HairProductPickerSheet
                    key={picker.key}
                    open={picker.open}
                    onClose={() => setPicker((p) => ({ ...p, open: false }))}
                    selected={field.state.value}
                    onPick={field.handleChange}
                  />
                </Field>
              );
            }}
          </form.Field>
        </Collapsible>

        <form.Subscribe
          selector={(s) => ({ scheduleKind: s.values.scheduleKind, unit: s.values.intervalUnit })}
        >
          {(v) => {
            const frequency = frequencyOf({ scheduleKind: v.scheduleKind, intervalUnit: v.unit });
            return (
              <View className="gap-3">
                <Field label={t('hair.editor.frequency')} noHelper>
                  <RadioList
                    accessibilityLabel={t('hair.editor.frequency')}
                    value={frequency}
                    onValueChange={(next) => setFrequency(next as Frequency)}
                    items={frequencyItems}
                  />
                </Field>
                {/* The detail cross-fades inside a reserved box, so the fields below never jump. */}
                <View className="min-h-[96px]">
                  <Animated.View
                    key={frequency === 'setDays' ? 'days' : 'interval'}
                    entering={FadeIn.duration(motion.duration.base)}
                    exiting={FadeOut.duration(motion.duration.fast)}
                  >
                    {frequency === 'setDays' ? (
                      <form.Field name="daysOfWeek">
                        {(field) => <DaysField field={field} label={t('hair.editor.days')} />}
                      </form.Field>
                    ) : (
                      <form.AppField name="interval">
                        {(field) => (
                          <field.TextField
                            label={
                              frequency === 'everyFewWeeks'
                                ? t('hair.editor.repeatEveryWeeks')
                                : t('common.repeatEveryDays')
                            }
                            keyboard="numeric"
                            className="w-[200px]"
                          />
                        )}
                      </form.AppField>
                    )}
                  </Animated.View>
                </View>
              </View>
            );
          }}
        </form.Subscribe>

        <form.AppField name="lastDoneAt">
          {(field) => (
            <field.DateField
              label={t('hair.editor.lastDone')}
              hint={t('hair.editor.lastDoneHint')}
              max={today}
            />
          )}
        </form.AppField>

        <form.Subscribe selector={(s) => s.values}>
          {(values) => {
            const due = formNextDue(values, today);
            const late = due !== null && due < today;
            return (
              // Fixed height: the line changes with every field but never moves the rest.
              <View className="min-h-[48px] justify-center rounded-md bg-subtle px-3 py-2">
                <Text
                  testID="hair-next-due"
                  accessibilityLiveRegion="polite"
                  className={cn('text-body-strong', late && 'text-warning')}
                >
                  {due === null
                    ? ''
                    : late
                      ? t('hair.editor.overdueSince', { date: f.weekdayDate(due) })
                      : t('hair.editor.nextDue', { date: f.weekdayDate(due) })}
                </Text>
              </View>
            );
          }}
        </form.Subscribe>

        <form.Field name="reminderOn">
          {(field) => (
            <View className="pt-3">
              <View className="min-h-[48px] flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-body">{t('hair.editor.reminder')}</Text>
                <Switch
                  checked={field.state.value}
                  onCheckedChange={(on) => {
                    field.handleChange(on);
                    if (on && !form.state.values.reminderTime) {
                      form.setFieldValue('reminderTime', DEFAULT_REMINDER_TIME);
                    }
                    field.handleBlur();
                    // The first reminder switched on asks for notification permission.
                    if (on) void askForReminders({ reason: 'hair' });
                  }}
                  accessibilityLabel={t('hair.editor.reminder')}
                />
              </View>
              <Collapsible open={field.state.value}>
                <form.AppField name="reminderTime">
                  {(time) => <time.TimeField label={t('hair.editor.reminderTime')} />}
                </form.AppField>
              </Collapsible>
            </View>
          )}
        </form.Field>

        {taskId !== undefined ? (
          <Button
            variant="danger"
            icon="trash-2"
            onPress={() => setConfirmDelete(true)}
            className="mt-4"
          >
            {t('hair.editor.delete')}
          </Button>
        ) : null}
      </KeyboardAwareScrollView>

      <BottomBar>
        <Button loading={submitting} onPress={() => void form.handleSubmit()}>
          {t('hair.editor.save')}
        </Button>
      </BottomBar>

      <DiscardDialog
        open={guard.confirmOpen}
        onDiscard={guard.discard}
        onKeepEditing={guard.keepEditing}
      />
      <AlertDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('hair.editor.deleteTitle', { name: initial.name })}
        description={
          initial.kind === 'wash'
            ? t('hair.editor.deleteBodyWash')
            : t('hair.editor.deleteBodyOther')
        }
        actionLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onAction={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </SafeAreaView>
  );
}

/** Set days: the seven day toggles with the form's error in the reserved line. */
function DaysField({ field, label }: { field: AnyFieldApi; label: string }) {
  const error = useFieldError(field);
  return (
    <Field label={label} error={error}>
      <WeekdayPicker
        accessibilityLabel={label}
        value={field.state.value as number[]}
        onValueChange={(days) => {
          field.handleChange(days);
          field.handleBlur();
        }}
      />
    </Field>
  );
}
