import { useColorScheme } from 'nativewind';
import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AreaTag } from '@/components/ui/area-tag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { ConflictTag } from '@/components/ui/conflict-tag';
import { Fab, FAB_LIST_END_SPACE } from '@/components/ui/fab';
import { ListRow } from '@/components/ui/list-row';
import { PhotoTile } from '@/components/ui/photo-tile';
import { PinPad, type PinPadHandle } from '@/components/ui/pin-pad';
import { ProductThumb } from '@/components/ui/product-thumb';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '@/components/ui/progress-ring';
import { RadioList } from '@/components/ui/radio-list';
import { Rating } from '@/components/ui/rating';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { StepDots } from '@/components/ui/step-dots';
import { StreakCard, StreakChip } from '@/components/ui/streak';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { WeekdayDots } from '@/components/ui/weekday-dots';
import { WeekdayPicker } from '@/components/ui/weekday-picker';
import { languages, type Language } from '@/i18n';
import { setLanguage } from '@/state/app';

import { FormsGallery } from './FormsGallery';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-overline text-ink-muted">{title}</Text>
      {children}
    </View>
  );
}

/** Development only: every base component in each state, for light, dark and Lithuanian checks. */
export function ComponentGallery() {
  const { t, i18n } = useTranslation();
  const { colorScheme, setColorScheme } = useColorScheme();
  const pin = useRef<PinPadHandle>(null);
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(true);
  const [chips, setChips] = useState<string[]>(['calm']);
  const [segment, setSegment] = useState('skin');
  const [radio, setRadio] = useState('lt');
  const [stars, setStars] = useState(3);
  const [scale, setScale] = useState(4);
  const [days, setDays] = useState([1, 3, 5]);
  const [step, setStep] = useState(1);
  const [filled, setFilled] = useState(2);
  const [progress, setProgress] = useState(2);

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: FAB_LIST_END_SPACE }}
      >
        <Text className="text-title-l">{t('dev.components')}</Text>
        <ToggleGroup
          size="sm"
          items={languages.map((l) => ({ value: l, label: l.toUpperCase() }))}
          value={i18n.language}
          onValueChange={(l) => void setLanguage(l as Language, { persist: false })}
        />
        <ToggleGroup
          size="sm"
          items={[
            { value: 'light', label: 'Light', icon: 'sun' },
            { value: 'dark', label: 'Dark', icon: 'moon' },
          ]}
          value={colorScheme ?? 'light'}
          onValueChange={(s) => setColorScheme(s as 'light' | 'dark')}
        />

        <Section title="Button">
          <Button>{t('common.save')}</Button>
          <Button variant="secondary" icon="plus">
            {t('common.edit')}
          </Button>
          <Button variant="ghost">{t('common.cancel')}</Button>
          <Button variant="danger" icon="trash-2">
            {t('common.delete')}
          </Button>
          <View className="flex-row gap-2">
            <Button size="sm" block={false} loading>
              {t('common.continue')}
            </Button>
            <Button size="sm" block={false} disabled>
              {t('common.done')}
            </Button>
          </View>
        </Section>

        <Section title="Badge · AreaTag · ConflictTag">
          <View className="flex-row flex-wrap gap-2">
            {(['ok', 'expiring', 'expired', 'unopened', 'nodate', 'avoid'] as const).map((s) => (
              <Badge key={s} status={s} />
            ))}
            <Badge status="expiring">9 d.</Badge>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <AreaTag area="skin" />
            <AreaTag area="hair" />
            <AreaTag area="both" />
            <ConflictTag />
            <ConflictTag mild onPress={() => pin.current?.shake()} />
          </View>
        </Section>

        <Section title="Checkbox · Switch">
          <View className="flex-row items-center gap-6">
            <Checkbox
              checked={checked}
              onCheckedChange={setChecked}
              accessibilityLabel="Checkbox"
            />
            <Checkbox
              checked={false}
              onCheckedChange={() => {}}
              disabled
              accessibilityLabel="Off"
            />
            <Switch checked={on} onCheckedChange={setOn} accessibilityLabel="Switch" />
            <Switch checked={false} onCheckedChange={() => {}} disabled accessibilityLabel="Off" />
          </View>
        </Section>

        <Section title="Chip · ChipGroup">
          <View className="flex-row flex-wrap gap-2">
            <Chip selected icon="check" count={3}>
              {t('common.morning')}
            </Chip>
            <Chip>{t('common.evening')}</Chip>
            <Chip selected tone="danger" icon="ban">
              {t('common.status.avoid')}
            </Chip>
          </View>
          <ChipGroup
            items={['calm', 'glow', 'oily', 'dry', 'breakout', 'redness', 'itchy'].map((v) => ({
              value: v,
              label: t(`common.tags.${v}`),
            }))}
            value={chips}
            onValueChange={setChips}
          />
        </Section>

        <Section title="ToggleGroup">
          <ToggleGroup
            items={[
              { value: 'skin', label: t('common.skin') },
              { value: 'hair', label: t('common.hair') },
            ]}
            value={segment}
            onValueChange={setSegment}
          />
          <ToggleGroup
            items={[
              { value: 'skin', label: t('common.morning') },
              { value: 'hair', label: t('common.evening'), count: 4 },
              { value: 'other', label: t('common.custom') },
            ]}
            value={segment}
            onValueChange={setSegment}
          />
        </Section>

        <Section title="RadioList">
          <RadioList
            items={[
              { value: 'lt', label: 'Lietuvių', detail: 'LT' },
              { value: 'en', label: 'English', detail: 'EN' },
              { value: 'x', label: t('common.everyFewDays') },
            ]}
            value={radio}
            onValueChange={setRadio}
          />
        </Section>

        <Section title="Progress · ProgressRing">
          <Progress value={progress} max={4} />
          <View className="flex-row items-center gap-4">
            <ProgressRing value={progress} max={4} />
            <ProgressRing value={4} max={4} />
            <ProgressRing value={9} max={10} size={72} />
            <Button size="sm" block={false} onPress={() => setProgress((p) => (p + 1) % 5)}>
              +1
            </Button>
          </View>
        </Section>

        <Section title="Card · ListRow · Separator">
          <Card title={t('common.otherCare')}>
            <Text>{t('common.everyDay')}</Text>
          </Card>
          <Card flush>
            <ListRow label={t('common.timeOfDay')} icon="clock" value="07:30" onPress={() => {}} />
            <Separator inset />
            <ListRow
              label={t('common.weeklyPhoto')}
              trailing="switch"
              checked={on}
              onCheckedChange={setOn}
            />
            <Separator inset />
            <ListRow label={t('common.skin')} area="skin" trailing="value" value="12" />
            <Separator inset />
            <ListRow
              label={t('common.delete')}
              icon="trash-2"
              tone="danger"
              trailing="none"
              onPress={() => {}}
            />
          </Card>
        </Section>

        <Section title="Skeleton">
          <View className="flex-row gap-3">
            <Skeleton width={48} height={48} radius={8} />
            <View className="flex-1 gap-2">
              <Skeleton height={16} />
              <Skeleton width="60%" height={14} />
            </View>
          </View>
        </Section>

        <Section title="Rating">
          <Rating value={stars} onValueChange={setStars} />
          <Rating kind="scale" value={scale} onValueChange={setScale} />
        </Section>

        <Section title="WeekdayDots · WeekdayPicker">
          <WeekdayDots value={days} />
          <WeekdayDots value={[1, 2, 3, 4, 5, 6, 7]} />
          <WeekdayPicker value={days} onValueChange={setDays} />
        </Section>

        <Section title="StepDots">
          <StepDots count={5} index={step} />
          <Button size="sm" block={false} onPress={() => setStep((s) => (s + 1) % 5)}>
            {t('common.continue')}
          </Button>
        </Section>

        <Section title="StreakChip · StreakCard">
          <View className="flex-row gap-2">
            <StreakChip area="skin" value={12} onPress={() => {}} />
            <StreakChip area="hair" value={3} />
          </View>
          <View className="flex-row gap-3">
            <StreakCard area="skin" value={12} best={21} />
            <StreakCard area="hair" value={1} best={21} restarted />
          </View>
        </Section>

        <Section title="ProductThumb · PhotoTile">
          <View className="flex-row gap-2">
            {(['serum', 'cleanser', 'spf', 'shampoo', 'moisturiser'] as const).map((c) => (
              <ProductThumb key={c} category={c} />
            ))}
          </View>
          <View className="flex-row gap-3">
            <PhotoTile date="6 Oct" className="flex-1" onPress={() => {}} />
            <PhotoTile date="13 Oct" selected className="flex-1" onPress={() => {}} />
            <PhotoTile add className="flex-1" onPress={() => {}} />
          </View>
        </Section>

        <Section title="Forms · Sheet · AlertDialog · Toast · ScreenHeader · EmptyState">
          <FormsGallery />
        </Section>

        <Section title="PinPad">
          <PinPad
            ref={pin}
            filled={filled}
            biometric
            onBiometric={() => {}}
            onDigit={() => setFilled((f) => Math.min(4, f + 1))}
            onDelete={() => setFilled((f) => Math.max(0, f - 1))}
            message={filled === 4 ? t('a11y.pinEntered', { count: 4 }) : undefined}
          />
        </Section>
      </KeyboardAwareScrollView>
      <Fab onPress={() => pin.current?.shake()}>{t('common.save')}</Fab>
    </SafeAreaView>
  );
}
