import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SkinCheckIn } from '@/features/condition/components/SkinCheckIn';

export type CheckInCardProps = {
  /** "This week's skin photo" row (task 036); null when there is none this week. */
  photo: ReactNode;
};

/** Check-in: one card with the weekly photo row (when due) above the skin chips. */
export function CheckInCard({ photo }: CheckInCardProps) {
  const { t } = useTranslation();
  return (
    <Card title={t('common.checkIn')} className="gap-4">
      {photo ? (
        <>
          {photo}
          <Separator />
        </>
      ) : null}
      <SkinCheckIn />
    </Card>
  );
}
