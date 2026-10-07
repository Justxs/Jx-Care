import type { BackupFiles, PhotoFile } from './files';
import { STAGING_FOLDER } from './format';

export const FAKE_DOCUMENTS = 'file:///documents/';
const FAKE_CACHE = 'file:///cache/';

const concat = (a: Uint8Array, b: Uint8Array) => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
};

/** A folder under the fake documents folder, as a uri prefix. */
const under = (path: string) => `${FAKE_DOCUMENTS}${path}/`;

const isPhoto = (uri: string) =>
  uri.startsWith(`${FAKE_DOCUMENTS}products/`) || uri.startsWith(`${FAKE_DOCUMENTS}progress/`);

/**
 * An in-memory file system for backup tests: `disk` maps a uri to its bytes. Photo paths live
 * under `file:///documents/`, exports under `file:///cache/`. A folder exists while a file is in
 * it. `onMove` runs before each folder move, so a test can make one fail.
 */
export function createFakeBackupFiles() {
  const disk = new Map<string, Uint8Array>();
  const urisUnder = (path: string) => [...disk.keys()].filter((uri) => uri.startsWith(under(path)));

  const fake: BackupFiles & {
    disk: Map<string, Uint8Array>;
    onMove?: (from: string, to: string) => void;
    /** Puts a photo on the fake disk and returns its uri. */
    addPhoto(path: string, bytes?: Uint8Array): string;
    /** The photo files as `path → bytes`. */
    photos(): Map<string, Uint8Array>;
  } = {
    disk,
    addPhoto(path, bytes = new TextEncoder().encode(`photo:${path}`)) {
      const uri = FAKE_DOCUMENTS + path;
      disk.set(uri, bytes);
      return uri;
    },
    photos() {
      const out = new Map<string, Uint8Array>();
      for (const [uri, bytes] of disk) {
        if (isPhoto(uri)) out.set(uri.slice(FAKE_DOCUMENTS.length), bytes);
      }
      return out;
    },
    documentUri: () => FAKE_DOCUMENTS,
    listPhotoFiles(): PhotoFile[] {
      return [...disk.entries()]
        .filter(([uri]) => isPhoto(uri))
        .map(([uri, bytes]) => ({
          uri,
          path: uri.slice(FAKE_DOCUMENTS.length),
          bytes: bytes.length,
        }));
    },
    photoExists: (path) => disk.has(FAKE_DOCUMENTS + path),
    async readBytes(uri) {
      const bytes = disk.get(uri);
      if (!bytes) throw new Error(`No file at ${uri}`);
      return bytes;
    },
    createCacheFile(name) {
      const uri = FAKE_CACHE + name;
      disk.set(uri, new Uint8Array());
      return {
        uri,
        append: (chunk) => disk.set(uri, concat(disk.get(uri) ?? new Uint8Array(), chunk)),
      };
    },
    writeCacheText(name, text) {
      const uri = FAKE_CACHE + name;
      disk.set(uri, new TextEncoder().encode(text));
      return uri;
    },
    clearExports(prefix) {
      for (const uri of disk.keys()) {
        if (uri.startsWith(FAKE_CACHE + prefix)) disk.delete(uri);
      }
    },
    writeStaged(path, bytes) {
      disk.set(`${under(STAGING_FOLDER)}${path}`, bytes);
    },
    folderExists: (path) => urisUnder(path).length > 0,
    moveFolder(from, to) {
      fake.onMove?.(from, to);
      if (urisUnder(to).length > 0) throw new Error(`Folder ${to} already exists`);
      for (const uri of urisUnder(from)) {
        disk.set(under(to) + uri.slice(under(from).length), disk.get(uri) ?? new Uint8Array());
        disk.delete(uri);
      }
    },
    removeFolder(path) {
      for (const uri of urisUnder(path)) disk.delete(uri);
    },
    prunePhotos(keep) {
      for (const uri of disk.keys()) {
        if (isPhoto(uri) && !keep.has(uri.slice(FAKE_DOCUMENTS.length))) disk.delete(uri);
      }
    },
  };
  return fake;
}
