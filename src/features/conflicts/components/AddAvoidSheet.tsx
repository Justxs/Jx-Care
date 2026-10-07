import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Field, fieldBoxClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { normalizeName, tidy } from '@/lib/text';
import { motion } from '@/theme/motion';

import { useAddAvoidItem } from '../avoidApi';
import { AVOID_NOTE_MAX, type AvoidListItem } from '../avoidRepo';
import { useSideOptions } from './ConflictRuleSheet';
import { SideName, SideResults, sideOptionKey, useSideLabel, type SideOption } from './SidePicker';

type Picked = SideOption | { kind: 'new'; name: string };

export type AddAvoidSheetProps = {
  open: boolean;
  onClose: () => void;
  /** What is already on the list; it is left out of the results. */
  listed: readonly Pick<AvoidListItem, 'kind' | 'refId'>[];
};

/**
 * S4 "Add ingredient": search ingredients and groups together, or type a new ingredient name
 * (it joins the ingredient list), plus an optional note. Mount with a new `key` each time.
 */
export function AddAvoidSheet({ open, onClose, listed }: AddAvoidSheetProps) {
  const { t } = useTranslation();
  const spoken = useSideLabel();
  const all = useSideOptions();
  const add = useAddAvoidItem();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [note, setNote] = useState('');

  const options = useMemo(() => {
    const keys = new Set(listed.map((i) => sideOptionKey({ kind: i.kind, id: i.refId })));
    return all.filter((o) => !keys.has(sideOptionKey(o)));
  }, [all, listed]);
  const typed = tidy(query);
  // A typed name no ingredient has yet can be added as a new one.
  const isNew =
    normalizeName(typed) !== '' &&
    !all.some((o) => o.kind === 'ingredient' && normalizeName(o.name) === normalizeName(typed));

  const onSave = async () => {
    if (!picked) return;
    const n = note.trim() || null;
    await add.mutateAsync(
      picked.kind === 'new'
        ? { name: picked.name, note: n }
        : { kind: picked.kind, refId: picked.id, note: n },
    );
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dirty={picked !== null || note.trim() !== ''}
      title={t('avoid.sheet.title')}
      footer={
        <Button disabled={!picked} loading={add.isPending} onPress={onSave}>
          {t('avoid.sheet.save')}
        </Button>
      }
    >
      {picked ? (
        <Field label={t('avoid.sheet.what')}>
          <View className={fieldBoxClass({})}>
            <View
              accessible
              accessibilityLabel={
                picked.kind === 'new' ? `${picked.name}, ${t('avoid.sheet.new')}` : spoken(picked)
              }
              className="flex-1 flex-row items-center gap-2"
            >
              {picked.kind === 'new' ? (
                <>
                  <Text className="shrink text-body">{picked.name}</Text>
                  <View className="rounded-full bg-accent-soft px-1.5">
                    <Text className="text-tiny-strong text-accent">{t('avoid.sheet.new')}</Text>
                  </View>
                </>
              ) : (
                <SideName side={picked} className="text-body font-normal" />
              )}
            </View>
            <Pressable
              onPress={() => setPicked(null)}
              accessibilityRole="button"
              hitSlop={4}
              className="min-h-[44px] justify-center pl-3 active:opacity-85"
            >
              <Text className="text-body-strong text-accent">{t('avoid.sheet.change')}</Text>
            </Pressable>
          </View>
        </Field>
      ) : (
        <Animated.View entering={FadeIn.duration(motion.duration.base)} className="gap-2">
          <Input
            label={t('avoid.sheet.what')}
            noHelper
            leadingIcon="search"
            value={query}
            onChangeText={setQuery}
            placeholder={t('avoid.sheet.search')}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
          />
          {isNew ? (
            <Pressable
              testID="avoid-create"
              onPress={() => setPicked({ kind: 'new', name: typed })}
              accessibilityRole="button"
              className="min-h-[48px] flex-row items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 active:bg-accent-soft"
            >
              <Icon name="plus" size={20} tone="accent" />
              <Text className="flex-1 text-body text-accent">
                {t('avoid.sheet.createNew', { name: typed })}
              </Text>
            </Pressable>
          ) : null}
          {options.length === 0 && !typed ? (
            <Text className="min-h-[48px] px-1 py-3 text-body text-ink-muted">
              {t('avoid.sheet.empty')}
            </Text>
          ) : (
            <SideResults
              options={options}
              query={query}
              emptyLabel={t('avoid.sheet.noMatch')}
              onPick={setPicked}
            />
          )}
        </Animated.View>
      )}
      <Input
        label={t('avoid.sheet.note')}
        hint={t('avoid.sheet.noteHint')}
        placeholder={t('avoid.sheet.notePlaceholder')}
        value={note}
        onChangeText={setNote}
        maxLength={AVOID_NOTE_MAX}
      />
    </Sheet>
  );
}
