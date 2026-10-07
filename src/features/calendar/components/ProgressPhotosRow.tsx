import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';

/**
 * The row under the grid that opens C3. Task 037 adds its line ("Last photo 29 Sep · next one
 * Sunday") as the row's `detail`.
 */
export function ProgressPhotosRow() {
  const { t } = useTranslation();
  return (
    <Card flush>
      <ListRow
        icon="images"
        label={t('calendar.progressRow')}
        onPress={() => router.push('/calendar/progress')}
      />
    </Card>
  );
}
