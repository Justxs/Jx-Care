import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB_LIST_END_SPACE, Fab } from '@/components/ui/fab';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { qk } from '@/db/queryKeys';
import { showToast } from '@/state/ui';
import { motion } from '@/theme/motion';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import { useDeleteRoutine, useDuplicateRoutine, useRoutines, useSetRoutineActive } from '../api';
import { RoutineCard, RoutineCardSkeleton } from '../components/RoutineCard';
import { RoutineStarterSheet } from '../components/RoutineStarterSheet';
import { defaultStarterTime, groupRoutinesForList, type RoutineListGroup } from '../listGroups';
import type { RoutineItem } from '../repo';

type Segment = 'skin' | 'hair';

/** R1 Routines: skin routines by time of day, and (task 032) hair tasks. */
export function RoutinesScreen() {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('skin');
  const [starter, setStarter] = useState<{
    open: boolean;
    key: number;
    timeOfDay: 'morning' | 'evening';
  }>({ open: false, key: 0, timeOfDay: 'morning' });
  const routines = useRoutines();

  const openStarter = () => {
    const timeOfDay = defaultStarterTime(routines.data ?? [], new Date().getHours());
    setStarter((s) => ({ open: true, key: s.key + 1, timeOfDay }));
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <View className="min-h-[56px] flex-row items-center px-4">
        <Text accessibilityRole="header" className="text-title-l">
          {t('routines.title')}
        </Text>
      </View>
      <View className="px-4 pb-2">
        <ToggleGroup
          value={segment}
          onValueChange={(v) => setSegment(v as Segment)}
          items={[
            { value: 'skin', label: t('common.skin') },
            { value: 'hair', label: t('common.hair') },
          ]}
        />
      </View>
      <View className="flex-1">
        <Animated.View
          key={segment}
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.base)}
          className="absolute inset-0"
        >
          {segment === 'skin' ? (
            <SkinRoutines onNew={openStarter} />
          ) : (
            <EmptyState icon="droplets" title={t('common.hair')}>
              {t('routines.hairSoon')}
            </EmptyState>
          )}
        </Animated.View>
      </View>

      {segment === 'skin' && !starter.open ? (
        <Animated.View
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.fast)}
          className="absolute bottom-4 right-4"
        >
          <Fab className="static" onPress={openStarter}>
            {t('routines.new')}
          </Fab>
        </Animated.View>
      ) : null}

      <RoutineStarterSheet
        key={starter.key}
        open={starter.open}
        onClose={() => setStarter((s) => ({ ...s, open: false }))}
        initialTimeOfDay={starter.timeOfDay}
      />
    </SafeAreaView>
  );
}

function SkinRoutines({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation();
  const routines = useRoutines();
  const actions = useCardActions();
  const [deleting, setDeleting] = useState<RoutineItem | null>(null);
  const items = routines.data ?? [];

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: FAB_LIST_END_SPACE,
        }}
      >
        {routines.isPending ? (
          <View className="gap-3">
            <RoutineCardSkeleton />
            <RoutineCardSkeleton />
          </View>
        ) : items.length === 0 ? (
          <Animated.View entering={FadeIn.duration(motion.duration.fast)}>
            <EmptyState
              icon="list-checks"
              title={t('routines.emptyTitle')}
              actionLabel={t('routines.new')}
              actionIcon="plus"
              onAction={onNew}
            >
              {t('routines.emptyBody')}
            </EmptyState>
          </Animated.View>
        ) : (
          <LayoutAnimationConfig skipEntering>
            <Animated.View entering={FadeIn.duration(motion.duration.fast)} className="gap-6">
              {groupRoutinesForList(items).map((group) => (
                <Animated.View
                  key={group.key}
                  entering={rowEntering}
                  exiting={rowExiting}
                  layout={rowLayout}
                  className="gap-3"
                >
                  <GroupHeading group={group} />
                  {group.routines.map((r) => (
                    <Animated.View
                      key={r.id}
                      entering={rowEntering}
                      exiting={rowExiting}
                      layout={rowLayout}
                    >
                      <RoutineCard
                        routine={r}
                        onPress={() => router.push(`/routines/${r.id}`)}
                        onStart={() => router.push(`/player/${r.id}`)}
                        onActiveChange={(active) => actions.setActive(r.id, active)}
                        onDuplicate={() => actions.duplicate(r)}
                        onDelete={() => setDeleting(r)}
                      />
                    </Animated.View>
                  ))}
                </Animated.View>
              ))}
            </Animated.View>
          </LayoutAnimationConfig>
        )}
      </ScrollView>
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t('routines.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('routines.deleteBody')}
        actionLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onAction={() => {
          if (deleting) actions.remove(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/** No heading for a lone routine (it would repeat the card's name). */
function GroupHeading({ group }: { group: RoutineListGroup }) {
  const { t } = useTranslation();
  if (group.kind === 'single') return null;
  if (group.kind === 'custom') {
    return (
      <Text accessibilityRole="header" className="px-1 text-title-s">
        {t('common.custom')}
      </Text>
    );
  }
  return (
    <View className="gap-1 px-1">
      <Text accessibilityRole="header" className="text-title-s">
        {t('routines.list.alternatives', { time: t(`common.${group.key}`) })}
      </Text>
      <Text className="text-caption text-ink-muted">
        {t(
          group.key === 'evening'
            ? 'routines.list.alternativesNoteEvening'
            : 'routines.list.alternativesNote',
        )}
      </Text>
    </View>
  );
}

function useCardActions() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const setActive = useSetRoutineActive();
  const duplicate = useDuplicateRoutine();
  const del = useDeleteRoutine();

  return {
    /** The switch moves at once; the list refetches after saving (and on failure). */
    setActive: (id: number, active: boolean) => {
      client.setQueriesData<RoutineItem[]>({ queryKey: qk.routines.list }, (list) =>
        list?.map((r) => (r.id === id ? { ...r, active } : r)),
      );
      setActive.mutate(
        { id, active },
        { onError: () => client.invalidateQueries({ queryKey: qk.routines.list }) },
      );
    },
    duplicate: async (routine: Pick<RoutineItem, 'id' | 'name'>) => {
      await duplicate.mutateAsync(routine.id);
      const name = t('routines.copyName', { name: routine.name });
      showToast({ message: t('routines.duplicatedToast', { name }) });
    },
    remove: (id: number) => del.mutate(id),
  };
}
