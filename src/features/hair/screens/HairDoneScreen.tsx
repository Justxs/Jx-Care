import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ModalSheet } from '@/components/ModalSheet';
import { EmptyState } from '@/components/ui/empty-state';

/** T3 Hair task done. A route so the hair reminder can open it. Placeholder until task 033. */
export function HairDoneScreen() {
  const { t } = useTranslation();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  return (
    <ModalSheet title={t('screens.hairDone')}>
      <EmptyState icon="info" title={`T3 · ${t('screens.hairDone')} · ${taskId}`}>
        {t('dev.builtIn', { task: '033' })}
      </EmptyState>
    </ModalSheet>
  );
}
