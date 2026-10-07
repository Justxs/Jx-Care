import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Field, fieldBoxClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { RefKind } from '@/db/enums';
import { cn } from '@/lib/cn';
import { normalizeName } from '@/lib/text';
import { motion } from '@/theme/motion';

/** One pickable side of a rule: an ingredient or a group. */
export type SideOption = {
  kind: RefKind;
  id: number;
  name: string;
  /** "6 ingredients" for a group, "In Retinoids" for a grouped ingredient. */
  detail?: string | null;
};

export const sideOptionKey = (o: Pick<SideOption, 'kind' | 'id'>) => `${o.kind}:${o.id}`;

const RESULT_LIMIT = 30;

/**
 * Prefix matches first, then names containing the query; case- and accent-insensitive. Options
 * keep their given order within each set (groups first). `more` is true when some were cut.
 */
export function filterSides<T extends SideOption>(
  options: readonly T[],
  query: string,
  limit = RESULT_LIMIT,
): { items: T[]; more: boolean } {
  const q = normalizeName(query);
  let matched: T[] = [...options];
  if (q) {
    const starts: T[] = [];
    const contains: T[] = [];
    for (const o of options) {
      const n = normalizeName(o.name);
      if (n.startsWith(q)) starts.push(o);
      else if (n.includes(q)) contains.push(o);
    }
    matched = [...starts, ...contains];
  }
  return { items: matched.slice(0, limit), more: matched.length > limit };
}

/** The spoken name of a side: a group says so ("Retinoids group"). */
export function useSideLabel() {
  const { t } = useTranslation();
  return (side: Pick<SideOption, 'kind' | 'name'>) =>
    side.kind === 'group' ? t('conflicts.groupSide', { name: side.name }) : side.name;
}

/** A side's name with the small group icon in front of a group. */
export function SideName({
  side,
  className,
}: {
  side: Pick<SideOption, 'kind' | 'name'>;
  className?: string;
}) {
  return (
    <View className="shrink flex-row items-center gap-1">
      {side.kind === 'group' ? <Icon name="layers" size={16} tone="ink-muted" /> : null}
      <Text className={cn('shrink text-body-strong', className)}>{side.name}</Text>
    </View>
  );
}

export type SideResultsProps = {
  options: readonly SideOption[];
  query: string;
  onPick: (option: SideOption) => void;
  emptyLabel: string;
};

/** Search results for ingredients and groups together; groups carry an icon and a tag. */
export function SideResults({ options, query, onPick, emptyLabel }: SideResultsProps) {
  const { t } = useTranslation();
  const spoken = useSideLabel();
  const { items, more } = filterSides(options, query);
  if (items.length === 0) {
    return <Text className="min-h-[48px] px-1 py-3 text-body text-ink-muted">{emptyLabel}</Text>;
  }
  return (
    <View className="overflow-hidden rounded-md border border-border bg-surface">
      {items.map((o, i) => (
        <View key={sideOptionKey(o)}>
          {i > 0 ? <Separator className="ml-3" /> : null}
          <Pressable
            testID={`side-option-${o.kind}-${o.id}`}
            onPress={() => onPick(o)}
            accessibilityRole="button"
            accessibilityLabel={[spoken(o), o.detail].filter(Boolean).join(', ')}
            className="min-h-[48px] flex-row items-center gap-3 px-3 py-2 active:bg-accent-soft"
          >
            <View className="flex-1 gap-0.5">
              <SideName side={o} className="text-body" />
              {o.detail ? <Text className="text-caption text-ink-muted">{o.detail}</Text> : null}
            </View>
            {o.kind === 'group' ? (
              <View className="rounded-full bg-subtle px-2 py-0.5">
                <Text className="text-label text-ink-muted">{t('conflicts.picker.group')}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      ))}
      {more ? (
        <Text className="border-t border-border px-3 py-2 text-caption text-ink-muted">
          {t('conflicts.picker.more')}
        </Text>
      ) : null}
    </View>
  );
}

export type SidePickerProps = {
  label: string;
  value: SideOption | null;
  options: readonly SideOption[];
  /** Open shows a search field and results under the trigger; one picker is open at a time. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (option: SideOption) => void;
  error?: string;
  disabled?: boolean;
};

/** One side of a conflict rule: searches ingredients and groups together (S3 editor). */
export function SidePicker({
  label,
  value,
  options,
  open,
  onOpenChange,
  onChange,
  error,
  disabled,
}: SidePickerProps) {
  const { t } = useTranslation();
  const spoken = useSideLabel();
  const [query, setQuery] = useState('');
  const placeholder = t('conflicts.sheet.placeholder');

  return (
    <Field label={label} error={error}>
      <Pressable
        onPress={() => {
          setQuery('');
          onOpenChange(!open);
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value ? spoken(value) : placeholder}`}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        className={cn(
          fieldBoxClass({ invalid: !!error, disabled, focused: open }),
          'gap-2 active:opacity-85',
        )}
      >
        <View className="flex-1 flex-row">
          {value ? (
            <SideName side={value} className="text-body font-normal" />
          ) : (
            <Text className="text-body text-ink-muted">{placeholder}</Text>
          )}
        </View>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={20} tone="ink-muted" />
      </Pressable>
      {open ? (
        <Animated.View
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.fast)}
          className="gap-2 pt-1"
        >
          <Input
            noHelper
            leadingIcon="search"
            value={query}
            onChangeText={setQuery}
            placeholder={t('conflicts.picker.search')}
            accessibilityLabel={t('conflicts.picker.search')}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
          />
          <SideResults
            options={options}
            query={query}
            emptyLabel={t('conflicts.picker.noMatch')}
            onPick={(o) => {
              onChange(o);
              onOpenChange(false);
            }}
          />
        </Animated.View>
      ) : null}
    </Field>
  );
}
