import { Directory, File, Paths } from 'expo-file-system';

import { PHOTO_ROOTS, STAGING_FOLDER, toRelativePath, withSlash } from './format';

/**
 * Backup file work on the phone (expo-file-system), behind an interface so export and import run
 * in Jest with `createFakeBackupFiles()`.
 */

export type PhotoFile = {
  /** Path under the documents folder, e.g. `products/a.jpg`. */
  path: string;
  uri: string;
  bytes: number;
};

export interface BackupFiles {
  /** The documents folder's uri, ending in '/'. */
  documentUri(): string;
  /** Every file under `products/` and `progress/`. */
  listPhotoFiles(): PhotoFile[];
  /** Whether a photo path exists on this phone. */
  photoExists(path: string): boolean;
  readBytes(uri: string): Promise<Uint8Array>;
  /** A new, empty file in the cache folder (an older one with the name is replaced). */
  createCacheFile(name: string): { uri: string; append(chunk: Uint8Array): void };
  writeCacheText(name: string, text: string): string;
  /** Removes earlier exports from the cache folder. */
  clearExports(prefix: string): void;
  /** Restore: writes one photo into the staging folder (`STAGING_FOLDER/<path>`). */
  writeStaged(path: string, bytes: Uint8Array): void;
  /** Whether a folder exists under the documents folder (`products`, `restore-staging/progress`). */
  folderExists(path: string): boolean;
  /**
   * Renames a folder under the documents folder to `to`, which must not exist yet (its parent
   * folder is created if needed). Restore swaps the photo folders with these moves.
   */
  moveFolder(from: string, to: string): void;
  /** Deletes a folder under the documents folder and everything in it, if it is there. */
  removeFolder(path: string): void;
  /** Deletes photo files whose path is not in `keep`. */
  prunePhotos(keep: ReadonlySet<string>): void;
}

function walk(dir: Directory, out: File[]): void {
  for (const item of dir.list()) {
    if (item instanceof Directory) walk(item, out);
    else out.push(item);
  }
}

function filesUnder(dir: Directory): File[] {
  const out: File[] = [];
  if (dir.exists) walk(dir, out);
  return out;
}

function ensureParent(file: File): void {
  const parent = file.parentDirectory;
  if (!parent.exists) parent.create({ intermediates: true, idempotent: true });
}

const documentUri = () => withSlash(Paths.document.uri);
const folder = (path: string) => new Directory(Paths.document, path);

export const backupFiles: BackupFiles = {
  documentUri,

  listPhotoFiles() {
    const base = documentUri();
    return PHOTO_ROOTS.flatMap((root) =>
      filesUnder(new Directory(Paths.document, root)).map((f) => ({
        path: toRelativePath(f.uri, base),
        uri: f.uri,
        bytes: f.size ?? 0,
      })),
    );
  },

  photoExists: (path) => new File(Paths.document, path).exists,

  readBytes: (uri) => new File(uri).bytes(),

  createCacheFile(name) {
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    file.create();
    return { uri: file.uri, append: (chunk) => file.write(chunk, { append: true }) };
  },

  writeCacheText(name, text) {
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    file.write(text);
    return file.uri;
  },

  clearExports(prefix) {
    for (const item of Paths.cache.list()) {
      if (item instanceof File && item.name.startsWith(prefix)) item.delete();
    }
  },

  writeStaged(path, bytes) {
    const file = new File(folder(STAGING_FOLDER), path);
    ensureParent(file);
    if (file.exists) file.delete();
    file.write(bytes);
  },

  folderExists: (path) => folder(path).exists,

  moveFolder(from, to) {
    const target = folder(to);
    // A move onto an existing folder would land inside it (`to/<name>`), so refuse instead.
    if (target.exists) throw new Error(`Folder ${to} already exists`);
    const parent = target.parentDirectory;
    if (!parent.exists) parent.create({ intermediates: true, idempotent: true });
    folder(from).moveSync(target);
  },

  removeFolder(path) {
    const dir = folder(path);
    if (dir.exists) dir.delete();
  },

  prunePhotos(keep) {
    for (const photo of backupFiles.listPhotoFiles()) {
      if (!keep.has(photo.path)) new File(photo.uri).delete();
    }
  },
};
