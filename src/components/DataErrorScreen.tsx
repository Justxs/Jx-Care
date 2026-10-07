import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export type DataErrorScreenProps = {
  /**
   * `failed`: the database couldn't be opened or updated (nothing was changed; Try again).
   * `newer`: the data was written by a newer version of the app (update the app; no retry).
   */
  kind: 'failed' | 'newer';
  /** The technical message, shown small under `failed`. */
  detail?: string;
  onRetry?: () => void;
};

/**
 * Shown instead of the app when its data can't be opened at launch (`MigrationGate`). Plain
 * React Native views: it can appear before the rest of the app has loaded.
 */
export function DataErrorScreen({ kind, detail, onRetry }: DataErrorScreenProps) {
  const { t } = useTranslation();
  const newer = kind === 'newer';
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-canvas px-6">
      <Text accessibilityRole="header" className="text-center text-title-m text-ink">
        {t(newer ? 'errors.newerTitle' : 'errors.dataTitle')}
      </Text>
      <Text className="text-center text-body text-ink-muted">
        {t(newer ? 'errors.newerBody' : 'errors.dataBody')}
      </Text>
      {!newer && detail ? (
        <Text className="text-center text-caption text-ink-muted">{detail}</Text>
      ) : null}
      {!newer && onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="mt-3 min-h-[52px] items-center justify-center rounded-md bg-accent px-5"
        >
          <Text className="text-body-strong text-on-accent">{t('errors.tryAgain')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
