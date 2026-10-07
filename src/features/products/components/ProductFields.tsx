import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ChipGroup } from '@/components/ui/chip';
import { Collapsible } from '@/components/ui/collapsible';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { MenuPortal, type MoreMenuItem } from '@/components/ui/more-menu';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import type { Area } from '@/db/enums';
import { useFormat } from '@/i18n/useFormat';
import { diffDays } from '@/lib/appDay';
import { effectiveExpiry } from '@/lib/expiry';
import { showToast } from '@/state/ui';

import { useBrandSuggestions } from '../api';
import { pickProductPhoto, type PhotoSource } from '../photo';

/** "Used on": Skin / Hair / Both, with its reserved error line. */
export function AreaField({
  value,
  onChange,
  error,
}: {
  value: Area | undefined;
  onChange: (area: Area) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  return (
    <Field label={t('products.form.usedOn')} error={error}>
      <ToggleGroup
        accessibilityLabel={t('products.form.usedOn')}
        value={value ?? ''}
        onValueChange={(v) => onChange(v as Area)}
        items={[
          { value: 'skin', label: t('common.skin') },
          { value: 'hair', label: t('common.hair') },
          { value: 'both', label: t('products.form.both') },
        ]}
      />
    </Field>
  );
}

/** Months chips (period after opening); `custom` adds a Custom chip with a months field. */
export function MonthsField({
  label,
  hint,
  presets,
  custom = false,
  value,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  presets: readonly number[];
  custom?: boolean;
  /** Months as typed ('' for none). */
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const isPreset = presets.some((p) => String(p) === value.trim());
  const [customOn, setCustomOn] = useState(custom && value.trim() !== '' && !isPreset);
  const selected = customOn ? ['custom'] : isPreset ? [value.trim()] : [];
  const items = presets.map((p) => ({
    value: String(p),
    label: t('products.form.months', { count: p }),
  }));
  if (custom) items.push({ value: 'custom', label: t('products.form.custom') });
  return (
    <Field label={label} hint={hint} error={error}>
      <ChipGroup
        single
        allowEmpty
        accessibilityLabel={label}
        items={items}
        value={selected}
        onValueChange={([next]) => {
          if (next === 'custom') {
            setCustomOn(true);
            onChange('');
          } else {
            setCustomOn(false);
            onChange(next ?? '');
          }
        }}
      />
      {custom ? (
        <Collapsible open={customOn}>
          <View className="pt-2">
            <Input
              label={t('products.form.customMonths')}
              keyboard="numeric"
              value={customOn ? value : ''}
              onChangeText={onChange}
              suffix={t('products.form.monthsUnit')}
              noHelper
              className="w-[160px]"
            />
          </View>
        </Collapsible>
      ) : null}
    </Field>
  );
}

/** The live "Expires on 6 Apr 2027 (in 182 days)" line, one fixed-height line. */
export function ExpiryPreview({
  expiresAt,
  openedAt,
  paoMonths,
}: {
  expiresAt: string | null;
  openedAt: string | null;
  paoMonths: string;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const months = /^\d+$/.test(paoMonths.trim()) ? Number(paoMonths.trim()) : null;
  const eff = effectiveExpiry({ expiresAt, openedAt, paoMonths: months });
  let text = t('products.form.noExpiry');
  if (eff) {
    const days = diffDays(eff, f.today);
    const date = f.date(eff);
    text =
      days < 0
        ? t('products.form.expiredPreview', { date })
        : days === 0
          ? t('products.form.expiresPreviewToday', { date })
          : t('products.form.expiresPreview', { date, count: days });
  }
  return (
    <View
      accessibilityLiveRegion="polite"
      className="min-h-[48px] flex-row items-center gap-2 rounded-md bg-subtle px-3"
    >
      <Icon name="calendar" size={18} tone="ink-muted" />
      <Text testID="expiry-preview" numberOfLines={2} className="flex-1 text-body tabular-nums">
        {text}
      </Text>
    </View>
  );
}

/**
 * Brand with up to five earlier brands as an overlay under the field while typing, so nothing
 * below moves.
 */
export function BrandField({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const suggestions = useBrandSuggestions(value.trim()).data ?? [];
  const show = focused && value.trim().length > 0 && suggestions.length > 0;
  return (
    <View className="z-10">
      <Input
        label={t('products.form.brand')}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur();
        }}
        error={error}
        autoCorrect={false}
      />
      {show ? (
        <View
          testID="brand-suggestions"
          className="absolute left-0 right-0 top-[78px] overflow-hidden rounded-md bg-surface py-1 shadow-raised dark:border dark:border-border"
        >
          {suggestions.map((brand) => (
            <Pressable
              key={brand}
              onPress={() => {
                onChange(brand);
                setFocused(false);
              }}
              accessibilityRole="button"
              className="min-h-[44px] justify-center px-4 active:bg-accent-soft"
            >
              <Text className="text-body">{brand}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const PHOTO_BOX = 120;

/**
 * Photo: a reserved 1:1 box. Tapping offers Take photo / Choose from library (and Remove).
 * Picked files are reported through `onPicked` so the form can clean up unsaved ones.
 */
export function PhotoField({
  value,
  onChange,
  onPicked,
}: {
  value: string | null;
  onChange: (uri: string | null) => void;
  onPicked: (uri: string) => void;
}) {
  const { t } = useTranslation();
  const pick = async (source: PhotoSource) => {
    try {
      const result = await pickProductPhoto(source);
      if (result.status === 'denied') showToast({ message: t('products.form.cameraDenied') });
      if (result.status === 'picked') {
        onPicked(result.uri);
        onChange(result.uri);
      }
    } catch {
      showToast({ message: t('products.form.photoFailed') });
    }
  };
  const items: MoreMenuItem[] = [
    { label: t('products.form.takePhoto'), icon: 'camera', onPress: () => void pick('camera') },
    { label: t('products.form.choosePhoto'), icon: 'images', onPress: () => void pick('library') },
  ];
  if (value) {
    items.push({
      label: t('products.form.removePhoto'),
      icon: 'trash-2',
      destructive: true,
      onPress: () => onChange(null),
    });
  }
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        accessibilityRole="button"
        accessibilityLabel={value ? t('products.form.changePhoto') : t('products.form.addPhoto')}
        className="flex-row items-center gap-4 self-start active:opacity-85"
      >
        <View
          style={{ width: PHOTO_BOX, height: PHOTO_BOX }}
          className="items-center justify-center overflow-hidden rounded-xl bg-subtle"
        >
          {value ? (
            <Image
              source={{ uri: value }}
              contentFit="cover"
              transition={200}
              accessibilityLabel={t('products.form.photo')}
              style={{ width: PHOTO_BOX, height: PHOTO_BOX }}
            />
          ) : (
            <Icon name="image-plus" size={32} tone="ink-muted" />
          )}
        </View>
        <Text className="text-body-strong text-accent">
          {value ? t('products.form.changePhoto') : t('products.form.addPhoto')}
        </Text>
      </DropdownMenuPrimitive.Trigger>
      <MenuPortal items={items} />
    </DropdownMenuPrimitive.Root>
  );
}
