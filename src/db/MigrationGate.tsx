import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { db } from './client';
import migrations from './migrations/migrations';

type Props = {
  children: ReactNode;
  /** Called once the database is migrated, so the splash can hide. */
  onReady?: () => void;
};

function Migrator({ children, onReady, onRetry }: Props & { onRetry: () => void }) {
  const { success, error } = useMigrations(db, migrations);
  const { t } = useTranslation();
  const settled = success || error !== undefined;

  useEffect(() => {
    if (settled) onReady?.();
  }, [settled, onReady]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas px-6">
        <Text className="text-center text-title-m text-ink">{t('errors.dataTitle')}</Text>
        <Text className="text-center text-body text-ink-muted">{t('errors.dataBody')}</Text>
        <Text className="text-center text-caption text-ink-muted">{error.message}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="mt-3 min-h-[52px] items-center justify-center rounded-md bg-accent px-5"
        >
          <Text className="text-body-strong text-on-accent">{t('errors.tryAgain')}</Text>
        </Pressable>
      </View>
    );
  }
  if (!success) return null;
  return <>{children}</>;
}

/** Runs the Drizzle migrations before rendering the app; shows a retry screen if they fail. */
export function MigrationGate(props: Props) {
  const [attempt, setAttempt] = useState(0);
  return <Migrator key={attempt} {...props} onRetry={() => setAttempt((n) => n + 1)} />;
}
