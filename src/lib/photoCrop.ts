/** Progress photo sizing (task 035): 3:4 portrait, at most 1600 px on the long side. */

export const PROGRESS_PHOTO_MAX = 1600;

/** Width over height of a progress photo. */
export const PROGRESS_PHOTO_RATIO = 3 / 4;

export type CropRect = { originX: number; originY: number; width: number; height: number };

export type PhotoPlan = {
  /** Centre crop to 3:4 portrait, or null when the photo already is 3:4. */
  crop: CropRect | null;
  /** Final size after the crop, or null when it is already small enough. */
  resize: { width: number; height: number } | null;
};

/**
 * How to turn a `width` × `height` photo into a 3:4 portrait no taller than `max`: crop the
 * middle (a landscape photo keeps its centre), then scale down. Never scales up.
 */
export function portraitPlan(width: number, height: number, max = PROGRESS_PHOTO_MAX): PhotoPlan {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  let cw = w;
  let ch = h;
  if (w / h > PROGRESS_PHOTO_RATIO) cw = Math.round(h * PROGRESS_PHOTO_RATIO);
  else if (w / h < PROGRESS_PHOTO_RATIO) ch = Math.round(w / PROGRESS_PHOTO_RATIO);
  cw = Math.min(cw, w);
  ch = Math.min(ch, h);
  // One pixel off is rounding, not a different shape.
  const needsCrop = Math.abs(cw - w) > 1 || Math.abs(ch - h) > 1;
  const crop = needsCrop
    ? {
        originX: Math.floor((w - cw) / 2),
        originY: Math.floor((h - ch) / 2),
        width: cw,
        height: ch,
      }
    : null;
  const finalH = crop ? ch : h;
  const resize =
    finalH > max ? { width: Math.round(max * PROGRESS_PHOTO_RATIO), height: max } : null;
  return { crop, resize };
}

/** File name of a progress photo: `<angle>-<takenAt>.jpg`. */
export function progressPhotoName(angle: string, takenAt: number): string {
  return `${angle}-${takenAt}.jpg`;
}
