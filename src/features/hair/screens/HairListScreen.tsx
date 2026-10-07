import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB_LIST_END_SPACE, Fab } from '@/components/ui/fab';
import { Separator } from '@/components/ui/separator';
import { motion } from '@/theme/motion';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import { useHairTasks } from '../api';
import { HairSetupSheet, NEW_HAIR_TASK_HREF } from '../components/HairSetupSheet';
import { HairTaskRow, HairTaskRowSkeleton } from '../components/HairTaskRow';
import type { HairTaskRow as HairTaskItem } from '../repo';

const openTask = (task: HairTaskItem) => router.push(`/routines/hair/${task.id}`);

/**
 * R1 Hair: the Routines tab's Hair segment. Washes and Other care, each in its own card, soonest
 * due first; the empty state opens the quick setup, and the Fab adds a task in the full editor.
 */
export function HairListScreen({
  initialSetupOpen = false,
}: {
  /** Starts with the quick setup sheet open (a link from Today). */
  initialSetupOpen?: boolean;
} = {}) {
  const { t } = useTranslation();
  const tasks = useHairTasks();
  const [setup, setSetup] = useState({ open: initialSetupOpen, key: 0 });
  const washes = tasks.data?.washes ?? [];
  const other = tasks.data?.other ?? [];
  const empty = tasks.data !== undefined && washes.length === 0 && other.length === 0;

  const openSetup = () => setSetup((s) => ({ open: true, key: s.key + 1 }));

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: FAB_LIST_END_SPACE,
        }}
      >
        {tasks.isPending ? (
          <Card title={t('hair.list.washes')} flush>
            <HairTaskRowSkeleton />
            <Separator className="ml-4" />
            <HairTaskRowSkeleton />
          </Card>
        ) : empty ? (
          <Animated.View entering={FadeIn.duration(motion.duration.fast)}>
            <EmptyState
              icon="droplets"
              title={t('hair.list.emptyTitle')}
              actionLabel={t('hair.list.setUp')}
              onAction={openSetup}
            >
              {t('hair.list.emptyBody')}
            </EmptyState>
          </Animated.View>
        ) : (
          <LayoutAnimationConfig skipEntering>
            <Animated.View entering={FadeIn.duration(motion.duration.fast)} className="gap-6">
              {(
                [
                  ['washes', washes],
                  ['other', other],
                ] as const
              ).map(([key, rows]) =>
                rows.length === 0 ? null : (
                  <Animated.View
                    key={key}
                    entering={rowEntering}
                    exiting={rowExiting}
                    layout={rowLayout}
                  >
                    <Card title={t(`hair.list.${key}`)} flush>
                      {rows.map((task, i) => (
                        <Fragment key={task.id}>
                          {i > 0 ? <Separator className="ml-4" /> : null}
                          <Animated.View
                            entering={rowEntering}
                            exiting={rowExiting}
                            layout={rowLayout}
                          >
                            <HairTaskRow task={task} onPress={() => openTask(task)} />
                          </Animated.View>
                        </Fragment>
                      ))}
                    </Card>
                  </Animated.View>
                ),
              )}
            </Animated.View>
          </LayoutAnimationConfig>
        )}
      </ScrollView>

      {!setup.open ? (
        <Animated.View
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.fast)}
          className="absolute bottom-4 right-4"
        >
          <Fab className="static" onPress={() => router.push(NEW_HAIR_TASK_HREF)}>
            {t('hair.list.new')}
          </Fab>
        </Animated.View>
      ) : null}

      <HairSetupSheet
        key={setup.key}
        open={setup.open}
        onClose={() => setSetup((s) => ({ ...s, open: false }))}
      />
    </View>
  );
}
