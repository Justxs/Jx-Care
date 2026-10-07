import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Rating } from '@/components/ui/rating';
import { ToggleGroup } from '@/components/ui/toggle-group';

import { useSetRating, useSetWouldRebuy } from '../notesApi';

export type RatingBlockProps = {
  productId: number;
  rating: number | null;
  wouldRebuy: boolean | null;
};

/**
 * P2 My rating: 1–5 stars (tap the chosen star again to clear) and "Would buy again" Yes / No,
 * with no choice until one is made. Each change saves at once.
 */
export function RatingBlock({ productId, rating, wouldRebuy }: RatingBlockProps) {
  const { t } = useTranslation();
  const saveRating = useSetRating();
  const saveRebuy = useSetWouldRebuy();
  // Shown at once; the saved product catches up after the write.
  const [stars, setStars] = useState(rating ?? 0);
  const [rebuy, setRebuy] = useState(wouldRebuy);

  return (
    <Card title={t('products.rating.title')}>
      <View className="gap-4">
        <Rating
          value={stars}
          clearable
          accessibilityLabel={t('products.rating.stars')}
          onValueChange={(value) => {
            setStars(value);
            saveRating.mutate({ productId, rating: value > 0 ? value : null });
          }}
          className="-ml-2"
        />
        <Field label={t('products.rating.wouldRebuy')} noHelper>
          <ToggleGroup
            accessibilityLabel={t('products.rating.wouldRebuy')}
            value={rebuy === null ? '' : rebuy ? 'yes' : 'no'}
            onValueChange={(v) => {
              const value = v === 'yes';
              setRebuy(value);
              saveRebuy.mutate({ productId, value });
            }}
            items={[
              { value: 'yes', label: t('products.rating.yes') },
              { value: 'no', label: t('products.rating.no') },
            ]}
          />
        </Field>
      </View>
    </Card>
  );
}
