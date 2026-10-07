import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import type { Db } from '@/db';
import type { PhotoAngle } from '@/db/enums';
import { conditionLog, product, routine, routineLog, routineStep } from '@/db/schema';
import { ProgressPhotosRow } from '@/features/calendar/components/ProgressPhotosRow';
import { getWeekEntry, saveCheckIn, skipWeek } from '@/features/progress/repo';
import { saveSettings, type SettingsPatch } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { momentOf } from '@/lib/appDay';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { DayPhotoSection } from '../../components/DayPhotoSection';
import { PhotoCompareScreen } from '../PhotoCompareScreen';
import { ProgressPhotosScreen } from '../ProgressPhotosScreen';
import { WeekDetailScreen } from '../WeekDetailScreen';

const mockParams: { current: Record<string, string | undefined> } = { current: {} };

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams.current,
}));

jest.mock('@/features/progress/files', () => ({
  progressFiles: jest.requireActual('@/features/progress/fakeFiles').createFakeFiles(),
}));

const { router } = jest.requireMock<{
  router: { push: jest.Mock; back: jest.Mock };
}>('expo-router');
const { progressFiles } = jest.requireMock<{
  progressFiles: ReturnType<typeof import('@/features/progress/fakeFiles').createFakeFiles>;
}>('@/features/progress/files');

// Wednesday 7 Oct 2026, in the week of Monday 5 Oct.
const TODAY = '2026-10-07';
const THIS_WEEK = '2026-10-05';
const SEP28 = '2026-09-28';
const SEP21 = '2026-09-21';
const SEP14 = '2026-09-14';
const SEP7 = '2026-09-07';

function setup(patch: SettingsPatch = {}) {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en', ...patch });
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  return app;
}

/** Saves a week's photos, taken at 10:00 on `day`. */
function take(
  db: Db,
  weekStart: string,
  day: string,
  angles: PhotoAngle[] = ['front'],
  over: { rating?: number | null; tags?: string[]; note?: string | null } = {},
) {
  const takenAt = momentOf(day, '10:00');
  const photos = angles.map((angle) => ({
    angle,
    fileUri: progressFiles.add({ area: 'skin', weekStart, angle }, takenAt),
  }));
  return saveCheckIn(
    db,
    {
      area: 'skin',
      weekStart,
      photos,
      rating: over.rating ?? null,
      tags: over.tags ?? [],
      note: over.note ?? null,
      takenAt,
    },
    progressFiles,
  ).entryId;
}

/** 7 Sep taken (8 Sep), 14 Sep skipped, 21 Sep missed, 28 Sep taken (29 Sep), this week due. */
function seedTimeline(db: Db) {
  take(db, SEP7, '2026-09-08', ['front', 'left']);
  skipWeek(db, 'skin', SEP14);
  take(db, SEP28, '2026-09-29', ['front', 'left'], {
    rating: 4,
    tags: ['calm', 'oily'],
    note: 'Less red',
  });
}

const created = new Date(2026, 0, 1, 12).getTime();

const doneLog = (routineId: number, stepId: number, day: string) => ({
  routineId,
  day,
  dueStepIds: [stepId],
  doneStepIds: [stepId],
});

function seedWeekContext(db: Db) {
  const [morning, evening] = db
    .insert(routine)
    .values([
      { name: 'Morning', timeOfDay: 'morning', sortTime: '07:00', createdAt: created },
      { name: 'Evening', timeOfDay: 'evening', sortTime: '21:00', createdAt: created },
    ])
    .returning()
    .all();
  const [m, e] = db
    .insert(routineStep)
    .values([
      { routineId: morning!.id, position: 0 },
      { routineId: evening!.id, position: 0 },
    ])
    .returning()
    .all();
  const days = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
  db.insert(routineLog)
    .values([
      ...days.map((d) => doneLog(evening!.id, e!.id, d)),
      ...days.slice(0, 2).map((d) => doneLog(morning!.id, m!.id, d)),
    ])
    .run();
  db.insert(product)
    .values([
      { name: 'Retinol 0.2% serum', area: 'skin', openedAt: '2026-09-30' },
      {
        name: 'Vitamin C serum',
        area: 'skin',
        openedAt: '2026-06-01',
        archivedAt: '2026-10-02',
      },
    ])
    .run();
  db.insert(conditionLog)
    .values([
      { day: '2026-09-28', area: 'skin', states: ['calm'] },
      { day: '2026-09-29', area: 'skin', states: ['calm'] },
      { day: '2026-09-30', area: 'skin', states: ['calm', 'breakout'] },
      { day: '2026-10-01', area: 'skin', states: ['breakout'] },
    ])
    .run();
}

async function renderWeek(app: ReturnType<typeof setup>, weekStart = SEP28) {
  mockParams.current = { area: 'skin', weekStart };
  await app.render(
    <>
      <WeekDetailScreen />
      <PortalHost />
    </>,
  );
}

function seedCompare(db: Db) {
  take(db, SEP7, '2026-09-08', ['front', 'left']);
  take(db, SEP28, '2026-09-29', ['front']);
  take(db, THIS_WEEK, '2026-10-06', ['front', 'left']);
}

async function renderCompare(app: ReturnType<typeof setup>) {
  await app.render(<PhotoCompareScreen />);
  await fireEvent(await screen.findByTestId('compare-space'), 'layout', {
    nativeEvent: { layout: { width: 390, height: 520 } },
  });
}

const sourceUri = (label: string) =>
  [screen.getByLabelText(label).props.source].flat()[0]?.uri as string;

beforeEach(async () => {
  await setI18nLanguage('en');
  mockParams.current = {};
  router.push.mockClear();
  router.back.mockClear();
  progressFiles.files.clear();
  progressFiles.deleted.length = 0;
  progressFiles.deletedFolders.length = 0;
});

describe('C3 Progress photos', () => {
  it('shows weeks newest first by the date taken, dashed tiles for missing weeks and no stars', async () => {
    const app = setup();
    seedTimeline(app.db);
    await app.render(<ProgressPhotosScreen />);

    await screen.findByText('29 Sep');
    expect(
      screen
        .getAllByRole('button', { name: /^Skin photo, / })
        .map((b) => b.props.accessibilityLabel),
    ).toEqual(['Skin photo, 29 Sep', 'Skin photo, 8 Sep']);
    // Missing weeks: a skipped one and one with nothing saved.
    expect(screen.getByTestId(`missing-${SEP21}`)).toBeTruthy();
    expect(screen.getByTestId(`missing-${SEP14}`)).toBeTruthy();
    expect(screen.getAllByText('No photo')).toHaveLength(2);
    expect(screen.getAllByText('Skipped')).toHaveLength(2);
    expect(screen.getByLabelText('No photo, skipped. 14 Sep to 20 Sep')).toBeTruthy();
    // This week is the button, not an empty tile. No stars, no week numbers.
    expect(screen.queryByTestId(`missing-${THIS_WEEK}`)).toBeNull();
    expect(screen.queryByLabelText(/stars/)).toBeNull();
    expect(screen.queryByText(/week \d/i)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Skin photo, 29 Sep' }));
    expect(router.push).toHaveBeenLastCalledWith(`/calendar/week/skin/${SEP28}`);
    await fireEvent.press(screen.getByRole('button', { name: "Take this week's photo" }));
    expect(router.push).toHaveBeenLastCalledWith('/progress/camera?area=skin');
    await fireEvent.press(screen.getByRole('button', { name: 'Compare' }));
    expect(router.push).toHaveBeenLastCalledWith('/progress/compare?area=skin');
  });

  it('hides the take button once this week is taken', async () => {
    const app = setup();
    seedTimeline(app.db);
    take(app.db, THIS_WEEK, '2026-10-06');
    await app.render(<ProgressPhotosScreen />);
    expect(await screen.findByRole('button', { name: 'Skin photo, 6 Oct' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: "Take this week's photo" })).toBeNull();
  });

  it('shows the empty state with one action', async () => {
    const app = setup();
    await app.render(<ProgressPhotosScreen />);
    expect(await screen.findByText('No photos yet')).toBeTruthy();
    expect(
      screen.getByText('Take one a week in the same light to see your skin change.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Compare' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Take first photo' }));
    expect(router.push).toHaveBeenLastCalledWith('/progress/camera?area=skin');
  });

  it('has no Skin / Hair switch while the hair album is off', async () => {
    const off = setup();
    await off.render(<ProgressPhotosScreen />);
    await screen.findByText('No photos yet');
    expect(screen.queryByRole('radio', { name: 'Hair' })).toBeNull();
  });

  it('switches to the hair album when it is on', async () => {
    const on = setup({ hairAlbumOn: true });
    await on.render(<ProgressPhotosScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Hair' }));
    expect(
      await screen.findByText('Take one a week in the same light to see your hair change.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Take first photo' }));
    expect(router.push).toHaveBeenLastCalledWith('/progress/camera?area=hair');
  });
});

describe('C6 Week detail', () => {
  it('is titled by the date taken and shows every angle, the check-in and what changed', async () => {
    const app = setup();
    seedTimeline(app.db);
    seedWeekContext(app.db);
    await renderWeek(app);

    expect(await screen.findByRole('header', { name: 'Skin photo, 29 Sep' })).toBeTruthy();
    expect(screen.getByLabelText('Front photo, 29 Sep')).toBeTruthy();
    expect(screen.getByLabelText('Left side photo, 29 Sep')).toBeTruthy();
    expect(screen.getByText('Front · 1 of 2')).toBeTruthy();
    expect(screen.getByText('Left side · 2 of 2')).toBeTruthy();
    expect(screen.getByLabelText('Rating: 4 of 5 stars')).toBeTruthy();
    expect(screen.getByText('Calm')).toBeTruthy();
    expect(screen.getByText('Oily')).toBeTruthy();
    expect(screen.getByText('Less red')).toBeTruthy();

    expect(await screen.findByText('What changed this week')).toBeTruthy();
    expect(screen.getByText('Morning routine 2 of 7 days')).toBeTruthy();
    expect(screen.getByText('Evening routine 5 of 7 days')).toBeTruthy();
    expect(screen.getByText('Started Retinol 0.2% serum')).toBeTruthy();
    expect(screen.getByText('Finished Vitamin C serum')).toBeTruthy();
    expect(screen.getByText('Mostly Calm, 2 days Breakout')).toBeTruthy();
    expect(screen.queryByText(/week \d/i)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Compare with…' }));
    expect(router.push).toHaveBeenLastCalledWith(`/progress/compare?area=skin&after=${SEP28}`);
    await fireEvent.press(screen.getByRole('button', { name: 'Retake' }));
    expect(router.push).toHaveBeenLastCalledWith(`/progress/camera?area=skin&week=${SEP28}`);
  });

  it('says so when nothing was logged that week', async () => {
    const app = setup();
    seedTimeline(app.db);
    await renderWeek(app, SEP7);
    expect(await screen.findByText('Nothing logged this week.')).toBeTruthy();
    expect(screen.getByText('Not rated')).toBeTruthy();
  });

  it('deletes the week after the dialog, rows and files', async () => {
    const app = setup();
    seedTimeline(app.db);
    const uris = getWeekEntry(app.db, 'skin', SEP28)!.photos.map((p) => p.fileUri);
    await renderWeek(app);

    await fireEvent.press(await screen.findByRole('button', { name: 'More actions' }));
    await fireEvent.press(await screen.findByRole('menuitem', { name: 'Delete week' }));
    expect(await screen.findByText('Delete the photos from 29 Sep?')).toBeTruthy();
    expect(screen.getByText("This can't be undone.")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(getWeekEntry(app.db, 'skin', SEP28)).toBeNull();
    expect(progressFiles.deleted).toEqual(expect.arrayContaining(uris));
    expect(progressFiles.deletedFolders).toContain(`skin/${SEP28}`);
  });

  it('deletes the photo of the angle on screen', async () => {
    const app = setup();
    seedTimeline(app.db);
    const front = getWeekEntry(app.db, 'skin', SEP28)!.byAngle.front!;
    await renderWeek(app);

    await fireEvent.press(await screen.findByRole('button', { name: 'More actions' }));
    await fireEvent.press(await screen.findByRole('menuitem', { name: 'Delete photo' }));
    expect(await screen.findByText('Delete the Front photo from 29 Sep?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(getWeekEntry(app.db, 'skin', SEP28)!.photos.map((p) => p.angle)).toEqual(['left']),
    );
    expect(progressFiles.deleted).toEqual([front.fileUri]);
    expect(router.back).not.toHaveBeenCalled();
    expect(await screen.findByLabelText('Left side photo, 29 Sep')).toBeTruthy();
  });
});

describe('C7 Compare', () => {
  it('opens side by side with now against four weeks ago, labelled by dates', async () => {
    const app = setup();
    seedCompare(app.db);
    mockParams.current = { area: 'skin' };
    await renderCompare(app);

    expect(await screen.findByRole('button', { name: 'Before: 8 Sep. Change' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'After: 6 Oct. Change' })).toBeTruthy();
    expect(screen.getByTestId('compare-side-by-side')).toBeTruthy();
    expect(sourceUri('Before, 8 Sep')).toContain(`/skin/${SEP7}/front-`);
    expect(sourceUri('After, 6 Oct')).toContain(`/skin/${THIS_WEEK}/front-`);
    expect(screen.getByRole('button', { name: '4 weeks ago vs now' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );

    // Only angles both weeks have.
    const angles = screen.getByLabelText('Angle');
    expect(
      within(angles)
        .getAllByRole('radio')
        .map((r) => r.props.accessibilityLabel),
    ).toEqual(['Front', 'Left side']);
    await fireEvent.press(within(angles).getByRole('radio', { name: 'Left side' }));
    expect(sourceUri('Before, 8 Sep')).toContain(`/skin/${SEP7}/left-`);
    expect(sourceUri('After, 6 Oct')).toContain(`/skin/${THIS_WEEK}/left-`);
  });

  it('picks Before from the list of dates and comes back with 4 weeks ago vs now', async () => {
    const app = setup();
    seedCompare(app.db);
    mockParams.current = { area: 'skin' };
    await renderCompare(app);

    await fireEvent.press(await screen.findByRole('button', { name: 'Before: 8 Sep. Change' }));
    const list = await screen.findByTestId('compare-week-list');
    expect(
      within(list)
        .getAllByRole('button')
        .map((b) => b.props.accessibilityLabel),
    ).toEqual(['6 Oct', '29 Sep', '8 Sep']);
    await fireEvent.press(within(list).getByRole('button', { name: '29 Sep' }));

    expect(await screen.findByRole('button', { name: 'Before: 29 Sep. Change' })).toBeTruthy();
    // 29 Sep has only the front photo.
    expect(screen.queryByLabelText('Angle')).toBeNull();
    expect(screen.getByRole('button', { name: '4 weeks ago vs now' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: false }),
    );
    await fireEvent.press(screen.getByRole('button', { name: '4 weeks ago vs now' }));
    expect(await screen.findByRole('button', { name: 'Before: 8 Sep. Change' })).toBeTruthy();
  });

  it('starts from the week detail’s week as After', async () => {
    const app = setup();
    seedCompare(app.db);
    mockParams.current = { area: 'skin', after: SEP28 };
    await renderCompare(app);
    expect(await screen.findByRole('button', { name: 'After: 29 Sep. Change' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Before: 8 Sep. Change' })).toBeTruthy();
  });

  it('has a slider that is adjustable with accessibility actions', async () => {
    const app = setup();
    seedCompare(app.db);
    mockParams.current = { area: 'skin' };
    await renderCompare(app);

    await fireEvent.press(await screen.findByRole('radio', { name: 'Slider' }));
    const slider = await screen.findByTestId('compare-slider');
    expect(slider.props.accessibilityRole).toBe('adjustable');
    expect(slider.props.accessibilityLabel).toBe('Comparison slider');
    expect(slider.props.accessibilityValue.text).toBe('Shows 50% of 6 Oct');
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByTestId('compare-slider').props.accessibilityValue.text).toBe(
      'Shows 60% of 6 Oct',
    );
    await fireEvent(screen.getByTestId('compare-slider'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    await fireEvent(screen.getByTestId('compare-slider'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(screen.getByTestId('compare-slider').props.accessibilityValue.text).toBe(
      'Shows 40% of 6 Oct',
    );
    // Both dates on top of the one photo (and in the pickers).
    expect(screen.getAllByText('8 Sep')).toHaveLength(2);
    expect(screen.getAllByText('6 Oct')).toHaveLength(2);
  });

  it('zooms both photos with one pinch', async () => {
    const app = setup();
    seedCompare(app.db);
    mockParams.current = { area: 'skin' };
    await renderCompare(app);
    await screen.findByTestId('compare-side-by-side');
    expect(screen.getByText('Pinch to zoom both photos.')).toBeTruthy();
    // One shared transform for both photos.
    expect(screen.getByTestId('compare-zoom-before').props.style).toEqual(
      screen.getByTestId('compare-zoom-after').props.style,
    );

    await act(async () => {
      fireGestureHandler(getByGestureTestId('compare-pinch'), [
        { state: State.BEGAN, scale: 1 },
        { state: State.ACTIVE, scale: 1.5 },
        { state: State.ACTIVE, scale: 2 },
        { state: State.END, scale: 2 },
      ]);
    });
    expect(await screen.findByText('Double tap to see the whole photos again.')).toBeTruthy();
  });

  it('needs photos from two dates', async () => {
    const app = setup();
    take(app.db, SEP28, '2026-09-29');
    mockParams.current = { area: 'skin' };
    await app.render(<PhotoCompareScreen />);
    expect(await screen.findByText('Two photos needed')).toBeTruthy();
  });
});

describe('Calendar row and day detail photo', () => {
  it('shows the last photo and when the next one is due', async () => {
    const app = setup({ weeklyPhotoOn: true, weeklyPhotoWeekday: 7 });
    seedTimeline(app.db);
    await app.render(<ProgressPhotosRow />);
    expect(
      await screen.findByRole('button', {
        name: 'Progress photos, Last photo 29 Sep · next one Sunday',
      }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^Progress photos/ }));
    expect(router.push).toHaveBeenLastCalledWith('/calendar/progress');
  });

  it('says today once the photo day has come and the photo is still due', async () => {
    const app = setup({ weeklyPhotoOn: true, weeklyPhotoWeekday: 3 });
    seedTimeline(app.db);
    await app.render(<ProgressPhotosRow />);
    expect(await screen.findByText('Last photo 29 Sep · next one today')).toBeTruthy();
  });

  it('shows only the last date while Weekly photo is off', async () => {
    const app = setup();
    seedTimeline(app.db);
    await app.render(<ProgressPhotosRow />);
    expect(await screen.findByText('Last photo 29 Sep')).toBeTruthy();
  });

  it('says when there are no photos yet', async () => {
    const app = setup();
    await app.render(<ProgressPhotosRow />);
    expect(await screen.findByText('No photos yet')).toBeTruthy();
  });

  it('names the day’s weekly photo by its date and opens the week', async () => {
    const app = setup();
    seedTimeline(app.db);
    await app.render(<DayPhotoSection day="2026-09-29" />);
    expect(await screen.findByText('Weekly photo')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Skin photo, taken 29 Sep.' }));
    expect(router.push).toHaveBeenLastCalledWith(`/calendar/week/skin/${SEP28}`);
  });

  it('shows nothing on a day without a photo', async () => {
    const app = setup();
    seedTimeline(app.db);
    await app.render(<DayPhotoSection day="2026-09-30" />);
    await waitFor(() => expect(screen.queryByText('Weekly photo')).toBeNull());
  });
});
