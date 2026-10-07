import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProductThumb } from '@/components/ui/product-thumb';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useProductsForPicker } from '@/features/products/api';

export type StepProductPickerProps = {
  open: boolean;
  onClose: () => void;
  /** The picked product; the sheet closes itself. */
  onPick: (productId: number) => void;
};

/**
 * "Pick another" in the player. A minimal stand-in for the R4 product picker of task 024
 * (`ProductPickerSheet`): skin products that can be used today, by name. Once task 024 is merged,
 * render `<ProductPickerSheet area="skin" onPick={([id]) => ...} />` here instead.
 */
export function StepProductPicker({ open, onClose, onPick }: StepProductPickerProps) {
  const { t, i18n } = useTranslation();
  const { data = [] } = useProductsForPicker({ area: 'skin' }, i18n.language);
  const usable = data.filter((p) => p.status !== 'expired');
  return (
    <Sheet open={open} onClose={onClose} title={t('player.picker.title')}>
      {usable.length === 0 ? (
        <Text className="py-4 text-center text-body text-ink-muted">
          {t('player.picker.empty')}
        </Text>
      ) : (
        <View className="-mx-4">
          {usable.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Separator inset className="ml-[76px]" /> : null}
              <Pressable
                onPress={() => onPick(p.id)}
                accessibilityRole="button"
                accessibilityLabel={[p.name, p.brand].filter(Boolean).join(', ')}
                className="min-h-[64px] flex-row items-center gap-3 px-4 py-2 active:bg-subtle"
              >
                <ProductThumb src={p.photoUri} category={p.category} />
                <View className="flex-1 gap-0.5">
                  <Text className="text-body-strong">{p.name}</Text>
                  {p.brand ? <Text className="text-caption text-ink-muted">{p.brand}</Text> : null}
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}
