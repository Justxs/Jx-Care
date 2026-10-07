import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSettings } from '@/features/settings/api';
import { useFormat } from '@/i18n/useFormat';
import {
  answerReminderAsk,
  reminderAskStore,
  type ShownReminderAsk,
} from '@/notifications/askPermission';

export type ReminderAskSheetProps = {
  /** The ask to show; kept by the host while the sheet closes so its text doesn't vanish. */
  ask: ShownReminderAsk;
  open: boolean;
  onAllow: () => void;
  onNotNow: () => void;
  /** Called once the sheet has closed: after an answer, Close, the backdrop or a drag. */
  onClose: () => void;
};

/**
 * ReminderAskSheet (P3 reminder ask, replaces O6): "Get a reminder before it expires?", the
 * product and when it would fire, an example notification, then Allow reminders / Not now.
 * Routine, hair and weekly photo reminders ask the same way the first time one is switched on.
 */
export function ReminderAskSheet({ ask, open, onAllow, onNotNow, onClose }: ReminderAskSheetProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings().data;
  const warnDays = settings?.expiryWarnDays ?? 30;
  const time = f.time(settings?.expiryReminderTime ?? '09:00');
  // The Reminders screen ('settings') never opens the sheet.
  const reason = ask.reason === 'settings' ? 'expiry' : ask.reason;
  const name = ask.productName ?? '';

  let line: string;
  let example: string;
  if (reason === 'expiry') {
    const days = t('reminders.ask.daysAhead', { count: warnDays });
    line = t(
      settings?.expiryDayReminderOn === false
        ? 'reminders.ask.line.expiryWarningOnly'
        : 'reminders.ask.line.expiry',
      { name, days, time },
    );
    example = t('reminders.notify.expiresIn', { name, count: warnDays });
  } else {
    line = t(`reminders.ask.line.${reason}`);
    example = t(`reminders.ask.example.${reason}`);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t(`reminders.ask.title.${reason}`)}
      cancelLabel={t('common.close')}
      footer={
        <View className="gap-2">
          <Button onPress={onAllow}>{t('reminders.ask.allow')}</Button>
          <Button variant="ghost" onPress={onNotNow}>
            {t('common.notNow')}
          </Button>
        </View>
      }
    >
      <View className="gap-4 pt-1">
        <Text className="text-body">{line}</Text>
        <View
          accessible
          accessibilityLabel={`${t('reminders.ask.exampleLabel')}: ${example}`}
          className="gap-2 rounded-xl bg-subtle p-3"
        >
          <View className="flex-row items-center gap-2">
            <Logo size={20} />
            <Text className="flex-1 text-label text-ink-muted">{t('common.appName')}</Text>
            <Text className="text-caption text-ink-muted">{t('reminders.ask.now')}</Text>
          </View>
          <Text className="text-body-strong">{example}</Text>
        </View>
        <Text className="text-caption text-ink-muted">{t('reminders.ask.later')}</Text>
      </View>
    </Sheet>
  );
}

/**
 * Shows the reminder ask whenever `askForReminders` opens one. Mounted once in app/_layout.tsx,
 * so the ask can open over the screen the product form returns to.
 */
export function ReminderAskHost() {
  const client = useQueryClient();
  const ask = useSelector(reminderAskStore, (s) => s.ask);
  // The last ask stays rendered while the sheet slides away.
  const [shown, setShown] = useState<ShownReminderAsk | null>(ask);
  if (ask && ask.id !== shown?.id) setShown(ask);
  if (!shown) return null;

  const answer = (a: 'allow' | 'notNow') => {
    answerReminderAsk(a, client).catch(() => {});
  };
  return (
    <ReminderAskSheet
      ask={shown}
      open={ask !== null}
      onAllow={() => answer('allow')}
      onNotNow={() => answer('notNow')}
      onClose={() => {
        // Closed without an answer (Close, backdrop, drag) counts as Not now.
        answer('notNow');
        setShown(null);
      }}
    />
  );
}
