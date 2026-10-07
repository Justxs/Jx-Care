import type { ProgressArea } from '@/db/enums';
import { progressPhotoName } from '@/lib/photoCrop';

import type { ProgressFiles, SavePhotoTarget } from './types';

const ROOT = 'file:///documents/progress';

/**
 * An in-memory stand-in for `files.ts`, for repository and screen tests that must run without
 * native code. `files` holds the uri of every saved photo.
 */
export function createFakeFiles() {
  const files = new Set<string>();
  const deleted: string[] = [];
  const deletedFolders: string[] = [];

  const fake: ProgressFiles & {
    files: Set<string>;
    deleted: string[];
    deletedFolders: string[];
    add(target: SavePhotoTarget, takenAt: number): string;
  } = {
    files,
    deleted,
    deletedFolders,
    add({ area, weekStart, angle }, takenAt) {
      const uri = `${ROOT}/${area}/${weekStart}/${progressPhotoName(angle, takenAt)}`;
      files.add(uri);
      return uri;
    },
    async savePhoto(_tempUri, target, takenAt = Date.now()) {
      return fake.add(target, takenAt);
    },
    isProgressFile: (uri) => uri.startsWith(`${ROOT}/`),
    deletePhotoFile(uri) {
      deleted.push(uri);
      files.delete(uri);
    },
    deleteWeekFolder(area: ProgressArea, weekStart: string) {
      const prefix = `${ROOT}/${area}/${weekStart}/`;
      deletedFolders.push(`${area}/${weekStart}`);
      for (const uri of files.keys()) if (uri.startsWith(prefix)) files.delete(uri);
    },
  };
  return fake;
}
