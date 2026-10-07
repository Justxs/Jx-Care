import { Image } from 'expo-image';
import { View } from 'react-native';

import type { ProductCategory } from '@/db/enums';
import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';

const glyphs: Partial<Record<ProductCategory, IconName>> = {
  serum: 'pipette',
  hair_oil: 'pipette',
  cleanser: 'droplet',
  toner: 'droplet',
  spf: 'sun',
  shampoo: 'spray-can',
  styling: 'spray-can',
};

export function categoryGlyph(category: ProductCategory): IconName {
  return glyphs[category] ?? 'flask-round';
}

export type ProductThumbProps = {
  /** Local file URI of the product photo. */
  src?: string | null;
  category: ProductCategory;
  size?: number;
  className?: string;
};

/** 48 × 48 photo or category glyph; the box is reserved before the image loads. Decorative. */
export function ProductThumb({ src, category, size = 48, className }: ProductThumbProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
      className={cn('items-center justify-center overflow-hidden rounded-sm bg-subtle', className)}
    >
      {src ? (
        <Image
          source={{ uri: src }}
          contentFit="cover"
          transition={200}
          style={{ width: size, height: size }}
        />
      ) : (
        <Icon name={categoryGlyph(category)} size={Math.round(size / 2)} tone="ink-muted" />
      )}
    </View>
  );
}
