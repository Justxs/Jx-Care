import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export type CheckInCardProps = {
  /** "This week's skin photo" row (task 036); null when there is none this week. */
  photo: ReactNode;
  /** "How's your skin today?" chips and "Hair and note" (task 038). */
  skin: ReactNode;
};

/** Check-in: one card with the weekly photo row and the skin chips, hidden when both are empty. */
export function CheckInCard({ photo, skin }: CheckInCardProps) {
  const { t } = useTranslation();
  if (!photo && !skin) return null;
  return (
    <Card title={t('common.checkIn')} className="gap-4">
      {photo}
      {photo && skin ? <Separator /> : null}
      {skin}
    </Card>
  );
}
