import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { Db } from '@/db';
import { getWeekEntry, saveCheckIn } from '@/features/progress/repo';
import { getSettings, saveSettings, type SettingsPatch } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { captureStore, clearSession, setPhoto, startSession } from '../../captureSession';
import { PhotoReviewScreen } from '../PhotoReviewScreen';
import { ProgressCameraScreen } from '../ProgressCameraScreen';

type Permission = { granted: boolean; status: string; canAskAgain: boolean };

type Shot = { uri: string; width: number; height: number };

const mockCamera: {
  permission: Permission;
  request: jest.Mock<Promise<Permission>, []>;
  shots: number;
  takePictureAsync: jest.Mock<Promise<Shot>, []>;
} = {
  permission: { granted: true, status: 'granted', canAskAgain: true },
  request: jest.fn(async (): Promise<Permission> => mockCamera.permission),
  shots: 0,
  takePictureAsync: jest.fn(async (): Promise<Shot> => ({
    uri: `file:///cache/Camera/shot-${++mockCamera.shots}.jpg`,
    width: 1200,
    height: 1600,
  })),
};

jest.mock('expo-camera', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const CameraView = React.forwardRef(function CameraView(
    props: { testID?: string; facing?: string; mirror?: boolean },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({ takePictureAsync: mockCamera.takePictureAsync }));
    // `accessibilityHint` carries the facing so the test can read it.
    return React.createElement(RN.View, { testID: props.testID, accessibilityHint: props.facing });
  });
  return {
    CameraView,
    useCameraPermissions: () => [mockCamera.permission, mockCamera.request],
  };
});

const mockParams: { area?: string; week?: string } = { area: 'skin' };
const mockListeners: ((e: { preventDefault: () => void }) => void)[] = [];

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
      dismissTo: jest.fn(),
      canGoBack: () => true,
    },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => undefined | (() => void)) => React.useEffect(effect, [effect]),
    useNavigation: () => ({
      addListener: (_event: string, fn: (e: { preventDefault: () => void }) => void) => {
        mockListeners.push(fn);
        return () => mockListeners.splice(mockListeners.indexOf(fn), 1);
      },
    }),
  };
});

jest.mock('@/features/progress/files', () => ({
  progressFiles: jest.requireActual('@/features/progress/fakeFiles').createFakeFiles(),
}));

const { router } = jest.requireMock<{
  router: { push: jest.Mock; back: jest.Mock; dismissTo: jest.Mock };
}>('expo-router');
const { progressFiles } = jest.requireMock<{
  progressFiles: ReturnType<typeof import('@/features/progress/fakeFiles').createFakeFiles>;
}>('@/features/progress/files');

// Wednesday 7 Oct 2026: the week of Monday 5 Oct.
const TODAY = '2026-10-07';
const WEEK = '2026-10-05';
const LAST_WEEK = '2026-09-28';

function setup(patch: SettingsPatch = {}) {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en', weeklyPhotoOn: true, ...patch });
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  return app;
}

function seedLastWeek(db: Db) {
  saveCheckIn(
    db,
    {
      area: 'skin',
      weekStart: LAST_WEEK,
      photos: [
        { angle: 'front', fileUri: 'file:///documents/progress/skin/2026-09-28/front-1.jpg' },
        { angle: 'left', fileUri: 'file:///documents/progress/skin/2026-09-28/left-1.jpg' },
      ],
      rating: 3,
      tags: [],
      note: null,
    },
    progressFiles,
  );
}

async function renderCamera(app: ReturnType<typeof setup>) {
  await app.render(
    <>
      <ProgressCameraScreen />
      <PortalHost />
    </>,
  );
  // The photo box is sized from its space on screen.
  await fireEvent(screen.getByTestId('camera-box-area'), 'layout', {
    nativeEvent: { layout: { width: 390, height: 600 } },
  });
}

/** expo-image hands its source on as a list. */
const guideUri = () => [screen.getByTestId('camera-guide').props.source].flat()[0]?.uri;
const guideStyle = () => StyleSheet.flatten(screen.getByTestId('camera-guide').props.style);

beforeEach(async () => {
  await setI18nLanguage('en');
  clearSession({ discard: false });
  uiStore.setState((s) => ({ ...s, toasts: [] }));
  mockCamera.permission = { granted: true, status: 'granted', canAskAgain: true };
  mockCamera.request.mockClear();
  mockCamera.shots = 0;
  mockParams.area = 'skin';
  mockParams.week = undefined;
  mockListeners.length = 0;
  router.push.mockClear();
  router.back.mockClear();
  router.dismissTo.mockClear();
  progressFiles.deleted.length = 0;
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe('ProgressCameraScreen', () => {
  it('takes every tracked angle with the guide and the face outline, then opens the review', async () => {
    const app = setup({ skinAngles: ['front', 'left'], photoGuideOpacity: 0.4 });
    seedLastWeek(app.db);
    await renderCamera(app);

    expect(await screen.findByText('Front · 1 of 2')).toBeTruthy();
    expect(screen.getByText('Same light · no makeup · hair back')).toBeTruthy();
    expect(screen.getByTestId('camera-face-outline')).toBeTruthy();
    // Last week's front photo at the guide opacity, mirrored like the front preview.
    expect(await screen.findByTestId('camera-guide')).toBeTruthy();
    expect(guideUri()).toBe('file:///documents/progress/skin/2026-09-28/front-1.jpg');
    expect(guideStyle()).toMatchObject({ opacity: 0.4, transform: [{ scaleX: -1 }] });
    // The front camera with the flash off, saving the photo un-mirrored.
    const camera = screen.getByTestId('camera-view');
    expect(camera.props.accessibilityHint).toBe('front');

    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    expect(await screen.findByTestId('camera-preview')).toBeTruthy();
    // No guide over the photo being checked.
    expect(screen.queryByTestId('camera-guide')).toBeNull();

    // Retake deletes the shot and goes back to the live camera.
    await fireEvent.press(screen.getByRole('button', { name: 'Retake' }));
    expect(progressFiles.deleted).toEqual(['file:///cache/Camera/shot-1.jpg']);
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Use photo' }));

    expect(await screen.findByText('Left side · 2 of 2')).toBeTruthy();
    await waitFor(() =>
      expect(guideUri()).toBe('file:///documents/progress/skin/2026-09-28/left-1.jpg'),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Use photo' }));

    expect(router.push).toHaveBeenCalledWith('/progress/review');
    expect(captureStore.state.photos).toEqual({
      front: 'file:///cache/Camera/shot-2.jpg',
      left: 'file:///cache/Camera/shot-3.jpg',
    });
  });

  it('switches camera, un-mirroring the guide, and toggles the guide off', async () => {
    const app = setup();
    seedLastWeek(app.db);
    await renderCamera(app);
    expect(await screen.findByTestId('camera-guide')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Switch camera' }));
    expect(screen.getByTestId('camera-view').props.accessibilityHint).toBe('back');
    expect(guideStyle()).toMatchObject({ transform: [{ scaleX: 1 }] });

    const toggle = screen.getByRole('switch', { name: 'Show last photo as a guide' });
    expect(toggle.props.accessibilityState).toEqual({ checked: true });
    await fireEvent.press(toggle);
    await waitFor(() => expect(screen.queryByTestId('camera-guide')).toBeNull());
    expect(getSettings(app.db).photoGuideOn).toBe(false);
  });

  it('asks before closing with photos, and deletes them on Discard', async () => {
    const app = setup({ skinAngles: ['front', 'left'] });
    await renderCamera(app);
    await fireEvent.press(await screen.findByRole('button', { name: 'Take photo' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Use photo' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(await screen.findByText('Discard these photos?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Keep them' }));
    expect(router.back).not.toHaveBeenCalled();

    // Android back asks the same.
    const prevent = jest.fn();
    await act(async () => mockListeners.forEach((fn) => fn({ preventDefault: prevent })));
    expect(prevent).toHaveBeenCalled();
    await fireEvent.press(await screen.findByRole('button', { name: 'Discard' }));

    expect(router.back).toHaveBeenCalled();
    expect(progressFiles.deleted).toEqual(['file:///cache/Camera/shot-1.jpg']);
    expect(captureStore.state.area).toBeNull();
  });

  it('closes at once when nothing was taken', async () => {
    const app = setup();
    await renderCamera(app);
    await fireEvent.press(await screen.findByRole('button', { name: 'Close' }));
    expect(router.back).toHaveBeenCalled();
    expect(screen.queryByText('Discard these photos?')).toBeNull();
  });

  it('takes the hair angles with hair tips', async () => {
    mockParams.area = 'hair';
    const app = setup({ hairAlbumOn: true, hairAngles: ['front', 'top'] });
    await renderCamera(app);
    expect(await screen.findByText('Front · 1 of 2')).toBeTruthy();
    expect(screen.getByText('Same light · dry hair · same parting')).toBeTruthy();
    expect(captureStore.state).toMatchObject({ area: 'hair', weekStart: WEEK });
  });

  it('asks for the camera on first open and explains when it is off', async () => {
    mockCamera.permission = { granted: false, status: 'undetermined', canAskAgain: true };
    const app = setup();
    await app.render(<ProgressCameraScreen />);
    expect(mockCamera.request).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Allow the camera')).toBeTruthy();

    mockCamera.permission = { granted: false, status: 'denied', canAskAgain: false };
    await screen.rerender(<ProgressCameraScreen />);
    expect(screen.getByText('The camera is off for Jx-Care')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open phone settings' })).toBeTruthy();
    expect(mockCamera.request).toHaveBeenCalledTimes(1);
  });
});

function startReview(weekStart = WEEK) {
  startSession({ area: 'skin', weekStart, angles: ['front', 'left'] });
  setPhoto('front', 'file:///cache/Camera/a.jpg');
  setPhoto('left', 'file:///cache/Camera/b.jpg');
}

/** The review waits for the week's saved check-in (a retake starts from it). */
async function renderReview(app: ReturnType<typeof setup>) {
  await app.render(<PhotoReviewScreen />);
  await screen.findByRole('button', { name: 'Save' });
}

describe('PhotoReviewScreen', () => {
  it('starts a retake from the week’s saved rating, tags and note, and replaces its photos', async () => {
    const app = setup();
    seedLastWeek(app.db);
    const old = getWeekEntry(app.db, 'skin', LAST_WEEK)!;
    startReview(LAST_WEEK);
    await renderReview(app);

    expect(screen.getByRole('radio', { name: '3 stars' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ checked: true }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalled());

    const entry = getWeekEntry(app.db, 'skin', LAST_WEEK)!;
    expect(entry.id).toBe(old.id);
    expect(entry.rating).toBe(3);
    expect(entry.photos.map((p) => p.fileUri)).not.toContain(old.photos[0]!.fileUri);
    expect(progressFiles.deleted).toEqual(expect.arrayContaining(old.photos.map((p) => p.fileUri)));
  });

  it('saves the rating, tags, note and photos into private storage', async () => {
    const app = setup();
    startReview();
    await renderReview(app);

    // Named by its date, never a week number.
    expect(screen.getByText('Skin photo, 7 Oct')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Front. Retake this photo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Left side. Retake this photo' })).toBeTruthy();
    // The seven skin tags in the standard order.
    const tags = ['Calm', 'Glow', 'Oily', 'Dry', 'Breakout', 'Redness', 'Itchy'];
    for (const tag of tags) expect(screen.getByRole('button', { name: tag })).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: '4 stars' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Calm' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Glow' }));
    await fireEvent.changeText(screen.getByLabelText('Note'), '  Less red  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(router.dismissTo).toHaveBeenCalledWith('/calendar/progress?area=skin'),
    );
    const entry = getWeekEntry(app.db, 'skin', WEEK)!;
    expect(entry).toMatchObject({ rating: 4, tags: ['calm', 'glow'], note: 'Less red' });
    expect(entry.photos.map((p) => p.angle)).toEqual(['front', 'left']);
    for (const p of entry.photos) expect(progressFiles.isProgressFile(p.fileUri)).toBe(true);
    expect(uiStore.state.toasts[0]?.message).toBe('Saved privately in Jx-Care');
    expect(captureStore.state.area).toBeNull();
  });

  it('sends one angle back to the camera, keeping what was filled in', async () => {
    const app = setup();
    startReview();
    await renderReview(app);
    await fireEvent.press(screen.getByRole('radio', { name: '2 stars' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Left side. Retake this photo' }));
    expect(captureStore.state.retake).toBe('left');
    expect(captureStore.state.draft?.rating).toBe(2);
    expect(router.back).toHaveBeenCalled();
  });

  it('shows an error under the note when it is too long', async () => {
    const app = setup();
    startReview();
    await renderReview(app);
    await fireEvent.changeText(screen.getByLabelText('Note'), 'x'.repeat(281));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Keep the note to 280 characters.')).toBeTruthy();
    expect(getWeekEntry(app.db, 'skin', WEEK)).toBeNull();
  });
});
