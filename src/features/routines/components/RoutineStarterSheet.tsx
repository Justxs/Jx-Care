import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { RadioList } from '@/components/ui/radio-list';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { useProducts } from '@/features/products/api';
import { defaultProductFilters } from '@/features/products/types';
import { motion } from '@/theme/motion';

import { NEW_ROUTINE_ID, setRoutineDraft } from '../draft';
import {
  buildFromTemplate,
  draftFromTemplate,
  routineTemplates,
  type BuiltTemplate,
  type RoutineTemplate,
  type TemplateTimeOfDay,
} from '../templates';

export type RoutineStarterSheetProps = {
  open: boolean;
  onClose: () => void;
  /** The side the toggle starts on. */
  initialTimeOfDay?: TemplateTimeOfDay;
};

/**
 * R2 "Starting a routine": pick Morning or Evening and a template, see its steps filled from the
 * person's products, then Create routine opens the editor pre-filled. Nothing is saved here.
 * Mount it with a new `key` each time it opens so it starts from `initialTimeOfDay`.
 */
export function RoutineStarterSheet({
  open,
  onClose,
  initialTimeOfDay = 'morning',
}: RoutineStarterSheetProps) {
  const { t, i18n } = useTranslation();
  const [timeOfDay, setTimeOfDay] = useState<TemplateTimeOfDay>(initialTimeOfDay);
  const templates = routineTemplates[timeOfDay];
  const [templateId, setTemplateId] = useState<RoutineTemplate['id']>(templates[0]!.id);
  const template = templates.find((x) => x.id === templateId) ?? templates[0]!;
  const products = useProducts(defaultProductFilters, i18n.language).data;

  const built = useMemo(() => buildFromTemplate(template, products ?? []), [template, products]);
  const names = useMemo(() => new Map((products ?? []).map((p) => [p.id, p.name])), [products]);

  const create = () => {
    setRoutineDraft(draftFromTemplate(built, t));
    onClose();
    router.push(`/routines/${NEW_ROUTINE_ID}`);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('routines.new')}
      footer={<Button onPress={create}>{t('routines.starter.create')}</Button>}
    >
      <ToggleGroup
        accessibilityLabel={t('common.timeOfDay')}
        value={timeOfDay}
        onValueChange={(v) => {
          const next = v as TemplateTimeOfDay;
          setTimeOfDay(next);
          setTemplateId(routineTemplates[next][0]!.id);
        }}
        items={[
          { value: 'morning', label: t('common.morning') },
          { value: 'evening', label: t('common.evening') },
        ]}
      />
      <RadioList
        accessibilityLabel={t('routines.starter.template')}
        value={template.id}
        onValueChange={(v) => setTemplateId(v as RoutineTemplate['id'])}
        items={templates.map((x) => ({ value: x.id, label: t(x.nameKey) }))}
      />
      <View className="gap-2">
        <Text accessibilityRole="header" className="px-1 text-label text-ink-muted">
          {t('routines.starter.steps')}
        </Text>
        {/* Reserved height; a new template fades in over the old one, so the sheet never jumps. */}
        <View className="min-h-[176px]">
          <Animated.View
            key={template.id}
            entering={FadeIn.duration(motion.duration.base)}
            exiting={FadeOut.duration(motion.duration.fast)}
          >
            <StepPreview built={built} names={names} />
          </Animated.View>
        </View>
      </View>
    </Sheet>
  );
}

function StepPreview({
  built,
  names,
}: {
  built: BuiltTemplate;
  names: ReadonlyMap<number, string>;
}) {
  const { t } = useTranslation();
  if (built.steps.length === 0) {
    return (
      <Text className="px-1 py-3 text-body text-ink-muted">{t('routines.starter.noSteps')}</Text>
    );
  }
  return (
    <View testID="starter-preview">
      {built.steps.map((step, i) => {
        const product = step.productId !== null ? names.get(step.productId) : undefined;
        const gap = step.noteKey === null && !product;
        const line = step.noteKey ? t(step.noteKey) : (product ?? t('routines.starter.pickLater'));
        return (
          <View
            key={`${step.kind}-${i}`}
            accessible
            accessibilityLabel={`${t('common.stepOf', { index: i + 1, count: built.steps.length })}, ${t(step.labelKey)}, ${line}`}
            className="min-h-[56px] flex-row items-center gap-3 px-1 py-2"
          >
            <View className="h-[28px] w-[28px] items-center justify-center rounded-full bg-subtle">
              <Text className="text-label tabular-nums text-ink-muted">{i + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-caption text-ink-muted">{t(step.labelKey)}</Text>
              <Text className={gap ? 'text-body-strong text-warning' : 'text-body'}>{line}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
