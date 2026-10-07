import {
  hairTags,
  skinTags,
  type HairTag,
  type PhotoAngle,
  type ProgressArea,
  type SkinTag,
  type TimeOfDay,
} from '@/db/enums';
import type { ProgressEntry, ProgressPhoto } from '@/db/schema';

/** Progress photo types shared by the repository, the hooks and the screens (tasks 035–037). */

/**
 * Tags a weekly check-in can carry, as stable keys translated at display. Skin entries use the
 * seven skin tags (C5); hair album entries use the hair tags.
 */
export type ProgressTag = SkinTag | HairTag;

export function progressTags(area: ProgressArea): readonly ProgressTag[] {
  return area === 'hair' ? hairTags : skinTags;
}

/** The file operations the repository needs, so tests can pass a fake without native code. */
export interface ProgressFileStore {
  /** Removes one photo file; a missing file is fine. */
  deletePhotoFile(uri: string): void;
  /** Removes `progress/<area>/<weekStart>/` and everything in it; a missing folder is fine. */
  deleteWeekFolder(area: ProgressArea, weekStart: string): void;
}

export type SavePhotoTarget = { area: ProgressArea; weekStart: string; angle: PhotoAngle };

export type StoredPhotoFile = {
  uri: string;
  /** Path under the document folder, e.g. `progress/skin/2026-10-05/front-1759730400000.jpg`. */
  path: string;
  bytes: number;
};

/** Everything the app does with progress photo files (`files.ts` on the phone). */
export interface ProgressFiles extends ProgressFileStore {
  /** Crops to 3:4, shrinks to 1600 px, saves as JPEG in the private folder; returns its uri. */
  savePhoto(tempUri: string, target: SavePhotoTarget, takenAt?: number): Promise<string>;
  /** True for a file already inside the private progress folder. */
  isProgressFile(uri: string): boolean;
  /** Every saved progress photo (backup, task 040). */
  listAllPhotoFiles(): StoredPhotoFile[];
  /** Size of all progress photos in bytes (S8). */
  totalPhotoBytes(): number;
}

export type PhotoRef = Pick<ProgressPhoto, 'id' | 'angle' | 'fileUri'>;

/** One week's check-in with its photos in angle order. */
export type WeekEntry = ProgressEntry & {
  photos: ProgressPhoto[];
  byAngle: Partial<Record<PhotoAngle, ProgressPhoto>>;
};

export type CheckInInput = {
  area: ProgressArea;
  weekStart: string;
  photos: { angle: PhotoAngle; fileUri: string }[];
  rating: number | null;
  tags: string[];
  note: string | null;
  /** When the photos were taken; defaults to now. */
  takenAt?: number;
};

/** The review's input (C5): photos are camera files (temporary) or ones already saved. */
export type SaveCheckInInput = Omit<CheckInInput, 'photos' | 'takenAt'> & {
  photos: { angle: PhotoAngle; uri: string }[];
};

/** `taken` has photos, `skipped` was skipped, `empty` has no photo ("No photo"). */
export type TileStatus = 'taken' | 'skipped' | 'empty';

/** One tile on Progress photos (C3). Tiles show no rating. */
export type TimelineTile = {
  weekStart: string;
  entryId: number | null;
  status: TileStatus;
  /** The front photo, or the first angle when front is missing. */
  photo: PhotoRef | null;
  photoCount: number;
  takenAt: number | null;
  /** App day the photo was taken; tiles are labelled with it ("6 Oct"). */
  takenDay: string | null;
  /** The week that contains today. */
  current: boolean;
};

export type LastPhoto = PhotoRef & {
  entryId: number;
  weekStart: string;
  takenAt: number | null;
};

/** Weekly photo row on Today and the reminder. */
export type WeekStatus = 'taken' | 'skipped' | 'due';

/** A weekly photo taken on a given app day (C2). */
export type DayPhoto = {
  area: ProgressArea;
  entryId: number;
  weekStart: string;
  takenAt: number;
  photo: PhotoRef;
};

/** How often one time of day was done in the week, e.g. evenings 5 of 7. */
export type RoutineWeekCount = {
  key: string;
  timeOfDay: TimeOfDay;
  customName: string | null;
  done: number;
  due: number;
};

export type HairWeekCount = {
  taskId: number;
  name: string;
  done: number;
};

export type ProductChange = { id: number; name: string; brand: string | null; day: string };

/** C6 "What changed this week", as plain data; the screen formats it. */
export type WeekContext = {
  /** Days of the week counted so far (a running week stops at today). */
  days: number;
  /** Skin routines by time of day; empty for the hair album. */
  routines: RoutineWeekCount[];
  /** Hair tasks done that week; empty for skin. */
  hairTasks: HairWeekCount[];
  started: ProductChange[];
  stopped: ProductChange[];
  condition: {
    daysLogged: number;
    /** Tags logged that week, most frequent first. */
    tags: { tag: string; count: number }[];
  };
};
