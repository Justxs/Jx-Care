import {
  captureStore,
  clearSession,
  hasPhotos,
  isComplete,
  nextAngle,
  removePhoto,
  retakeAngle,
  saveDraft,
  sessionPhotos,
  setPhoto,
  startSession,
} from './captureSession';

jest.mock('./files', () => ({
  progressFiles: {
    isProgressFile: (uri: string) => uri.startsWith('file:///documents/progress/'),
    deletePhotoFile: jest.fn(),
  },
}));

const { progressFiles } = jest.requireMock<{
  progressFiles: { deletePhotoFile: jest.Mock };
}>('./files');

const WEEK = '2026-10-05';

beforeEach(() => {
  clearSession({ discard: false });
  progressFiles.deletePhotoFile.mockClear();
});

describe('captureSession', () => {
  it('walks the angles in order and is complete once each has a photo', () => {
    startSession({ area: 'skin', weekStart: WEEK, angles: ['front', 'left', 'right'] });
    expect(nextAngle(captureStore.state)).toBe('front');
    expect(hasPhotos(captureStore.state)).toBe(false);

    setPhoto('front', 'file:///cache/a.jpg');
    expect(nextAngle(captureStore.state)).toBe('left');
    setPhoto('left', 'file:///cache/b.jpg');
    setPhoto('right', 'file:///cache/c.jpg');
    expect(nextAngle(captureStore.state)).toBeNull();
    expect(isComplete(captureStore.state)).toBe(true);
    expect(sessionPhotos(captureStore.state)).toEqual([
      { angle: 'front', uri: 'file:///cache/a.jpg' },
      { angle: 'left', uri: 'file:///cache/b.jpg' },
      { angle: 'right', uri: 'file:///cache/c.jpg' },
    ]);
  });

  it('retakes one angle and deletes the photo it replaces', () => {
    startSession({ area: 'skin', weekStart: WEEK, angles: ['front', 'left'] });
    setPhoto('front', 'file:///cache/a.jpg');
    setPhoto('left', 'file:///cache/b.jpg');

    retakeAngle('front');
    expect(nextAngle(captureStore.state)).toBe('front');
    expect(isComplete(captureStore.state)).toBe(false);
    // The old photo stays until a new one is used.
    expect(captureStore.state.photos.front).toBe('file:///cache/a.jpg');

    setPhoto('front', 'file:///cache/a2.jpg');
    expect(progressFiles.deletePhotoFile).toHaveBeenCalledWith('file:///cache/a.jpg');
    expect(captureStore.state.retake).toBeNull();
    expect(isComplete(captureStore.state)).toBe(true);
  });

  it('removes a photo with its file', () => {
    startSession({ area: 'skin', weekStart: WEEK, angles: ['front'] });
    setPhoto('front', 'file:///cache/a.jpg');
    removePhoto('front');
    expect(captureStore.state.photos.front).toBeUndefined();
    expect(progressFiles.deletePhotoFile).toHaveBeenCalledWith('file:///cache/a.jpg');
  });

  it('keeps the photos when the same week starts again, and drops them for another week', () => {
    startSession({ area: 'skin', weekStart: WEEK, angles: ['front', 'left'] });
    setPhoto('front', 'file:///cache/a.jpg');
    setPhoto('left', 'file:///cache/b.jpg');
    saveDraft({ rating: 4, tags: ['calm'], note: '' });

    // Left side no longer tracked: its photo goes.
    startSession({ area: 'skin', weekStart: WEEK, angles: ['front'] });
    expect(captureStore.state.photos).toEqual({ front: 'file:///cache/a.jpg' });
    expect(captureStore.state.draft?.rating).toBe(4);
    expect(progressFiles.deletePhotoFile).toHaveBeenCalledWith('file:///cache/b.jpg');

    startSession({ area: 'hair', weekStart: WEEK, angles: ['front'] });
    expect(captureStore.state.photos).toEqual({});
    expect(captureStore.state.draft).toBeNull();
    expect(progressFiles.deletePhotoFile).toHaveBeenCalledWith('file:///cache/a.jpg');
  });

  it('deletes the files on discard but not after a save, and never a saved photo', () => {
    startSession({ area: 'skin', weekStart: WEEK, angles: ['front', 'left'] });
    setPhoto('front', 'file:///cache/a.jpg');
    setPhoto('left', 'file:///documents/progress/skin/2026-10-05/left-1.jpg');
    clearSession({ discard: true });
    expect(progressFiles.deletePhotoFile).toHaveBeenCalledTimes(1);
    expect(progressFiles.deletePhotoFile).toHaveBeenCalledWith('file:///cache/a.jpg');
    expect(captureStore.state.area).toBeNull();

    startSession({ area: 'skin', weekStart: WEEK, angles: ['front'] });
    setPhoto('front', 'file:///cache/c.jpg');
    progressFiles.deletePhotoFile.mockClear();
    clearSession({ discard: false });
    expect(progressFiles.deletePhotoFile).not.toHaveBeenCalled();
  });
});
