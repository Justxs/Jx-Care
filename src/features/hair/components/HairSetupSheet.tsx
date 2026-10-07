import { useSelector } from '@tanstack/react-store';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ChipField } from '@/components/ui/chip-field';
import { Collapsible } from '@/components/ui/collapsible';
import { DateField } from '@/components/ui/date-field';
import { Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { addDays } from '@/lib/appDay';
import type { QuickWashFrequency } from '@/lib/hair';
import { appStore } from '@/state/app';

import { useQuickHairSetup } from '../api';
import { quickSetupNextDue } from '../display';
import { quickHairSetupSchema, quickWashFrequencies } from '../schema';

/** Where "Other" in the frequency chips goes: the full editor for a new task. */
export const NEW_HAIR_TASK_HREF = '/routines/hair/new';

type LastChoice = 'today' | 'yesterday' | 'twoDaysAgo' | 'pick';

export type HairSetupSheetProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Quick hair setup (R5): how often, the last wash, a live "Next wash" line and "Also track trims".
 * Save creates the wash task (and the trim task). Opened from the Hair empty state and Today's
 * setup row 3; mount it with a new `key` each time it opens so it starts fresh.
 */
export function HairSetupSheet({ open, onClose }: HairSetupSheetProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const today = useSelector(appStore, (s) => s.activeDay);
  const setup = useQuickHairSetup();
  const [frequency, setFrequency] = useState<QuickWashFrequency>('every_3_days');
  const [lastChoice, setLastChoice] = useState<LastChoice>('today');
  const [pickedDay, setPickedDay] = useState(() => addDays(today, -3));
  const [trim, setTrim] = useState(false);

  const lastWash =
    lastChoice === 'today'
      ? today
      : lastChoice === 'yesterday'
        ? addDays(today, -1)
        : lastChoice === 'twoDaysAgo'
          ? addDays(today, -2)
          : pickedDay;
  const next = quickSetupNextDue(frequency, lastWash);

  const save = async () => {
    const parsed = quickHairSetupSchema(today).safeParse({ frequency, lastWash, trim });
    if (!parsed.success) return;
    await setup.mutateAsync(parsed.data);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('hair.setup.title')}
      footer={
        <Button loading={setup.isPending} onPress={() => void save()}>
          {t('common.save')}
        </Button>
      }
    >
      <ChipField
        label={t('hair.setup.frequency')}
        single
        allowEmpty={false}
        noHelper
        value={[frequency]}
        onValueChange={([v]) => {
          if (v === 'other') {
            onClose();
            router.push(NEW_HAIR_TASK_HREF);
            return;
          }
          if (v) setFrequency(v as QuickWashFrequency);
        }}
        items={[
          ...quickWashFrequencies.map((v) => ({ value: v, label: t(`hair.setup.freq.${v}`) })),
          { value: 'other', label: t('hair.setup.freq.other') },
        ]}
      />
      <View>
        <ChipField
          label={t('hair.setup.lastWash')}
          single
          allowEmpty={false}
          noHelper
          value={[lastChoice]}
          onValueChange={([v]) => {
            if (v) setLastChoice(v as LastChoice);
          }}
          items={(['today', 'yesterday', 'twoDaysAgo', 'pick'] as const).map((v) => ({
            value: v,
            label: t(`hair.setup.last.${v}`),
          }))}
        />
        <Collapsible open={lastChoice === 'pick'}>
          <View className="pt-3">
            <DateField
              label={t('hair.setup.lastWashDate')}
              value={pickedDay}
              onChange={setPickedDay}
              max={today}
              noHelper
            />
          </View>
        </Collapsible>
      </View>
      {/* Fixed height: the line changes with every chip but never moves the switch below. */}
      <View className="min-h-[48px] justify-center rounded-md bg-subtle px-3 py-2">
        <Text
          testID="hair-setup-next"
          accessibilityLiveRegion="polite"
          className="text-body-strong"
        >
          {t('hair.setup.nextWash', { date: f.weekdayDate(next) })}
        </Text>
      </View>
      <View className="min-h-[56px] flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-body">{t('hair.setup.trims')}</Text>
          <Text className="text-caption text-ink-muted">{t('hair.setup.trimsHint')}</Text>
        </View>
        <Switch
          checked={trim}
          onCheckedChange={setTrim}
          accessibilityLabel={t('hair.setup.trims')}
        />
      </View>
    </Sheet>
  );
}
