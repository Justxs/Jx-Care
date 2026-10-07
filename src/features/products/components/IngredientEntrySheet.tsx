import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { parsedLinesAvoidMatches } from '@/lib/avoid';
import {
  classifyIngredients,
  parseIngredientLines,
  suggestIngredients,
  type KnownIngredient,
} from '@/lib/ingredients';
import { rowLayout } from '@/theme/listMotion';

import { applyIngredientChange, lineAt, replaceLine } from '../ingredientInput';
import type { AvoidContext } from '../repo';
import { IngredientPills } from './IngredientPills';

export type IngredientEntrySheetProps = {
  open: boolean;
  onClose: () => void;
  /** The ingredient text, one per line. */
  value: string;
  onSave: (text: string) => void;
  known: readonly KnownIngredient[];
  avoid: AvoidContext;
};

/**
 * P4 ingredient entry: one ingredient per line, suggestions for the current line, pasted lists
 * split at commas (with Undo), and a live chip preview. Mount with a new `key` each time it
 * opens so the draft starts from `value`.
 */
export function IngredientEntrySheet({
  open,
  onClose,
  value,
  onSave,
  known,
  avoid,
}: IngredientEntrySheetProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const [cursor, setCursor] = useState(value.length);
  const [split, setSplit] = useState<{ count: number; undo: string } | null>(null);

  const parsed = useMemo(() => parseIngredientLines(text), [text]);
  const classified = useMemo(() => classifyIngredients(parsed, known), [parsed, known]);
  const avoided = useMemo(
    () =>
      new Set(
        parsedLinesAvoidMatches(parsed, known, avoid.groupOf, avoid.items).map((m) => m.line),
      ),
    [parsed, known, avoid],
  );
  const current = lineAt(text, cursor).line;
  const suggestions = suggestIngredients(current, known, 5);

  const onChangeText = (next: string) => {
    const change = applyIngredientChange(text, next);
    setText(change.value);
    setSplit(change.undoValue ? { count: change.splitLines, undo: change.undoValue } : null);
    if (change.value !== next) setCursor(change.value.length);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dirty={text !== value}
      title={t('products.ingredientsSheet.title')}
      footer={
        <View className="gap-2">
          {/* Reserved so suggestions never move the button. */}
          <View className="h-[40px]">
            {suggestions.length > 0 ? (
              <ScrollView
                horizontal
                keyboardShouldPersistTaps="always"
                showsHorizontalScrollIndicator={false}
                accessibilityLabel={t('products.ingredientsSheet.suggestions')}
                contentContainerStyle={{ gap: 8, alignItems: 'center' }}
              >
                {suggestions.map((s) => (
                  <Chip
                    key={s.id}
                    onPressedChange={() => {
                      const next = replaceLine(text, cursor, s.name);
                      setText(next.value);
                      setCursor(next.cursor);
                      setSplit(null);
                    }}
                  >
                    {s.name}
                  </Chip>
                ))}
              </ScrollView>
            ) : null}
          </View>
          <Button
            onPress={() => {
              onSave(parsed.join('\n'));
              onClose();
            }}
          >
            {t('products.ingredientsSheet.save', { count: parsed.length })}
          </Button>
        </View>
      }
    >
      <Input
        label={t('products.ingredientsSheet.field')}
        multiline
        value={text}
        onChangeText={onChangeText}
        onSelectionChange={(e) => setCursor(e.nativeEvent.selection.end)}
        autoCapitalize="sentences"
        autoCorrect={false}
        noHelper
      />
      {/* The hint line is reserved; after a split it offers Undo. */}
      <View className="-mt-2 min-h-[36px] flex-row flex-wrap items-center gap-x-2">
        {split ? (
          <>
            <Text accessibilityLiveRegion="polite" className="text-caption text-ink-muted">
              {t('products.ingredientsSheet.split', { count: split.count })}
            </Text>
            <Pressable
              onPress={() => {
                setText(split.undo);
                setCursor(split.undo.length);
                setSplit(null);
              }}
              accessibilityRole="button"
              hitSlop={8}
              className="min-h-[32px] justify-center active:opacity-85"
            >
              <Text className="text-caption font-semibold text-accent">{t('common.undo')}</Text>
            </Pressable>
          </>
        ) : (
          <Text className="text-caption text-ink-muted">{t('products.ingredientsSheet.hint')}</Text>
        )}
      </View>
      <Animated.View layout={rowLayout}>
        <IngredientPills
          items={classified.map((c) => ({
            name: c.name,
            isNew: c.status === 'new',
            avoided: avoided.has(c.name),
          }))}
        />
      </Animated.View>
    </Sheet>
  );
}
