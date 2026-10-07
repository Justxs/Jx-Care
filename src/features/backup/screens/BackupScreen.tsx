import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible } from '@/components/ui/collapsible';
import { ListRow } from '@/components/ui/list-row';
import { Progress } from '@/components/ui/progress';
import { RadioList } from '@/components/ui/radio-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { ResetDialog } from '@/features/security/components/ResetDialog';
import { useSettings } from '@/features/settings/api';
import { useFormat } from '@/i18n/useFormat';
import { appDay } from '@/lib/appDay';
import { showToast } from '@/state/ui';

import { useExportBackup, usePhotoStats, usePickBackup, useRestoreBackup } from '../api';
import type { BackupProgress, ExportKind } from '../export';
import { BackupError, type BackupPreview } from '../format';
import type { PreparedImport } from '../import';
import { isBackupDue } from '../reminders';
import { formatBytes } from '../size';

/** Flattens a RadioList into the card around it (never a card in a card). */
const IN_CARD = 'rounded-none bg-transparent shadow-none dark:shadow-none';

const NO_PROGRESS: BackupProgress = { done: 0, total: 0 };

/**
 * S8 Backup and restore: the last backup (with an amber callout when it is older than 30 days or
 * missing), Export backup as JSON or a zip with photos, Import backup (preview counts, then
 * Replace all data), photo storage and Reset app.
 */
export function BackupScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings().data;
  const stats = usePhotoStats().data;
  const [kind, setKind] = useState<ExportKind>('json');
  const [exportProgress, setExportProgress] = useState<BackupProgress>(NO_PROGRESS);
  const [restoreProgress, setRestoreProgress] = useState<BackupProgress>(NO_PROGRESS);
  const [prepared, setPrepared] = useState<PreparedImport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const exporter = useExportBackup(setExportProgress);
  const picker = usePickBackup();
  const restorer = useRestoreBackup(setRestoreProgress);
  const busy = exporter.isPending || picker.isPending || restorer.isPending;

  const lastBackupAt = settings?.lastBackupAt ?? null;
  const lastDate = lastBackupAt === null ? null : f.date(appDay(lastBackupAt));
  const due = settings !== undefined && isBackupDue(lastBackupAt, f.today);
  const photoCount = stats?.count ?? 0;
  const photoSize = formatBytes(stats?.bytes ?? 0, t, f.number);

  const errorText = (error: unknown) =>
    error instanceof BackupError ? t(`backup.errors.${error.code}`) : t('backup.errors.failed');

  const onExport = () => {
    setExportProgress(NO_PROGRESS);
    exporter.mutate(kind, {
      onError: () => showToast({ message: t('backup.export.failed') }),
    });
  };

  const onPick = () => {
    setImportError(null);
    picker.mutate(undefined, {
      onSuccess: (result) => setPrepared(result),
      onError: (error) => setImportError(errorText(error)),
    });
  };

  const onReplace = () => {
    if (!prepared) return;
    setRestoreProgress(NO_PROGRESS);
    restorer.mutate(prepared, {
      onSuccess: () => setPrepared(null),
      onError: (error) => {
        setPrepared(null);
        setImportError(errorText(error));
      },
    });
  };

  const restoringZip = prepared?.source.kind === 'zip' && restorer.isPending;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('screens.backup')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 32 }}>
        {due ? (
          <View testID="backup-callout" className="gap-1 rounded-xl bg-warning-soft p-4">
            <Text className="text-body-strong">{t('backup.callout.title')}</Text>
            <Text className="text-body">
              {lastDate ? t('backup.callout.last', { date: lastDate }) : t('backup.callout.never')}
            </Text>
          </View>
        ) : null}

        <Card title={t('backup.export.title')} flush>
          <View className="min-h-[48px] justify-center px-4 pt-3">
            <Text className="text-body-strong">
              {lastDate ? t('backup.lastBackup', { date: lastDate }) : t('backup.noBackup')}
            </Text>
          </View>
          <RadioList
            accessibilityLabel={t('backup.export.format')}
            className={IN_CARD}
            items={[
              {
                value: 'json',
                label: t('backup.export.json'),
                detail: t('backup.export.jsonDetail'),
              },
              {
                value: 'zip',
                label: t('backup.export.zip'),
                detail:
                  photoCount > 0
                    ? t('backup.export.zipDetail', { count: photoCount, size: photoSize })
                    : t('backup.export.zipDetailNone'),
              },
            ]}
            value={kind}
            onValueChange={(v) => setKind(v === 'zip' ? 'zip' : 'json')}
          />
          <View className="gap-3 p-4">
            <Button onPress={onExport} loading={exporter.isPending} disabled={busy}>
              {t('backup.export.action')}
            </Button>
            <Collapsible open={exporter.isPending && kind === 'zip'}>
              <ProgressRow
                label={t('backup.export.progress', exportProgress)}
                {...exportProgress}
              />
            </Collapsible>
          </View>
        </Card>

        <Card title={t('backup.import.title')}>
          <View className="gap-4">
            <Text className="text-body text-ink-muted">{t('backup.import.body')}</Text>
            {prepared ? (
              <ImportPreview
                preview={prepared.preview}
                withPhotos={prepared.source.kind === 'zip'}
                busy={restorer.isPending}
                onReplace={() => setConfirmOpen(true)}
                onCancel={() => setPrepared(null)}
              />
            ) : (
              <Button
                variant="secondary"
                onPress={onPick}
                loading={picker.isPending}
                disabled={busy}
              >
                {t('backup.import.action')}
              </Button>
            )}
            <Collapsible open={restoringZip}>
              <ProgressRow
                label={t('backup.import.progress', restoreProgress)}
                {...restoreProgress}
              />
            </Collapsible>
            {/* Reserved helper line: an error never pushes the cards below. */}
            <Text
              accessibilityLiveRegion="polite"
              className="min-h-[20px] text-caption text-danger"
            >
              {importError ?? ''}
            </Text>
          </View>
        </Card>

        <Card title={t('backup.storage.title')} flush>
          <ListRow
            icon="images"
            label={t('backup.storage.photos')}
            value={stats ? photoSize : undefined}
            trailing="value"
          />
          <Separator inset />
          <ListRow
            icon="rotate-ccw"
            label={t('settings.resetApp')}
            tone="danger"
            trailing="none"
            onPress={() => setResetOpen(true)}
            disabled={busy}
          />
        </Card>
      </ScrollView>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('backup.import.confirmTitle')}
        description={t('backup.import.confirmBody', {
          date: prepared ? f.date(appDay(prepared.preview.exportedAt)) : '',
        })}
        actionLabel={t('backup.import.replace')}
        cancelLabel={t('common.cancel')}
        destructive
        onAction={onReplace}
      />
      {/* The export controls are on this screen, so Export backup just closes the dialog. */}
      <ResetDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        fromSettings
        onExport={() => setResetOpen(false)}
      />
    </SafeAreaView>
  );
}

function ProgressRow({ label, done, total }: { label: string; done: number; total: number }) {
  return (
    <View className="gap-2 pb-1">
      <Text className="text-caption text-ink-muted tabular-nums">{label}</Text>
      <Progress value={done} max={Math.max(1, total)} accessibilityLabel={label} />
    </View>
  );
}

function ImportPreview({
  preview,
  withPhotos,
  busy,
  onReplace,
  onCancel,
}: {
  preview: BackupPreview;
  withPhotos: boolean;
  busy: boolean;
  onReplace: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <View testID="backup-preview" className="gap-3">
      <View className="gap-1">
        <Text className="text-body-strong">
          {t('backup.import.from', { date: f.date(appDay(preview.exportedAt)) })}
        </Text>
        <Text className="text-body tabular-nums">
          {t('backup.import.counts', {
            products: t('backup.import.products', { count: preview.products }),
            routines: t('backup.import.routines', { count: preview.routines }),
            photos: t('backup.import.photos', { count: preview.photos }),
          })}
        </Text>
        {withPhotos ? null : (
          <Text className="text-caption text-ink-muted">{t('backup.import.noPhotos')}</Text>
        )}
      </View>
      <Button variant="danger" onPress={onReplace} loading={busy}>
        {t('backup.import.replace')}
      </Button>
      <Button variant="ghost" onPress={onCancel} disabled={busy}>
        {t('common.cancel')}
      </Button>
    </View>
  );
}
