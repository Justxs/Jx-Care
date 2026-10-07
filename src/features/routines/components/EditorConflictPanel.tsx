import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Collapsible } from '@/components/ui/collapsible';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

import type { EditorConflictHit } from '../useRoutineConflicts';

export type EditorConflictPanelProps = {
  hits: readonly EditorConflictHit[];
  /** "What does mild mean?": the Mild conflict sheet (ExplainSheets), wired by task 030. */
  onExplainMild: () => void;
};

/**
 * The R2 conflict panel at the end of the form. It animates its height open when there are
 * conflicts; saving is still allowed. Task 030 supplies the lines.
 */
export function EditorConflictPanel({ hits, onExplainMild }: EditorConflictPanelProps) {
  const { t } = useTranslation();
  return (
    <Collapsible open={hits.length > 0}>
      <View className="gap-2 rounded-xl bg-warning-soft p-4" testID="conflict-panel">
        <View className="flex-row items-center gap-2">
          <Icon name="alert-triangle" size={18} tone="warning" />
          <Text accessibilityRole="header" className="flex-1 text-body-strong text-warning">
            {t('routines.editor.conflicts', { count: hits.length })}
          </Text>
        </View>
        {hits.map((hit) => (
          <View key={hit.key} className="flex-row flex-wrap items-center gap-1.5">
            <Text className="text-body text-ink">{hit.text}</Text>
            {hit.mild ? <Text className="text-label text-warning">{t('common.mild')}</Text> : null}
          </View>
        ))}
        <Text className="text-caption text-ink">{t('routines.editor.canStillSave')}</Text>
        <Pressable
          onPress={onExplainMild}
          accessibilityRole="button"
          hitSlop={8}
          className="min-h-[44px] justify-center self-start active:opacity-85"
        >
          <Text className="text-body-strong text-accent">{t('routines.editor.whatIsMild')}</Text>
        </Pressable>
      </View>
    </Collapsible>
  );
}
