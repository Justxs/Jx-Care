import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { appDay } from '@/lib/appDay';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import { useDeletedRoutines, useRestoreRoutine } from '../api';

export type DeletedRoutinesSheetProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * R1 "Deleted routines": routines deleted from R1 or the editor, newest first, each with Restore.
 * Their calendar history never left; restoring puts them back on Routines and Today.
 */
export function DeletedRoutinesSheet({ open, onClose }: DeletedRoutinesSheetProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const deleted = useDeletedRoutines().data ?? [];
  const restore = useRestoreRoutine();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('routines.deleted.title')}
      cancelLabel={t('common.close')}
    >
      <View className="overflow-hidden rounded-xl border border-border">
        {deleted.map((r, i) => (
          <Animated.View
            key={r.id}
            entering={rowEntering}
            exiting={rowExiting}
            layout={rowLayout}
            className={i > 0 ? 'border-t border-border' : undefined}
          >
            <View className="min-h-[64px] flex-row items-center gap-3 px-4 py-3">
              <View className="flex-1 gap-0.5">
                <Text className="text-body">{r.name}</Text>
                <Text className="text-caption text-ink-muted">
                  {t('routines.deleted.deletedOn', { date: f.date(appDay(r.deletedAt)) })}
                </Text>
              </View>
              <Button
                size="sm"
                variant="secondary"
                block={false}
                className="self-center"
                accessibilityLabel={t('routines.deleted.restoreName', { name: r.name })}
                onPress={() => {
                  restore.mutate(r);
                  if (deleted.length === 1) onClose();
                }}
              >
                {t('routines.deleted.restore')}
              </Button>
            </View>
          </Animated.View>
        ))}
      </View>
    </Sheet>
  );
}
