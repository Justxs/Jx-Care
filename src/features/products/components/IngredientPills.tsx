import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { rowEntering, rowExiting } from '@/theme/listMotion';

export type IngredientPill = {
  name: string;
  /** Not in the ingredient list yet: shows a "New" tag. */
  isNew?: boolean;
  /** On the avoid list: red. */
  avoided?: boolean;
  /** In a conflict rule (task 029): a link icon. */
  conflict?: boolean;
};

/** Read-only ingredient chips: the P4 preview and the form's Ingredients field. */
export function IngredientPills({ items }: { items: readonly IngredientPill[] }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row flex-wrap gap-1.5" testID="ingredient-pills">
      {items.map((item) => (
        <Animated.View
          key={item.name}
          entering={rowEntering}
          exiting={rowExiting}
          accessible
          accessibilityLabel={[
            item.name,
            item.isNew ? t('products.ingredientsSheet.new') : null,
            item.avoided ? t('common.status.avoid') : null,
            item.conflict ? t('common.conflict') : null,
          ]
            .filter(Boolean)
            .join(', ')}
          className={cn(
            'min-h-[32px] flex-row items-center gap-1.5 rounded-full px-3',
            item.avoided ? 'bg-danger-soft' : 'bg-subtle',
          )}
        >
          {item.conflict ? <Icon name="link" size={14} tone="warning" /> : null}
          <Text className={cn('text-label', item.avoided ? 'text-danger' : 'text-ink')}>
            {item.name}
          </Text>
          {item.isNew ? (
            <View className="rounded-full bg-accent-soft px-1.5">
              <Text className="text-tiny-strong text-accent">
                {t('products.ingredientsSheet.new')}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      ))}
    </View>
  );
}
