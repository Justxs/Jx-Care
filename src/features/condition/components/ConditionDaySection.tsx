import { useSelector } from '@tanstack/react-store';
import { Fragment } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { ConditionArea } from '@/db/enums';
import { appStore } from '@/state/app';

import { useConditionDay } from '../api';
import { useTagLabel } from '../labels';
import { normaliseStates } from '../tags';
import { useConditionLogSheet } from './ConditionLogSheet';
import { ConditionPill } from './ConditionTone';

const areas = ['skin', 'hair'] as const;

/**
 * C2 condition log: the day's skin and hair tags as pills with their notes, and Edit; or "Log
 * how your skin was". Both open T4 on that day. Any past day can be logged (not only the last
 * 7 days); future days show nothing.
 */
export function ConditionDaySection({ day }: { day: string }) {
  const { t } = useTranslation();
  const label = useTagLabel();
  const today = useSelector(appStore, (s) => s.activeDay);
  const { data } = useConditionDay(day);
  const sheet = useConditionLogSheet();
  if (day > today) return null;

  const logged = areas.filter((a) => data?.[a]);
  const heading = (
    <View className="min-h-[44px] flex-row items-center gap-2 px-1">
      <Text accessibilityRole="header" className="flex-1 text-title-s">
        {t('condition.day.title')}
      </Text>
      {logged.length > 0 ? (
        <Pressable
          onPress={() => sheet.open(day, 'skin')}
          accessibilityRole="button"
          accessibilityLabel={t('condition.day.editLabel')}
          hitSlop={4}
          className="min-h-[44px] min-w-[44px] items-center justify-center px-2 active:opacity-85"
        >
          <Text className="text-body-strong text-accent">{t('common.edit')}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (!data) {
    return (
      <View className="gap-1">
        {heading}
        <Skeleton height={96} radius={16} />
      </View>
    );
  }

  return (
    <View testID="condition-day" className="gap-1">
      {heading}
      {logged.length === 0 ? (
        <Button variant="secondary" icon="notebook-pen" onPress={() => sheet.open(day, 'skin')}>
          {t('condition.day.log')}
        </Button>
      ) : (
        <Card flush>
          {logged.map((area, i) => {
            const entry = data[area];
            if (!entry) return null;
            const tags = normaliseStates(area, entry.states);
            return (
              <Fragment key={area}>
                {i > 0 ? <Separator className="ml-4" /> : null}
                <AreaLog
                  area={area}
                  tags={tags}
                  note={entry.note}
                  spoken={[
                    `${t(`common.${area}`)}: ${
                      tags.length > 0
                        ? tags.map((tag) => label(area, tag)).join(', ')
                        : t('condition.day.noTags')
                    }`,
                    entry.note,
                  ]
                    .filter(Boolean)
                    .join('. ')}
                />
              </Fragment>
            );
          })}
        </Card>
      )}
      {sheet.element}
    </View>
  );
}

type AreaLogProps = {
  area: ConditionArea;
  tags: readonly string[];
  note: string | null;
  spoken: string;
};

function AreaLog({ area, tags, note, spoken }: AreaLogProps) {
  const { t } = useTranslation();
  return (
    <View accessible accessibilityLabel={spoken} className="gap-2 px-4 py-3">
      <Text className="text-label text-ink-muted">{t(`common.${area}`)}</Text>
      {tags.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {tags.map((tag) => (
            <ConditionPill key={tag} area={area} tag={tag} />
          ))}
        </View>
      ) : null}
      {note ? <Text className="text-body">{note}</Text> : null}
    </View>
  );
}
