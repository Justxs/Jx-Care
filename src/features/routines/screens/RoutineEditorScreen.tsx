import type { AnyFieldApi } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-form';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { BOTTOM_BAR_HEIGHT, BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { useCloseGuard } from '@/components/ui/close-guard';
import { Collapsible } from '@/components/ui/collapsible';
import { DiscardDialog } from '@/components/ui/discard-dialog';
import { Field } from '@/components/ui/field';
import { useAppForm, useFieldError, useFormDirty } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { TimeField } from '@/components/ui/date-field';
import { WeekdayPicker } from '@/components/ui/weekday-picker';
import type { TimeOfDay } from '@/db/enums';
import { useConflictSheets } from '@/features/conflicts/components/ConflictSheets';
import { useProductsForPicker } from '@/features/products/api';
import { endAddProductForPick } from '@/features/products/pickReturn';
import { useFormat } from '@/i18n/useFormat';
import { showToast } from '@/state/ui';

import { useDeleteRoutine, useRoutine, useSaveRoutine } from '../api';
import { EditorConflictPanel } from '../components/EditorConflictPanel';
import { editorProductMap, type EditorProduct } from '../components/editorProducts';
import { StepEditorSheet } from '../components/StepEditorSheet';
import { StepList } from '../components/StepList';
import type { StepRowData } from '../components/StepRow';
import { NEW_ROUTINE_ID, routineDraftStore, takeRoutineDraft } from '../draft';
import {
  defaultReminderTime,
  newStep,
  routineToForm,
  sortTimeFor,
  stepProblem,
  toSaveInput,
  withStepKeys,
} from '../editor';
import type { StepProduct } from '../repo';
import { askForRoutineReminders } from '../reminders';
import { moveItem } from '../reorder';
import {
  emptyRoutineForm,
  everyDay,
  routineSchema,
  type RoutineFormValues,
  type StepFormValues,
} from '../schema';
import { useEditorConflicts } from '../useRoutineConflicts';

/**
 * R2 routine editor. `/routines/new` starts from the starter sheet's draft (or empty);
 * `/routines/<id>` edits a saved routine. Everything, steps included, is saved in one go.
 */
export function RoutineEditorScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  if (params.id === NEW_ROUTINE_ID) return <NewRoutine />;
  return <EditRoutine id={Number(params.id)} />;
}

function NewRoutine() {
  // Read without clearing while rendering (a re-render must see the same draft), clear after.
  const [start] = useState(() => {
    const draft = routineDraftStore.state.draft;
    return { initial: withStepKeys(draft ?? emptyRoutineForm()), fromDraft: draft !== null };
  });
  useEffect(() => {
    takeRoutineDraft();
  }, []);
  return <RoutineForm routineId={null} initial={start.initial} startsDirty={start.fromDraft} />;
}

function EditRoutine({ id }: { id: number }) {
  const { t } = useTranslation();
  const routine = useRoutine(id);
  // The form starts from the first load only; refetches after saving must not reset it.
  const [initial, setInitial] = useState<RoutineFormValues | null>(null);
  if (initial === null && routine.data) setInitial(withStepKeys(routineToForm(routine.data)));

  const stepProducts = useMemo(
    () => (routine.data?.steps ?? []).flatMap((s) => (s.product ? [s.product] : [])),
    [routine.data],
  );

  if (initial) {
    return (
      <RoutineForm
        routineId={id}
        initial={initial}
        startsDirty={false}
        stepProducts={stepProducts}
      />
    );
  }
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('routines.editor.editTitle')} onBack={() => router.back()} />
      {routine.data === null || routine.isError ? (
        <Text className="px-4 py-6 text-body text-ink-muted">{t('routines.editor.notFound')}</Text>
      ) : (
        <View className="gap-4 p-4">
          <Skeleton height={48} />
          <Skeleton height={36} width="70%" />
          <Skeleton height={40} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      )}
    </SafeAreaView>
  );
}

/** Gives a custom field its error the same way the built-in fields do. */
function WithError({
  field,
  children,
}: {
  field: AnyFieldApi;
  children: (error: string | undefined) => ReactNode;
}) {
  return children(useFieldError(field));
}

type StepEditorState = {
  open: boolean;
  key: number;
  /** Null while adding a step. */
  index: number | null;
  initial: StepFormValues;
};

const NO_PRODUCTS: readonly StepProduct[] = [];

function RoutineForm({
  routineId,
  initial,
  startsDirty,
  stepProducts = NO_PRODUCTS,
}: {
  routineId: number | null;
  initial: RoutineFormValues;
  /** A draft from the starter is unsaved work from the first frame. */
  startsDirty: boolean;
  stepProducts?: readonly StepProduct[];
}) {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const navigation = useNavigation();
  const save = useSaveRoutine();
  const del = useDeleteRoutine();
  const active = useProductsForPicker({ area: 'all' }, i18n.language).data;
  const products = useMemo(
    () => editorProductMap(stepProducts, active ?? []),
    [stepProducts, active],
  );

  const leaving = useRef(false);
  /** Set while Add product is open from the picker: the step editor opens again on return. */
  const returning = useRef(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stepEditor, setStepEditor] = useState<StepEditorState>({
    open: false,
    key: 0,
    index: null,
    initial: initial.steps[0] ?? newStep([]),
  });

  const form = useAppForm({
    schema: routineSchema,
    defaultValues: initial,
    onSubmit: async (value) => {
      await save.mutateAsync(toSaveInput(value, routineId));
      showToast({ message: t('routines.editor.savedToast', { name: value.name }) });
      leaving.current = true;
      router.back();
    },
  });
  const formDirty = useFormDirty(form);
  const dirty = formDirty || startsDirty;
  const submitting = useStore(form.store, (s) => s.isSubmitting);
  const values = useStore(form.store, (s) => s.values);
  const conflicts = useEditorConflicts({
    id: routineId,
    name: values.name,
    timeOfDay: values.timeOfDay,
    customName: values.customName,
    sortTime: values.sortTime,
    daysOfWeek: values.daysOfWeek,
    steps: values.steps,
  });
  // Already in the editor: the conflict sheet offers "See the rule" only.
  const conflictSheets = useConflictSheets();

  const close = () => {
    leaving.current = true;
    router.back();
  };
  const guard = useCloseGuard({ dirty, onClose: close });

  // Android back and swipe-back go through the same "Discard changes?".
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (leaving.current || !dirty) return;
        e.preventDefault();
        guard.setConfirmOpen(true);
      }),
    [navigation, dirty, guard],
  );
  // Back from Add product (opened from the picker): show the step editor again.
  useEffect(
    () =>
      navigation.addListener('focus', () => {
        if (!returning.current) return;
        returning.current = false;
        endAddProductForPick();
        setStepEditor((s) => ({ ...s, open: true }));
      }),
    [navigation],
  );

  const setSteps = useCallback(
    (steps: StepFormValues[]) => {
      form.setFieldValue('steps', steps);
      void form.validate('blur');
    },
    [form],
  );
  // Stable, so a drag in progress is never cancelled by a re-render.
  const moveStep = useCallback(
    (from: number, to: number) => setSteps(moveItem(form.state.values.steps, from, to)),
    [form, setSteps],
  );
  const onDragActive = useCallback((on: boolean) => setScrollEnabled(!on), []);
  const openStep = (index: number | null) => {
    const steps = form.state.values.steps;
    setStepEditor((s) => ({
      open: true,
      key: s.key + 1,
      index,
      initial: index === null ? newStep(steps) : (steps[index] ?? newStep(steps)),
    }));
  };
  const saveStep = (step: StepFormValues) => {
    const steps = form.state.values.steps;
    const index = stepEditor.index;
    setSteps(index === null ? [...steps, step] : steps.map((s, i) => (i === index ? step : s)));
  };

  const stepConflict = (index: number): StepRowData['conflict'] => {
    const targets = conflicts.steps.get(index);
    if (!targets?.length) return null;
    // A step is only "mild" when every conflict it has is mild.
    return { mild: targets.every((c) => c.mild), onPress: () => conflictSheets.open(targets) };
  };
  const rows = values.steps.map((s, i) =>
    stepRow(s, values.daysOfWeek, products, stepConflict(i), f, t),
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader
        title={routineId === null ? t('routines.editor.newTitle') : t('routines.editor.editTitle')}
        onBack={guard.requestClose}
      />
      <KeyboardAwareScrollView
        bottomOffset={BOTTOM_BAR_HEIGHT + 16}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ padding: 16, gap: 4, paddingBottom: 32 }}
      >
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label={t('routines.editor.name')}
              placeholder={t('routines.editor.namePlaceholder')}
              autoCapitalize="sentences"
              maxLength={60}
            />
          )}
        </form.AppField>

        <form.Field name="timeOfDay">
          {(field) => (
            <Field label={t('common.timeOfDay')} noHelper>
              <ChipGroup
                single
                allowEmpty={false}
                accessibilityLabel={t('common.timeOfDay')}
                value={[field.state.value]}
                onValueChange={([v]) => {
                  if (!v) return;
                  const next = v as TimeOfDay;
                  field.handleChange(next);
                  form.setFieldValue('sortTime', sortTimeFor(next, form.state.values.sortTime));
                }}
                items={[
                  { value: 'morning', label: t('common.morning') },
                  { value: 'evening', label: t('common.evening') },
                  { value: 'custom', label: t('common.custom') },
                ]}
              />
            </Field>
          )}
        </form.Field>
        <Collapsible open={values.timeOfDay === 'custom'}>
          <View className="pt-4">
            <form.Field name="customName">
              {(field) => (
                <WithError field={field}>
                  {(error) => (
                    <Input
                      label={t('routines.editor.customName')}
                      placeholder={t('routines.editor.customNamePlaceholder')}
                      value={field.state.value ?? ''}
                      onChangeText={field.handleChange}
                      onBlur={field.handleBlur}
                      error={error}
                      maxLength={30}
                      autoCapitalize="sentences"
                    />
                  )}
                </WithError>
              )}
            </form.Field>
            <form.Field name="sortTime">
              {(field) => (
                <WithError field={field}>
                  {(error) => (
                    <TimeField
                      label={t('routines.editor.customTime')}
                      hint={t('routines.editor.customTimeHint')}
                      value={field.state.value}
                      onChange={(hhmm) => {
                        field.handleChange(hhmm);
                        field.handleBlur();
                      }}
                      error={error}
                    />
                  )}
                </WithError>
              )}
            </form.Field>
          </View>
        </Collapsible>
        <View className="h-4" />

        <form.Field name="daysOfWeek">
          {(field) => (
            <WithError field={field}>
              {(error) => {
                const all = everyDay.every((d) => field.state.value.includes(d));
                return (
                  <Field label={t('routines.editor.days')} error={error}>
                    <WeekdayPicker
                      accessibilityLabel={t('routines.editor.days')}
                      value={field.state.value}
                      onValueChange={(days) => {
                        field.handleChange(days);
                        field.handleBlur();
                      }}
                    />
                    <Chip
                      selected={all}
                      className="mt-1 self-start"
                      onPressedChange={() => {
                        field.handleChange([...everyDay]);
                        field.handleBlur();
                      }}
                    >
                      {t('common.everyDay')}
                    </Chip>
                  </Field>
                );
              }}
            </WithError>
          )}
        </form.Field>

        <form.Field name="reminderTime">
          {(field) => (
            <WithError field={field}>
              {(error) => (
                <View>
                  <View className="min-h-[48px] flex-row items-center justify-between gap-3">
                    <Text className="flex-1 text-body">{t('routines.editor.reminder')}</Text>
                    <Switch
                      checked={field.state.value !== null}
                      accessibilityLabel={t('routines.editor.reminder')}
                      onCheckedChange={(on) => {
                        field.handleChange(on ? defaultReminderTime(form.state.values) : null);
                        // Asks for notifications in context (refinement 8).
                        if (on) void askForRoutineReminders();
                      }}
                    />
                  </View>
                  <Collapsible open={field.state.value !== null}>
                    <TimeField
                      label={t('routines.editor.reminderTime')}
                      value={field.state.value}
                      onChange={(hhmm) => {
                        field.handleChange(hhmm);
                        field.handleBlur();
                      }}
                      error={error}
                    />
                  </Collapsible>
                </View>
              )}
            </WithError>
          )}
        </form.Field>
        <View className="h-4" />

        <form.Field name="steps">
          {(field) => (
            <WithError field={field}>
              {(error) => (
                <View className="gap-2">
                  <Text accessibilityRole="header" className="text-title-s">
                    {t('routines.editor.steps')}
                  </Text>
                  {rows.length === 0 ? (
                    <Text className="text-body text-ink-muted">{t('routines.editor.noSteps')}</Text>
                  ) : (
                    <StepList
                      steps={rows}
                      onPress={openStep}
                      onMove={moveStep}
                      onRemove={(index) =>
                        setSteps(form.state.values.steps.filter((_, i) => i !== index))
                      }
                      onDragActive={onDragActive}
                    />
                  )}
                  <Button
                    variant="secondary"
                    icon="plus"
                    onPress={() => openStep(null)}
                    testID="add-step"
                  >
                    {t('routines.editor.addStep')}
                  </Button>
                  {/* Reserved line for "Add at least one step." */}
                  <View testID="field-helper" className="min-h-[18px]">
                    {error ? (
                      <Text accessibilityLiveRegion="polite" className="text-caption text-danger">
                        {error}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}
            </WithError>
          )}
        </form.Field>

        <EditorConflictPanel
          hits={conflicts.hits}
          alternatives={conflicts.alternatives}
          onExplainMild={() =>
            conflictSheets.openMild(
              [...conflicts.steps.values()].flat().find((c) => c.mild)?.mildStep ?? null,
            )
          }
        />

        {routineId !== null ? (
          <Pressable
            onPress={() => setDeleteOpen(true)}
            accessibilityRole="button"
            className="mt-6 min-h-[52px] flex-row items-center justify-center gap-2 rounded-lg active:bg-danger-soft"
          >
            <Icon name="trash-2" size={20} tone="danger" />
            <Text className="text-body-strong text-danger">
              {t('routines.editor.deleteRoutine')}
            </Text>
          </Pressable>
        ) : null}
      </KeyboardAwareScrollView>

      <BottomBar>
        <Button loading={submitting} onPress={() => void form.handleSubmit()}>
          {t('routines.editor.save')}
        </Button>
      </BottomBar>

      <StepEditorSheet
        key={stepEditor.key}
        open={stepEditor.open}
        onClose={() => setStepEditor((s) => ({ ...s, open: false }))}
        initial={stepEditor.initial}
        isNew={stepEditor.index === null}
        routineDays={values.daysOfWeek}
        products={products}
        onSave={saveStep}
        onLeaveForProduct={() => {
          returning.current = true;
          setStepEditor((s) => ({ ...s, open: false }));
        }}
      />
      {conflictSheets.element}
      <DiscardDialog
        open={guard.confirmOpen}
        onDiscard={guard.discard}
        onKeepEditing={guard.keepEditing}
      />
      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('routines.deleteTitle', { name: initial.name })}
        description={t('routines.deleteBody')}
        actionLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onAction={() => {
          setDeleteOpen(false);
          if (routineId === null) return;
          leaving.current = true;
          del.mutate(routineId);
          router.back();
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </SafeAreaView>
  );
}

/** What a step's row shows, from its values and the routine's days. */
function stepRow(
  step: StepFormValues,
  routineDays: readonly number[],
  products: ReadonlyMap<number, EditorProduct>,
  conflict: StepRowData['conflict'],
  f: ReturnType<typeof useFormat>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): StepRowData {
  const product = step.productId !== null ? products.get(step.productId) : undefined;
  const n = typeof step.everyNDays === 'string' ? Number(step.everyNDays) : step.everyNDays;
  const problem = stepProblem(step, routineDays);
  return {
    key: String(step.id),
    product: product
      ? {
          name: product.name,
          photoUri: product.photoUri,
          category: product.category,
          problem: product.problem,
        }
      : null,
    note: step.note?.trim() ? step.note.trim() : null,
    schedule:
      step.scheduleKind === 'days' && step.daysOfWeek?.length
        ? f.weekdayList(step.daysOfWeek)
        : step.scheduleKind === 'interval' && n
          ? t('routines.editor.everyNDays', { count: n })
          : null,
    wait: step.waitSeconds > 0 ? f.duration(step.waitSeconds) : null,
    conflict,
    error: problem ? t(problem) : null,
  };
}
