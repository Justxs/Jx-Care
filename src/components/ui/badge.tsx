import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import type { ExpiryStatus } from '@/lib/expiry';
import type { ColorToken } from '@/theme/colors';

import { Icon } from './icon';
import { Text } from './text';

export type BadgeStatus = ExpiryStatus | 'avoid';

const tones: Record<BadgeStatus, { box: string; text: string; icon: ColorToken }> = {
  ok: { box: 'bg-ok-soft', text: 'text-ok', icon: 'ok' },
  expiring: { box: 'bg-warning-soft', text: 'text-warning', icon: 'warning' },
  expired: { box: 'bg-danger-soft', text: 'text-danger', icon: 'danger' },
  unopened: { box: 'bg-neutral-soft', text: 'text-neutral', icon: 'neutral' },
  nodate: { box: 'bg-neutral-soft', text: 'text-neutral', icon: 'neutral' },
  avoid: { box: 'bg-danger-soft', text: 'text-danger', icon: 'danger' },
};

export type BadgeProps = {
  status: BadgeStatus;
  /** Overrides the word ("Expired 2 Oct"). The badge always shows a word. */
  children?: ReactNode;
  className?: string;
};

/** Expiry status (or Avoid) pill. Always a word, never colour alone. */
export function Badge({ status, children, className }: BadgeProps) {
  const { t } = useTranslation();
  const tone = tones[status];
  return (
    <View
      className={cn(
        'min-h-[24px] min-w-[44px] flex-row items-center justify-center gap-1 self-start rounded-full px-2 py-0.5',
        tone.box,
        className,
      )}
    >
      {status === 'avoid' ? <Icon name="ban" size={14} tone={tone.icon} /> : null}
      <Text className={cn('text-label tabular-nums', tone.text)}>
        {children ?? t(`common.status.${status}`)}
      </Text>
    </View>
  );
}
