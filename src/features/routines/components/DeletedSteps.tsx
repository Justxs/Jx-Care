import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

export type DeletedStepRow = {
  id: number;
  /** The step's product, else its note, else "No product". */
  label: string;
};

export type DeletedStepsProps = {
  steps: readonly DeletedStepRow[];
  onRestore: (id: number) => void;
};

/**
 * R2 "Deleted steps": steps deleted from this routine (saved, or removed since the editor
 * opened), each with Restore. Past days keep counting them; Restore puts one back at the end of
 * the list, and Save makes it count again from today. Nothing shows while there are none.
 */
export function DeletedSteps({ steps, onRestore }: DeletedStepsProps) {
  const { t } = useTranslation();
  if (steps.length === 0) return null;
  return (
    <Animated.View
      entering={rowEntering}
      exiting={rowExiting}
      layout={rowLayout}
      className="mb-4 gap-2"
    >
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-title-s">
          {t('routines.editor.deletedSteps')}
        </Text>
        <Text className="text-caption text-ink-muted">{t('routines.editor.deletedStepsNote')}</Text>
      </View>
      <View className="overflow-hidden rounded-xl border border-border">
        {steps.map((s, i) => (
          <Animated.View
            key={s.id}
            entering={rowEntering}
            exiting={rowExiting}
            layout={rowLayout}
            className={i > 0 ? 'border-t border-border' : undefined}
          >
            <View className="min-h-[56px] flex-row items-center gap-3 px-4 py-2">
              <Text numberOfLines={2} className="flex-1 text-body text-ink-muted">
                {s.label}
              </Text>
              <Button
                size="sm"
                variant="secondary"
                block={false}
                className="self-center"
                accessibilityLabel={t('routines.editor.restoreStepName', { name: s.label })}
                onPress={() => onRestore(s.id)}
              >
                {t('routines.editor.restoreStep')}
              </Button>
            </View>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}
