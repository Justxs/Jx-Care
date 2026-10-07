import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ABExplainSheet, StreakExplainSheet } from '@/components/ExplainSheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  productListStore,
  setProductFilters,
  setProductsSegment,
} from '@/features/products/listState';
import { defaultProductFilters } from '@/features/products/types';
import { openShoppingList } from '@/features/shopping/viewState';
import { useWeeklyPhotoOptional } from '@/features/progress/useWeeklyPhotoOptional';
import type { TodayRoutineGroup } from '@/features/routines/repo';
import { useUpdateSettings } from '@/features/settings/api';
import { weekdayOf } from '@/lib/appDay';
import { motion } from '@/theme/motion';

import { useToday } from '../api';
import { timeOfDayName } from '../cardText';
import { CheckInCard } from '../components/CheckInCard';
import { ExpiringCard } from '../components/ExpiringCard';
import { RoutineCard } from '../components/RoutineCard';
import { OptionalGroup, SetupCard } from '../components/SetupCard';
import { TodayHeader } from '../components/TodayHeader';
import {
  firstUnfinishedKey,
  sectionOrder,
  setupView,
  type SectionKey,
  type SetupStepKey,
} from '../logic';
import {
  useHairDueSlot,
  useHairStreakSlot,
  useShoppingToBuySlot,
  useWeeklyPhotoSlot,
} from '../slots';
import { useRoutineActions } from '../useRoutineActions';

/** Final-size placeholders for a section whose query isn't ready (rare: Today is prefetched). */
const ROUTINE_CARD_SKELETON = 188;
const EXPIRING_SKELETON = 260;

const sectionEntering = FadeIn.duration(motion.duration.base);
const sectionExiting = FadeOut.duration(motion.duration.fast);
const sectionLayout = LinearTransition.duration(motion.duration.base);

/** Where each first-run step leads. */
function openSetupStep(step: SetupStepKey): void {
  switch (step) {
    case 'product':
      // P3 quick mode: every new product uses the short form.
      router.push('/product-form');
      return;
    case 'routine':
      // The starter sheet on Routines (task 023).
      router.push('/routines?starter=1');
      return;
    case 'hair':
      // Quick hair setup (task 032); until then the Routines Hair side.
      router.push('/routines?segment=hair&setup=1');
      return;
  }
}

/** "See all": Products filtered to expired and expiring. */
function seeAllExpiring(): void {
  setProductFilters({
    ...defaultProductFilters,
    sort: productListStore.state.filters.sort,
    statuses: ['expired', 'expiring'],
  });
  setProductsSegment('mine');
  router.navigate('/products');
}

/** T1 Today: what to do today, top to bottom, each section hidden when empty. */
export function TodayScreen() {
  const { t } = useTranslation();
  const today = useToday();
  const { day, settings, setup, groups, skinStreak, expiring, anyExpired } = today;
  const updateSettings = useUpdateSettings();
  const actions = useRoutineActions(day);
  const hairStreak = useHairStreakSlot();
  const hairDue = useHairDueSlot();
  const toBuy = useShoppingToBuySlot();
  const photoRow = useWeeklyPhotoSlot();
  const weeklyPhoto = useWeeklyPhotoOptional();

  const [streakOpen, setStreakOpen] = useState(false);
  const [abOpen, setAbOpen] = useState(false);
  const [abGroup, setAbGroup] = useState<TodayRoutineGroup | null>(null);

  const view = setup && settings ? setupView(setup, settings, day) : null;
  const hasRoutine = !!setup?.routine;
  const saveDoneAt = view?.saveDoneAt ?? false;

  // All three steps done: remember the day, so the card goes the next app day.
  const { mutate: saveSettings } = updateSettings;
  useEffect(() => {
    if (saveDoneAt) saveSettings({ setupDoneAt: day });
  }, [saveDoneAt, day, saveSettings]);

  const hideSetup = () => updateSettings.mutate({ setupHiddenAt: day });
  const setupShown = !!view?.visible;
  // One filled button per screen: the setup card owns it while it shows.
  const primaryKey = setupShown ? null : groups ? firstUnfinishedKey(groups) : null;

  const routinesNode: ReactNode =
    groups === undefined ? (
      <Skeleton height={ROUTINE_CARD_SKELETON} radius={16} />
    ) : (
      <View className="gap-3">
        {groups.map((g) => (
          <RoutineCard
            key={g.key}
            group={g}
            day={day}
            primary={g.key === primaryKey}
            onOpen={(id) => router.push(`/player/${id}`)}
            onAllDone={actions.allDone}
            onChoose={actions.pick}
            onAboutAB={(group) => {
              setAbGroup(group);
              setAbOpen(true);
            }}
          />
        ))}
      </View>
    );

  const expiringNode: ReactNode =
    expiring === undefined ? (
      <Skeleton height={EXPIRING_SKELETON} radius={16} />
    ) : (
      <ExpiringCard
        products={expiring}
        onProduct={(id) => router.push(`/products/${id}`)}
        onSeeAll={seeAllExpiring}
        toBuy={toBuy}
        onShopping={openShoppingList}
      />
    );

  const nodes: Record<SectionKey, ReactNode> = {
    setup:
      view && setup ? (
        <View className="gap-4">
          <SetupCard view={view} progress={setup} onStep={openSetupStep} onHide={hideSetup} />
          {view.mode === 'progress' ? (
            <OptionalGroup
              onPhoto={weeklyPhoto.press}
              photoDetail={weeklyPhoto.detail}
              onAvoid={() => router.push('/settings/avoid')}
            />
          ) : null}
        </View>
      ) : null,
    routines: routinesNode,
    expiring: expiringNode,
    hair: hairDue,
    checkIn: <CheckInCard photo={photoRow} />,
  };

  const sections = sectionOrder({
    setup: setupShown,
    routines: groups === undefined ? hasRoutine : groups.length > 0,
    expiring: expiring === undefined || expiring.length > 0,
    anyExpired,
    hair: !!hairDue,
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 20 }}>
        {/* First paint has every section in place; only later changes animate. */}
        <LayoutAnimationConfig skipEntering>
          <TodayHeader
            day={day}
            skinStreak={hasRoutine ? (skinStreak ?? { current: 0, best: 0 }) : null}
            hairStreak={hairStreak}
            onStreakPress={() => setStreakOpen(true)}
          />
          {sections.map((key) => (
            <Animated.View
              key={key}
              testID={`today-section-${key}`}
              entering={sectionEntering}
              exiting={sectionExiting}
              layout={sectionLayout}
            >
              {nodes[key]}
            </Animated.View>
          ))}
        </LayoutAnimationConfig>
      </ScrollView>

      <StreakExplainSheet
        open={streakOpen}
        onClose={() => setStreakOpen(false)}
        skin={skinStreak}
      />
      <ABExplainSheet
        open={abOpen}
        onClose={() => setAbOpen(false)}
        timeOfDay={abGroup ? timeOfDayName(abGroup, t) : ''}
        names={abGroup?.routines.map((r) => r.name) ?? []}
        weekday={weekdayOf(day)}
      />
    </SafeAreaView>
  );
}
