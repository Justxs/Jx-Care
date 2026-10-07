import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { DateField } from '@/components/ui/date-field';
import { Field } from '@/components/ui/field';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { motion } from '@/theme/motion';

import { MonthsField } from './ProductFields';

/** "Use within" presets on the short form (P3). */
export const QUICK_PAO = [3, 6, 12, 24] as const;

export type QuickOpenFieldsProps = {
  today: string;
  openedAt: string | null;
  paoMonths: string;
  expiresAt: string | null;
  /** Switching clears the side that is hidden, so the preview never uses an unseen value. */
  onOpenChange: (open: boolean) => void;
  onOpenedAt: (day: string) => void;
  onPaoMonths: (months: string) => void;
  onExpiresAt: (day: string) => void;
  errors: { openedAt?: string; paoMonths?: string; expiresAt?: string };
};

/**
 * Short form "Is it open?": Yes shows Opened on and Use within; Not yet shows the printed
 * expiry. The area below the switch is reserved at 176 pt so switching moves nothing.
 */
export function QuickOpenFields({
  today,
  openedAt,
  paoMonths,
  expiresAt,
  onOpenChange,
  onOpenedAt,
  onPaoMonths,
  onExpiresAt,
  errors,
}: QuickOpenFieldsProps) {
  const { t } = useTranslation();
  const open = openedAt !== null;
  return (
    <View className="gap-3">
      <Field label={t('products.form.isOpen')} noHelper>
        <ToggleGroup
          accessibilityLabel={t('products.form.isOpen')}
          value={open ? 'yes' : 'no'}
          onValueChange={(v) => onOpenChange(v === 'yes')}
          items={[
            { value: 'yes', label: t('products.form.openYes') },
            { value: 'no', label: t('products.form.openNo') },
          ]}
        />
      </Field>
      <View testID="open-area" className="min-h-[176px]">
        {open ? (
          <Animated.View
            key="open"
            entering={FadeIn.duration(motion.duration.base)}
            className="gap-1"
          >
            <DateField
              label={t('products.form.openedAt')}
              value={openedAt}
              onChange={onOpenedAt}
              max={today}
              error={errors.openedAt}
            />
            <MonthsField
              label={t('products.form.useWithin')}
              hint={t('products.form.paoHint')}
              presets={QUICK_PAO}
              value={paoMonths}
              onChange={onPaoMonths}
              error={errors.paoMonths}
            />
          </Animated.View>
        ) : (
          <Animated.View key="closed" entering={FadeIn.duration(motion.duration.base)}>
            <DateField
              label={t('products.form.expiresAt')}
              hint={t('products.form.expiresAtHint')}
              value={expiresAt}
              onChange={onExpiresAt}
              error={errors.expiresAt}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}
