import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import type { Streak } from '@/lib/streak';

/**
 * ExplainSheets (spec Global UI rules, Explaining): short sheets that answer "what does this
 * mean?" with the person's own data. Each line is led by a bare `ink-muted` icon (no tinted
 * circles); the sheet closes with Close or a drag.
 */

export type ExplainLine = { icon: IconName; text: string };

export type ExplainSheetProps = {
  open: boolean;
  /** Called once the sheet has closed (Close, backdrop or drag). */
  onClose: () => void;
  title: string;
  lines: readonly ExplainLine[];
  footer?: ReactNode;
};

export function ExplainSheet({ open, onClose, title, lines, footer }: ExplainSheetProps) {
  const { t } = useTranslation();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      cancelLabel={t('common.close')}
      footer={footer}
    >
      <View className="gap-4 pt-1">
        {lines.map((line) => (
          <View key={line.text} className="flex-row gap-3">
            <View className="pt-px">
              <Icon name={line.icon} size={20} tone="ink-muted" />
            </View>
            <Text className="flex-1 text-body">{line.text}</Text>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

type OpenProps = { open: boolean; onClose: () => void };

/** "A, B and C" in the app language. */
function joinNames(names: readonly string[], and: string): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${and} ${names.at(-1)}`;
}

// ─── Skin streak (StreakChip) ───────────────────────────────────────────────

export type StreakExplainSheetProps = OpenProps & {
  /** The person's skin streak; its lines are left out until it is known. */
  skin?: Streak | null;
};

export function StreakExplainSheet({ open, onClose, skin }: StreakExplainSheetProps) {
  const { t } = useTranslation();
  const lines: ExplainLine[] = [];
  if (skin) {
    lines.push({
      icon: 'calendar-check',
      text: `${t('today.explain.streak.current', { count: skin.current })} ${t('today.explain.streak.best', { count: skin.best })}`,
    });
  }
  lines.push(
    { icon: 'check', text: t('today.explain.streak.counts') },
    { icon: 'calendar', text: t('today.explain.streak.skipped') },
    { icon: 'clock', text: t('today.explain.streak.today') },
    { icon: 'rotate-ccw', text: t('today.explain.streak.restart') },
    { icon: 'droplets', text: t('today.explain.streak.hair') },
  );
  return (
    <ExplainSheet
      open={open}
      onClose={onClose}
      title={t('today.explain.streak.title')}
      lines={lines}
    />
  );
}

// ─── Evening A or B ("About A and B") ───────────────────────────────────────

export type ABExplainSheetProps = OpenProps & {
  /** The time of day's name ("Evening"). */
  timeOfDay: string;
  /** The options' routine names, in card order. */
  names: readonly string[];
  /** ISO weekday the pick is remembered for. */
  weekday: number;
};

export function ABExplainSheet({ open, onClose, timeOfDay, names, weekday }: ABExplainSheetProps) {
  const { t } = useTranslation();
  const weekdays = t(`today.weekdaysPlural.${weekday}`);
  return (
    <ExplainSheet
      open={open}
      onClose={onClose}
      title={t('today.explain.ab.title', { name: timeOfDay })}
      lines={[
        {
          icon: 'columns-2',
          text: t('today.explain.ab.options', {
            names: joinNames(names, t('today.explain.and')),
          }),
        },
        { icon: 'check', text: t('today.explain.ab.notMissed', { name: timeOfDay }) },
        { icon: 'calendar', text: t('today.explain.ab.remembered', { weekdays }) },
        { icon: 'shield', text: t('today.explain.ab.neverCompared') },
      ]}
    />
  );
}

// ─── Why this warning (ConflictTag, "Why?") ─────────────────────────────────

/** One conflict as the sheet shows it; task 030 builds it from a conflict hit. */
export type ConflictExplain = {
  first: { product: string; routine: string };
  second: { product: string; routine: string };
  /** ISO weekdays on which the two steps meet. */
  weekdays: readonly number[];
  /** The rule's note, if it has one. */
  note: string | null;
  mild: boolean;
};

export type ConflictExplainSheetProps = OpenProps & {
  /** Kept while the sheet closes, so its text doesn't vanish mid-animation. */
  conflict: ConflictExplain | null;
  onEditRoutine?: () => void;
  onSeeRule?: () => void;
};

export function ConflictExplainSheet({
  open,
  onClose,
  conflict,
  onEditRoutine,
  onSeeRule,
}: ConflictExplainSheetProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const lines: ExplainLine[] = [];
  if (conflict) {
    const days = f.weekdayList(conflict.weekdays);
    lines.push(
      {
        icon: 'alert-triangle',
        text: t('today.explain.conflict.pair', {
          first: conflict.first.product,
          firstRoutine: conflict.first.routine,
          second: conflict.second.product,
          secondRoutine: conflict.second.routine,
        }),
      },
      {
        icon: 'calendar',
        text: t(conflict.mild ? 'today.explain.conflict.daysMild' : 'today.explain.conflict.days', {
          days,
        }),
      },
    );
    if (conflict.note) lines.push({ icon: 'info', text: conflict.note });
  }
  lines.push({ icon: 'columns-2', text: t('today.explain.conflict.alternatives') });
  const footer =
    onEditRoutine || onSeeRule ? (
      <View className="gap-2">
        {onEditRoutine ? (
          <Button variant="secondary" onPress={onEditRoutine}>
            {t('today.explain.conflict.editRoutine')}
          </Button>
        ) : null}
        {onSeeRule ? (
          <Button variant="ghost" onPress={onSeeRule}>
            {t('today.explain.conflict.seeRule')}
          </Button>
        ) : null}
      </View>
    ) : undefined;
  return (
    <ExplainSheet
      open={open}
      onClose={onClose}
      title={t('today.explain.conflict.title')}
      lines={lines}
      footer={footer}
    />
  );
}

// ─── Mild conflict ──────────────────────────────────────────────────────────

export type MildConflictExplainSheetProps = OpenProps & {
  /** The every-few-days step, when known: "Retinol serum runs every 3 days". */
  step?: { product: string; everyNDays: number } | null;
};

export function MildConflictExplainSheet({ open, onClose, step }: MildConflictExplainSheetProps) {
  const { t } = useTranslation();
  return (
    <ExplainSheet
      open={open}
      onClose={onClose}
      title={t('today.explain.mild.title')}
      lines={[
        {
          icon: 'calendar',
          text: step
            ? t('today.explain.mild.step', { product: step.product, count: step.everyNDays })
            : t('today.explain.mild.generic'),
        },
        { icon: 'alert-triangle', text: t('today.explain.mild.thoseDays') },
        { icon: 'info', text: t('today.explain.mild.noStrength') },
      ]}
    />
  );
}
