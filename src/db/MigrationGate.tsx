import { useEffect, useState, type ReactNode } from 'react';

import { DataErrorScreen } from '@/components/DataErrorScreen';

import { db } from './client';
import { DatabaseNewerError, runMigrations } from './migrate';
import migrations from './migrations/migrations';
import { backupBeforeMigrating } from './preMigrationBackup';

type Props = {
  children: ReactNode;
  /**
   * Called once migrating has finished, so the splash can hide: `true` when the data is ready,
   * `false` when an error screen shows instead (the app must not start on that data).
   */
  onReady?: (migrated: boolean) => void;
};

type Outcome = { ok: true } | { ok: false; error: Error };

function migrate(): Outcome {
  try {
    runMigrations(db, migrations, { beforeMigrate: backupBeforeMigrating });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

function Migrator({ children, onReady, onRetry }: Props & { onRetry: () => void }) {
  // Runs once per mount (Try again remounts); the splash is still up. Migrating is idempotent, so
  // a second render in development finds nothing to do.
  const [outcome] = useState(migrate);

  useEffect(() => {
    onReady?.(outcome.ok);
  }, [outcome, onReady]);

  if (!outcome.ok) {
    return outcome.error instanceof DatabaseNewerError ? (
      <DataErrorScreen kind="newer" />
    ) : (
      <DataErrorScreen kind="failed" detail={outcome.error.message} onRetry={onRetry} />
    );
  }
  return <>{children}</>;
}

/**
 * Brings the database up to date before rendering the app (`runMigrations`: a copy first, then
 * every migration in one transaction). Shows a retry screen if that fails, or an "update the app"
 * screen if the data is from a newer version.
 */
export function MigrationGate(props: Props) {
  const [attempt, setAttempt] = useState(0);
  return <Migrator key={attempt} {...props} onRetry={() => setAttempt((n) => n + 1)} />;
}
