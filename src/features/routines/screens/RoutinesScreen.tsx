import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB_LIST_END_SPACE, Fab } from '@/components/ui/fab';
import { ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { qk } from '@/db/queryKeys';
import { HairListScreen } from '@/features/hair/screens/HairListScreen';
import { showToast } from '@/state/ui';
import { motion } from '@/theme/motion';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import {
  useDeletedRoutines,
  useDeleteRoutine,
  useDuplicateRoutine,
  useRoutines,
  useSetRoutineActive,
} from '../api';
import { DeletedRoutinesSheet } from '../components/DeletedRoutinesSheet';
import { RoutineCard, RoutineCardSkeleton } from '../components/RoutineCard';
import { RoutineStarterSheet } from '../components/RoutineStarterSheet';
import { defaultStarterTime, groupRoutinesForList, type RoutineListGroup } from '../listGroups';
import type { RoutineItem } from '../repo';

type Segment = 'skin' | 'hair';

const clockHour = () => new Date().getHours();

/** R1 Routines: skin routines by time of day, and hair tasks (the Hair segment). */
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
    const timeOfDay = defaultStarterTime(routines.data ?? [], clockHour());
    setStarter((s) => ({ open: true, key: s.key + 1, timeOfDay }));
  };

  // Links from Today: `?segment=hair` shows Hair, `?starter=1` opens the starter sheet and
  // `?setup=1` the quick hair setup. Each link is handled once (while rendering, so nothing
  // flashes first) and its params are then cleared, so it never re-triggers.
  const params = useLocalSearchParams<{ segment?: string; starter?: string; setup?: string }>();
  const link = [params.segment ?? '', params.starter ?? '', params.setup ?? ''].join('|');
  const [handledLink, setHandledLink] = useState('||');
  const [hairSetup, setHairSetup] = useState({ open: false, key: 0 });
  if (link !== handledLink) {
    setHandledLink(link);
    if (params.segment === 'hair' || params.setup === '1') setSegment('hair');
    else if (params.segment === 'skin' || params.starter === '1') setSegment('skin');
    if (params.starter === '1') openStarter();
    if (params.setup === '1') setHairSetup((h) => ({ open: true, key: h.key + 1 }));
  }
  useEffect(() => {
    if (link !== '||')
      router.setParams({ segment: undefined, starter: undefined, setup: undefined });
  }, [link]);

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
          onValueChange={(v) => {
            setSegment(v as Segment);
            // A setup opened from Today doesn't open again when Hair is shown later.
            setHairSetup((h) => ({ ...h, open: false }));
          }}
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
            <HairListScreen key={hairSetup.key} initialSetupOpen={hairSetup.open} />
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
  const [deletedOpen, setDeletedOpen] = useState(false);
  const deletedCount = useDeletedRoutines().data?.length ?? 0;
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
        {deletedCount > 0 ? (
          <Animated.View
            entering={rowEntering}
            exiting={rowExiting}
            layout={rowLayout}
            className="mt-6"
          >
            <Card flush>
              <ListRow
                icon="trash-2"
                label={t('routines.deleted.title')}
                value={String(deletedCount)}
                onPress={() => setDeletedOpen(true)}
              />
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>
      <DeletedRoutinesSheet open={deletedOpen} onClose={() => setDeletedOpen(false)} />
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
          if (deleting) actions.remove(deleting);
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
    remove: (routine: Pick<RoutineItem, 'id' | 'name'>) => del.mutate(routine),
  };
}
