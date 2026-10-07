import { useSelector } from '@tanstack/react-store';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { canEditDay } from '@/features/calendar/repo';
import { useFormat } from '@/i18n/useFormat';
import { appStore } from '@/state/app';

import { useDeleteHairLog, useHairLogsOnDay, useHasHairTask, useWashDueOn } from '../api';
import { hairTaskIcon } from '../display';
import type { HairDayLog } from '../repo';

/**
 * C2 Hair care: what was done that day, each with its products and note, a late wash marked in
 * `warning`. A day with nothing done says when the wash was due ("Nothing done · Next wash was
 * due 6 Oct"). Logs from the last 7 days can be deleted to fix a mistake. Hidden while no hair
 * task exists.
 */
export function HairDaySection({ day }: { day: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const today = useSelector(appStore, (s) => s.activeDay);
  const hasTask = useHasHairTask().data;
  const logs = useHairLogsOnDay(day).data;
  const due = useWashDueOn(day).data;
  const deleteLog = useDeleteHairLog();
  const [confirm, setConfirm] = useState<HairDayLog | null>(null);
  const editable = canEditDay(day, today);

  if (hasTask === false && (logs === undefined || logs.length === 0)) return null;
  if (logs === undefined) {
    return (
      <Card title={t('hair.day.title')}>
        <Skeleton height={56} />
      </Card>
    );
  }
  // Days still to come have nothing to say until they arrive.
  if (logs.length === 0 && day > today) return null;

  let body;
  if (logs.length > 0) {
    body = (
      <Card flush>
        {logs.map((log, i) => {
          const icon = hairTaskIcon(log.kind, log.otherKind);
          const products = log.products.map((p) => p.name).join(' + ');
          const lateFrom = log.timing === 'late' ? log.dueDay : null;
          return (
            <View key={log.id}>
              {i > 0 ? <Separator inset /> : null}
              <View className="min-h-[56px] flex-row items-start gap-3 py-3 pl-4 pr-1">
                <View className="w-[20px] items-center pt-0.5">
                  {icon ? <Icon name={icon} size={20} tone="ink-muted" /> : null}
                </View>
                <View accessible testID={`hair-log-${log.id}`} className="flex-1 gap-0.5">
                  <Text className="text-body-strong">{log.taskName}</Text>
                  {products ? (
                    <Text className="text-caption text-ink-muted">{products}</Text>
                  ) : null}
                  {lateFrom ? (
                    <Text className="text-caption text-warning">
                      {t('hair.day.late', { date: f.date(lateFrom) })}
                    </Text>
                  ) : null}
                  {log.note ? <Text className="text-body">{log.note}</Text> : null}
                </View>
                {editable ? (
                  <Pressable
                    onPress={() => setConfirm(log)}
                    accessibilityRole="button"
                    accessibilityLabel={t('hair.day.deleteLabel', { name: log.taskName })}
                    className="h-[44px] w-[44px] items-center justify-center active:opacity-85"
                  >
                    <Icon name="trash-2" size={20} tone="ink-muted" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>
    );
  } else if (due) {
    body = (
      <Text className="px-1 text-body text-ink-muted">
        {t(day < today ? 'hair.day.nothingDone' : 'hair.day.nothingYet', { date: f.date(due) })}
      </Text>
    );
  } else {
    body = (
      <Card>
        <Text className="text-body text-ink-muted">{t('hair.day.none')}</Text>
      </Card>
    );
  }

  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="px-1 text-title-s">
        {t('hair.day.title')}
      </Text>
      {body}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={
          confirm ? t('hair.day.deleteTitle', { name: confirm.taskName, date: f.date(day) }) : ''
        }
        description={
          confirm?.kind === 'wash' ? t('hair.day.deleteBodyWash') : t('hair.day.deleteBodyOther')
        }
        actionLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onAction={() => {
          if (confirm) deleteLog.mutate(confirm.id);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}
