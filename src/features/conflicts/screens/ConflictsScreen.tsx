import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, LayoutAnimationConfig } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB_LIST_END_SPACE, Fab } from '@/components/ui/fab';
import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { showToast } from '@/state/ui';
import { motion } from '@/theme/motion';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import { useAddCommonRules, useRules } from '../api';
import { ConflictRuleSheet } from '../components/ConflictRuleSheet';
import { SideName, useSideLabel } from '../components/SidePicker';
import type { RuleItem, RuleWithCount } from '../repo';

type SheetState = { key: number; open: boolean; rule: RuleItem | null };

/** S3 Conflicts: the person's rules, how many routines each fires in, and the rule editor. */
export function ConflictsScreen() {
  const { t } = useTranslation();
  const rules = useRules();
  const addCommon = useAddCommonRules();
  const [sheet, setSheet] = useState<SheetState>({ key: 0, open: false, rule: null });
  const items = rules.data ?? [];
  const empty = !rules.isPending && items.length === 0;

  const openSheet = (rule: RuleItem | null) =>
    setSheet((s) => ({ key: s.key + 1, open: true, rule }));

  const onAddCommon = async () => {
    const { rulesAdded } = await addCommon.mutateAsync(undefined);
    showToast({
      message:
        rulesAdded > 0
          ? t('conflicts.commonAdded', { count: rulesAdded })
          : t('conflicts.commonNone'),
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('screens.conflicts')} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: FAB_LIST_END_SPACE,
          gap: 16,
        }}
      >
        {rules.isPending ? (
          <SkeletonRules />
        ) : empty ? (
          <EmptyState
            icon="alert-triangle"
            title={t('conflicts.emptyTitle')}
            actionLabel={t('conflicts.addCommon')}
            onAction={onAddCommon}
            secondaryLabel={t('conflicts.addRule')}
            onSecondary={() => openSheet(null)}
          >
            {t('conflicts.emptyBody')}
          </EmptyState>
        ) : (
          <Animated.View entering={FadeIn.duration(motion.duration.fast)} className="gap-3">
            <Text className="px-1 text-body text-ink-muted">{t('conflicts.intro')}</Text>
            <LayoutAnimationConfig skipEntering>
              <Animated.View layout={rowLayout}>
                <Card flush>
                  {items.map((rule, index) => (
                    <Animated.View
                      key={rule.id}
                      entering={rowEntering}
                      exiting={rowExiting}
                      layout={rowLayout}
                    >
                      {index > 0 ? <Separator className="ml-4" /> : null}
                      <RuleRow rule={rule} onPress={() => openSheet(rule)} />
                    </Animated.View>
                  ))}
                </Card>
              </Animated.View>
            </LayoutAnimationConfig>
          </Animated.View>
        )}
      </ScrollView>

      {/* The empty state already offers both actions; one filled button per screen. */}
      {empty ? null : <Fab onPress={() => openSheet(null)}>{t('conflicts.newRule')}</Fab>}

      <ConflictRuleSheet
        key={sheet.key}
        open={sheet.open}
        rule={sheet.rule}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
      />
    </SafeAreaView>
  );
}

function RuleRow({ rule, onPress }: { rule: RuleWithCount; onPress: () => void }) {
  const { t } = useTranslation();
  const spoken = useSideLabel();
  const fires = rule.routineCount > 0;
  const status = fires
    ? t('conflicts.inRoutines', { count: rule.routineCount })
    : t('conflicts.noConflicts');
  return (
    <Pressable
      testID={`rule-row-${rule.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        t('conflicts.ruleLabel', { left: spoken(rule.left), right: spoken(rule.right) }),
        rule.note,
        status,
      ]
        .filter(Boolean)
        .join(', ')}
      className="min-h-[72px] flex-row items-center gap-3 px-4 py-3 active:bg-accent-soft"
    >
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-x-1.5">
          <SideName side={rule.left} />
          <Text className="text-body-strong text-ink-muted">×</Text>
          <SideName side={rule.right} />
        </View>
        {rule.note ? <Text className="text-caption text-ink-muted">{rule.note}</Text> : null}
        <Text
          className={cn('text-caption tabular-nums', fires ? 'text-warning' : 'text-ink-muted')}
        >
          {status}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} tone="ink-muted" />
    </Pressable>
  );
}

function SkeletonRules() {
  return (
    <View className="gap-3">
      <Skeleton width="90%" height={14} />
      <Card flush>
        {[0, 1, 2].map((i) => (
          <View key={i}>
            {i > 0 ? <Separator className="ml-4" /> : null}
            <View className="min-h-[72px] justify-center gap-2 px-4 py-3">
              <Skeleton width="55%" height={16} />
              <Skeleton width="35%" height={12} />
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}
