import { createStore } from '@tanstack/react-store';

import type { PhotoAngle, ProgressArea } from '@/db/enums';

import { progressFiles } from './files';

/**
 * The photos of one camera session (C4) until the review (C5) saves them. They are the camera's
 * temporary files; saving copies them into private storage, discarding deletes them.
 */

/** What the review had filled in, kept while the person goes back to retake an angle. */
export type ReviewDraft = { rating: number; tags: string[]; note: string };

export type CaptureState = {
  area: ProgressArea | null;
  /** Monday of the week the photos are for. */
  weekStart: string | null;
  /** Angles to take, in order. */
  angles: PhotoAngle[];
  /** Accepted photo per angle (temporary file uris). */
  photos: Partial<Record<PhotoAngle, string>>;
  /** An angle the review sent back to the camera. */
  retake: PhotoAngle | null;
  draft: ReviewDraft | null;
};

const emptySession: CaptureState = {
  area: null,
  weekStart: null,
  angles: [],
  photos: {},
  retake: null,
  draft: null,
};

export const captureStore = createStore<CaptureState>(emptySession);

/** Deletes a camera file; never one already in private storage. A missing file is fine. */
export function discardTempFile(uri: string): void {
  if (progressFiles.isProgressFile(uri)) return;
  try {
    progressFiles.deletePhotoFile(uri);
  } catch {
    // The OS clears the cache folder eventually.
  }
}

// ─── Pure reads ─────────────────────────────────────────────────────────────

/** The angle the camera takes next: a retake first, then the first angle with no photo. */
export function nextAngle(s: CaptureState): PhotoAngle | null {
  if (s.retake) return s.retake;
  return s.angles.find((a) => !s.photos[a]) ?? null;
}

/** Every angle has a photo and nothing is being retaken: time for the review. */
export function isComplete(s: CaptureState): boolean {
  return s.angles.length > 0 && nextAngle(s) === null;
}

/** True when closing the camera would lose photos. */
export function hasPhotos(s: CaptureState): boolean {
  return Object.values(s.photos).some(Boolean);
}

/** The session's photos in angle order. */
export function sessionPhotos(s: CaptureState): { angle: PhotoAngle; uri: string }[] {
  return s.angles.flatMap((angle) => {
    const uri = s.photos[angle];
    return uri ? [{ angle, uri }] : [];
  });
}

// ─── Changes ────────────────────────────────────────────────────────────────

/**
 * Starts a session for an album's week. The same area and week keeps the photos already taken
 * (back from the review); anything else starts empty and deletes leftover files.
 */
export function startSession(input: {
  area: ProgressArea;
  weekStart: string;
  angles: PhotoAngle[];
}): void {
  const s = captureStore.state;
  if (s.area === input.area && s.weekStart === input.weekStart) {
    const photos: CaptureState['photos'] = {};
    for (const [angle, uri] of Object.entries(s.photos) as [PhotoAngle, string][]) {
      if (input.angles.includes(angle)) photos[angle] = uri;
      else discardTempFile(uri);
    }
    const retake = s.retake && input.angles.includes(s.retake) ? s.retake : null;
    captureStore.setState(() => ({ ...s, angles: [...input.angles], photos, retake }));
    return;
  }
  for (const uri of Object.values(s.photos)) if (uri) discardTempFile(uri);
  captureStore.setState(() => ({ ...emptySession, ...input, angles: [...input.angles] }));
}

/** Keeps the photo for an angle ("Use photo"); a photo it replaces is deleted. */
export function setPhoto(angle: PhotoAngle, uri: string): void {
  const s = captureStore.state;
  const old = s.photos[angle];
  if (old && old !== uri) discardTempFile(old);
  captureStore.setState(() => ({
    ...s,
    photos: { ...s.photos, [angle]: uri },
    retake: s.retake === angle ? null : s.retake,
  }));
}

/** Sends the camera back to one angle; its photo stays until a new one is used. */
export function retakeAngle(angle: PhotoAngle): void {
  captureStore.setState((s) => ({ ...s, retake: s.angles.includes(angle) ? angle : s.retake }));
}

/** Drops an angle's photo and deletes its file ("Retake" on the camera's preview). */
export function removePhoto(angle: PhotoAngle): void {
  const s = captureStore.state;
  const uri = s.photos[angle];
  if (uri) discardTempFile(uri);
  const photos = { ...s.photos };
  delete photos[angle];
  captureStore.setState(() => ({ ...s, photos }));
}

export function saveDraft(draft: ReviewDraft): void {
  captureStore.setState((s) => ({ ...s, draft }));
}

/**
 * Ends the session. `discard` deletes the photo files (closing the camera); after a save they
 * have already moved into private storage.
 */
export function clearSession(opts: { discard: boolean }): void {
  if (opts.discard) {
    for (const uri of Object.values(captureStore.state.photos)) if (uri) discardTempFile(uri);
  }
  captureStore.setState(() => emptySession);
}
