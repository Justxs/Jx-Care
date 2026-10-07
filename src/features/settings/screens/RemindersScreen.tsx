import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible } from '@/components/ui/collapsible';
import { TimeField } from '@/components/ui/date-field';
import { ListRow } from '@/components/ui/list-row';
import { RadioList } from '@/components/ui/radio-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SelectField } from '@/components/ui/select-field';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { openPhoneSettings, sync, usePermission } from '@/notifications';
import { askForReminders } from '@/notifications/askPermission';
import { useMotion } from '@/theme/useMotion';

import { useSettings, useUpdateSettings } from '../api';
import { defaultSettings, type AppSettings, type SettingsPatch } from '../repo';

export const EXPIRY_WARN_OPTIONS = [7, 14, 30, 60] as const;
export const SNOOZE_OPTIONS = [5, 15, 30] as const;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** The weekly digest's fixed time (spec S5: Monday 09:00). */
const DIGEST_TIME = '09:00';

type ReminderSwitch =
  | 'expiryRemindersOn'
  | 'expiryDayReminderOn'
  | 'routineRemindersOn'
  | 'hairRemindersOn'
  | 'weeklyPhotoOn'
  | 'weeklyDigestOn';

/** Flattens a RadioList into the card around it (never a card in a card). */
const IN_CARD = 'rounded-none bg-transparent shadow-none dark:shadow-none';

/**
 * S5 Reminders: every notification setting. Each change saves at once and re-plans the
 * notifications. With notifications off in phone settings, an amber card explains it and every
 * switch shows its saved state as text ("Paused" / "Off"), so nothing looks on when it isn't.
 */
export function RemindersScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const client = useQueryClient();
  const settings: AppSettings = useSettings().data ?? defaultSettings;
  const update = useUpdateSettings();
  const permission = usePermission();
  const denied = permission === 'denied';
  // Once the card has shown, its space stays for this visit so the list never jumps when
  // permission comes back (re-checked on every return to the foreground).
  const [reserveCard, setReserveCard] = useState(denied);
  if (denied && !reserveCard) setReserveCard(true);

  const save = (patch: SettingsPatch) => {
    update.mutate(patch, {
      onSuccess: () => {
        sync().catch(() => {});
      },
    });
  };

  const toggle = async (key: ReminderSwitch, on: boolean) => {
    if (on && permission === 'undetermined') {
      await askForReminders({ reason: 'settings' }, { client });
    }
    // Switching expiry reminders on here answers the product form's ask too.
    save(key === 'expiryRemindersOn' && on ? { [key]: on, reminderAskDone: true } : { [key]: on });
  };

  const row = (key: ReminderSwitch, label: string, detail?: string) => (
    <SwitchRow
      label={label}
      detail={detail}
      checked={settings[key]}
      paused={denied}
      onChange={(on) => {
        void toggle(key, on);
      }}
    />
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('screens.reminders')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 32 }}>
        {reserveCard ? <PermissionCard visible={denied} /> : null}

        <Card title={t('reminders.sections.expiry')} flush>
          {row(
            'expiryRemindersOn',
            t('reminders.expiryWarning'),
            t('reminders.expiryWarningDetail'),
          )}
          <Collapsible open={settings.expiryRemindersOn}>
            <Separator className="ml-4" />
            <View className="gap-1 pt-3">
              <Text className="px-4 text-label">{t('reminders.daysBefore')}</Text>
              <RadioList
                accessibilityLabel={t('reminders.daysBefore')}
                className={IN_CARD}
                items={EXPIRY_WARN_OPTIONS.map((n) => ({ value: String(n), label: f.days(n) }))}
                value={String(settings.expiryWarnDays)}
                onValueChange={(v) => save({ expiryWarnDays: Number(v) })}
              />
            </View>
            <Separator className="ml-4" />
            <View className="px-4 pt-3">
              <TimeField
                label={t('reminders.time')}
                hint={t('reminders.timeHint')}
                value={settings.expiryReminderTime}
                onChange={(expiryReminderTime) => save({ expiryReminderTime })}
              />
            </View>
            <Separator className="ml-4" />
            {row('expiryDayReminderOn', t('reminders.expiryDay'), t('reminders.expiryDayDetail'))}
          </Collapsible>
        </Card>

        <Card title={t('reminders.sections.care')} flush>
          {row(
            'routineRemindersOn',
            t('reminders.routineReminders'),
            t('reminders.routineRemindersDetail'),
          )}
          <Separator className="ml-4" />
          {row('hairRemindersOn', t('reminders.hairTasks'), t('reminders.hairTasksDetail'))}
        </Card>

        <Card title={t('reminders.sections.weekly')} flush>
          {row('weeklyPhotoOn', t('common.weeklyPhoto'), t('reminders.weeklyPhotoDetail'))}
          <Collapsible open={settings.weeklyPhotoOn}>
            <Separator className="ml-4" />
            <View className="gap-1 px-4 pt-3">
              <SelectField
                label={t('reminders.weekday')}
                options={WEEKDAYS.map((d) => ({ value: String(d), label: f.weekday(d) }))}
                value={String(settings.weeklyPhotoWeekday)}
                onValueChange={(v) => save({ weeklyPhotoWeekday: Number(v) })}
                noHelper
              />
              <TimeField
                label={t('reminders.time')}
                value={settings.weeklyPhotoTime}
                onChange={(weeklyPhotoTime) => save({ weeklyPhotoTime })}
              />
            </View>
          </Collapsible>
          <Separator className="ml-4" />
          {row(
            'weeklyDigestOn',
            t('reminders.weeklyDigest'),
            t('reminders.weeklyDigestDetail', { time: f.time(DIGEST_TIME) }),
          )}
        </Card>

        <View className="gap-2">
          <Text accessibilityRole="header" className="text-title-s px-1">
            {t('reminders.snooze')}
          </Text>
          <RadioList
            accessibilityLabel={t('reminders.snooze')}
            items={SNOOZE_OPTIONS.map((n) => ({
              value: String(n),
              label: t('format.minutes', { count: n }),
            }))}
            value={String(settings.snoozeMinutes)}
            onValueChange={(v) => save({ snoozeMinutes: Number(v) })}
          />
          <Text className="px-1 text-caption text-ink-muted">{t('reminders.snoozeHint')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SwitchRowProps = {
  label: string;
  detail?: string;
  checked: boolean;
  /** Notifications are off in phone settings: the saved state as text, not a switch. */
  paused: boolean;
  onChange: (on: boolean) => void;
};

function SwitchRow({ label, detail, checked, paused, onChange }: SwitchRowProps) {
  const { t } = useTranslation();
  if (paused) {
    return (
      <ListRow
        label={label}
        detail={detail}
        trailing="value"
        value={checked ? t('reminders.paused') : t('reminders.off')}
      />
    );
  }
  return (
    <ListRow
      label={label}
      detail={detail}
      trailing="switch"
      checked={checked}
      onCheckedChange={onChange}
    />
  );
}

/**
 * "Notifications are off in phone settings" with Open phone settings. When permission comes back
 * it fades out but keeps its space, so the rows below stay where they are.
 */
function PermissionCard({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  const m = useMotion();
  const config = m.timing('base');
  const opacity = useDerivedValue(() => withTiming(visible ? 1 : 0, config), [visible, config]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      testID="permission-card"
      style={style}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      pointerEvents={visible ? 'auto' : 'none'}
      className="gap-3 rounded-xl bg-warning-soft p-4"
    >
      <View className="gap-1">
        <Text className="text-body-strong">{t('notifications.permissionOff.title')}</Text>
        <Text className="text-body">{t('notifications.permissionOff.body')}</Text>
      </View>
      <Button
        onPress={() => {
          openPhoneSettings().catch(() => {});
        }}
      >
        {t('notifications.permissionOff.openSettings')}
      </Button>
    </Animated.View>
  );
}
