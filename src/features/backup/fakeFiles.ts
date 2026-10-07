import type { BackupFiles, PhotoFile } from './files';

export const FAKE_DOCUMENTS = 'file:///documents/';
const FAKE_CACHE = 'file:///cache/';

const concat = (a: Uint8Array, b: Uint8Array) => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
};

const isPhoto = (uri: string) =>
  uri.startsWith(`${FAKE_DOCUMENTS}products/`) || uri.startsWith(`${FAKE_DOCUMENTS}progress/`);

/**
 * An in-memory file system for backup tests: `disk` maps a uri to its bytes. Photo paths live
 * under `file:///documents/`, exports under `file:///cache/`.
 */
export function createFakeBackupFiles() {
  const disk = new Map<string, Uint8Array>();
  const staged = new Map<string, Uint8Array>();

  const fake: BackupFiles & {
    disk: Map<string, Uint8Array>;
    staged: Map<string, Uint8Array>;
    /** Puts a photo on the fake disk and returns its uri. */
    addPhoto(path: string, bytes?: Uint8Array): string;
    /** The photo files as `path → bytes`. */
    photos(): Map<string, Uint8Array>;
  } = {
    disk,
    staged,
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
      staged.set(path, bytes);
    },
    clearStaged() {
      staged.clear();
    },
    commitStaged() {
      for (const uri of disk.keys()) if (isPhoto(uri)) disk.delete(uri);
      for (const [path, bytes] of staged) disk.set(FAKE_DOCUMENTS + path, bytes);
      staged.clear();
    },
    prunePhotos(keep) {
      for (const uri of disk.keys()) {
        if (isPhoto(uri) && !keep.has(uri.slice(FAKE_DOCUMENTS.length))) disk.delete(uri);
      }
    },
  };
  return fake;
}
