import { unzipSync, Zip, ZipDeflate } from 'fflate';

/**
 * Zip helpers over fflate (pure JS, synchronous, so they run the same on the phone and in Jest).
 * Writing streams each file out as it is added, so a large backup is never held in memory twice;
 * reading looks entries up one at a time, so the caller can yield to the UI between photos.
 */

/** Zip files start with the local file header signature "PK\x03\x04". */
export function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export type ZipWriter = {
  /** Adds one file. Photos are JPEGs already, so they are stored (`compress: false`). */
  add(name: string, bytes: Uint8Array, compress: boolean): void;
  /** Writes the central directory; nothing can be added after. */
  end(): void;
};

/** A zip written chunk by chunk through `write`. */
export function createZipWriter(write: (chunk: Uint8Array) => void): ZipWriter {
  let failure: Error | null = null;
  const zip = new Zip((err, chunk) => {
    if (err) failure = err;
    else write(chunk);
  });
  const check = () => {
    if (failure) throw failure;
  };
  return {
    add(name, bytes, compress) {
      // Level 0 keeps a deflate stream (stored blocks), which every unzip tool reads safely.
      const file = new ZipDeflate(name, { level: compress ? 6 : 0 });
      zip.add(file);
      file.push(bytes, true);
      check();
    },
    end() {
      zip.end();
      check();
    },
  };
}

/** The names of every file in a zip (folders left out). Throws on a broken zip. */
export function listZipEntries(bytes: Uint8Array): string[] {
  const names: string[] = [];
  unzipSync(bytes, {
    filter: (file) => {
      if (!file.name.endsWith('/')) names.push(file.name);
      return false;
    },
  });
  return names;
}

/** One file from a zip, or undefined when it isn't there. Throws on a broken zip. */
export function readZipEntry(bytes: Uint8Array, name: string): Uint8Array | undefined {
  return unzipSync(bytes, { filter: (file) => file.name === name })[name];
}
