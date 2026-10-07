/**
 * The backup file (task 040): one JSON document with every table except the notification
 * bookkeeping, validated with zod before anything is imported. Pure: no React, no Expo.
 *
 * ```
 * { app: 'jx-care', formatVersion: 1, schemaVersion: '0001_tired_echo', exportedAt: 1759300000000,
 *   data: { settings: [...], product: [...], ... } }
 * ```
 *
 * Tables are keyed by their SQL name and rows use the Drizzle field names (`photoUri`), exactly as
 * a `select()` returns them. Photo paths are stored relative to the documents folder
 * (`products/<file>`, `progress/<area>/<week>/<file>`), so a restore on another phone (with
 * another documents folder) points at the restored files. The PIN and the recovery question and
 * answer live in secure storage and are never part of a backup.
 */
import { getTableColumns, getTableName, type Column } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';

import journal from '@/db/migrations/meta/_journal.json';
import * as schema from '@/db/schema';
import { allTables } from '@/features/security/repo';

export const APP_ID = 'jx-care';
export const FORMAT_VERSION = 1;
/** The JSON inside a zip backup. */
export const BACKUP_JSON_NAME = 'backup.json';
/** Folders under the documents folder that hold photos (product photos, progress photos). */
export const PHOTO_ROOTS = ['products', 'progress'] as const;

/** Tables a backup leaves out: what is scheduled on this phone is rebuilt after a restore. */
const EXCLUDED_TABLES: readonly SQLiteTable[] = [schema.scheduledNotification];

/** Every table that goes into a backup, keyed by SQL name (a table added later is included). */
export const backupTables: ReadonlyMap<string, SQLiteTable> = new Map(
  allTables
    .filter((table) => !EXCLUDED_TABLES.includes(table))
    .map((table) => [getTableName(table), table] as const),
);

// ─── Schema version ─────────────────────────────────────────────────────────

/** The newest migration tag, e.g. '0001_tired_echo'. */
export const CURRENT_SCHEMA_VERSION: string = journal.entries.at(-1)?.tag ?? '0000';

/** The migration number at the start of a tag ('0001_tired_echo' → 1); NaN when there is none. */
export function schemaIndex(tag: string): number {
  const match = /^(\d+)/.exec(tag);
  return match?.[1] ? Number(match[1]) : Number.NaN;
}

export type BackupRow = Record<string, unknown>;
export type BackupData = Record<string, BackupRow[]>;

/**
 * Moves backup data one schema version forward: the function at key N turns data written by
 * migration N into data for migration N + 1 (renamed columns, split tables, new required values).
 * Columns that were only added need nothing: their defaults fill in on insert. None are needed
 * yet; add one here with every migration that changes the meaning or shape of existing data.
 */
export type DataMigration = (data: BackupData) => BackupData;
export const dataMigrations: Readonly<Record<number, DataMigration>> = {};

/** Runs every data migration from the backup's schema version up to the app's. */
export function migrateForward(
  data: BackupData,
  fromTag: string,
  toTag: string = CURRENT_SCHEMA_VERSION,
  migrations: Readonly<Record<number, DataMigration>> = dataMigrations,
): BackupData {
  let out = data;
  for (let v = schemaIndex(fromTag); v < schemaIndex(toTag); v++) {
    const step = migrations[v];
    if (step) out = step(out);
  }
  return out;
}

// ─── Photo paths ────────────────────────────────────────────────────────────

const withSlash = (uri: string) => (uri.endsWith('/') ? uri : `${uri}/`);

/**
 * A photo uri on this phone as a path under the documents folder (`products/a.jpg`). A uri from
 * another documents folder (an older install) is cut at its `products/` or `progress/` folder.
 * Anything else is returned unchanged.
 */
export function toRelativePath(uri: string, documentUri: string): string {
  const base = withSlash(documentUri);
  if (uri.startsWith(base)) return uri.slice(base.length);
  const match = /\/((?:products|progress)\/.+)$/.exec(uri);
  return match?.[1] ?? uri;
}

/** A path from a backup as a uri on this phone. */
export function toAbsoluteUri(path: string, documentUri: string): string {
  return withSlash(documentUri) + path;
}

/**
 * True for a photo path a backup may restore: under `products/` or `progress/`, with no `..`,
 * no empty segment and no absolute start, so a crafted zip can't write anywhere else.
 */
export function isSafePhotoPath(path: string): boolean {
  const parts = path.split('/');
  const root = parts[0];
  if (!root || !(PHOTO_ROOTS as readonly string[]).includes(root) || parts.length < 2) return false;
  return parts.every((p) => p !== '' && p !== '.' && p !== '..' && !p.includes('\\'));
}

// ─── Build ──────────────────────────────────────────────────────────────────

export type BackupFile = {
  app: typeof APP_ID;
  formatVersion: number;
  schemaVersion: string;
  exportedAt: number;
  data: BackupData;
};

/** Photo columns that hold a uri: product photos and progress photos. */
type PhotoColumn = { table: string; field: string };
export const PHOTO_COLUMNS: readonly PhotoColumn[] = [
  { table: getTableName(schema.product), field: 'photoUri' },
  { table: getTableName(schema.progressPhoto), field: 'fileUri' },
];

function mapPhotoColumns(data: BackupData, map: (value: string) => string | null): BackupData {
  const out: BackupData = { ...data };
  for (const { table, field } of PHOTO_COLUMNS) {
    const rows = out[table];
    if (!rows) continue;
    out[table] = rows.map((row) => {
      const value = row[field];
      return typeof value === 'string' ? { ...row, [field]: map(value) } : row;
    });
  }
  return out;
}

/** Turns this phone's photo uris into relative paths, for the file. */
export function relativisePhotos(data: BackupData, documentUri: string): BackupData {
  return mapPhotoColumns(data, (uri) => toRelativePath(uri, documentUri));
}

/** Turns a backup's relative photo paths into uris on this phone. */
export function absolutisePhotos(data: BackupData, documentUri: string): BackupData {
  return mapPhotoColumns(data, (path) =>
    isSafePhotoPath(path) ? toAbsoluteUri(path, documentUri) : path,
  );
}

/** Every relative photo path the rows point at. */
export function referencedPhotoPaths(data: BackupData): Set<string> {
  const out = new Set<string>();
  for (const { table, field } of PHOTO_COLUMNS) {
    for (const row of data[table] ?? []) {
      const value = row[field];
      if (typeof value === 'string' && isSafePhotoPath(value)) out.add(value);
    }
  }
  return out;
}

export function makeBackupFile(data: BackupData, exportedAt: number): BackupFile {
  return {
    app: APP_ID,
    formatVersion: FORMAT_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt,
    data,
  };
}

// ─── Validation ─────────────────────────────────────────────────────────────

/** Why a file can't be imported; the screen shows `backup.errors.<code>`. */
export type BackupErrorCode = 'notBackup' | 'damaged' | 'newer' | 'readFailed';

export class BackupError extends Error {
  constructor(
    readonly code: BackupErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'BackupError';
  }
}

const jsonValue = z.array(z.union([z.string(), z.number()]));

/** A zod schema for one column, from its Drizzle definition. */
function columnSchema(column: Column): z.ZodType {
  let base: z.ZodType;
  switch (column.dataType) {
    case 'number':
      base = column.columnType === 'SQLiteInteger' ? z.number().int() : z.number();
      break;
    case 'boolean':
      base = z.boolean();
      break;
    case 'json':
      base = jsonValue;
      break;
    default:
      base = z.string();
  }
  if (!column.notNull) base = base.nullable();
  // Ids are kept, so a row must carry its primary key; other columns may fall back to defaults.
  if (!column.primary && (column.hasDefault || !column.notNull)) base = base.optional();
  return base;
}

/** One zod object per table; unknown fields are dropped. */
export const rowSchemas: ReadonlyMap<string, z.ZodType<BackupRow>> = new Map(
  [...backupTables].map(([name, table]) => {
    const shape: Record<string, z.ZodType> = {};
    for (const [field, column] of Object.entries(getTableColumns(table))) {
      shape[field] = columnSchema(column as Column);
    }
    return [name, z.object(shape) as unknown as z.ZodType<BackupRow>] as const;
  }),
);

const envelopeSchema = z.object({
  app: z.literal(APP_ID),
  formatVersion: z.number().int().positive(),
  schemaVersion: z.string().min(1),
  exportedAt: z.number().int().nonnegative(),
  data: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

/**
 * Checks a parsed file and returns it ready to import: the right app, a format and schema this
 * app can read (older schemas are migrated forward), every row valid, exactly one settings row
 * and safe photo paths. Throws a `BackupError` with a code the screen can explain.
 */
export function validateBackup(input: unknown): BackupFile {
  if (typeof input !== 'object' || input === null || (input as { app?: unknown }).app !== APP_ID) {
    throw new BackupError('notBackup');
  }
  const { formatVersion } = input as { formatVersion?: unknown };
  if (typeof formatVersion === 'number' && formatVersion > FORMAT_VERSION) {
    throw new BackupError('newer');
  }
  const envelope = envelopeSchema.safeParse(input);
  if (!envelope.success) throw new BackupError('damaged', envelope.error.message);
  const file = envelope.data;
  const fromIndex = schemaIndex(file.schemaVersion);
  if (Number.isNaN(fromIndex)) throw new BackupError('damaged', 'schemaVersion');
  if (fromIndex > schemaIndex(CURRENT_SCHEMA_VERSION)) throw new BackupError('newer');

  const migrated = migrateForward(file.data as BackupData, file.schemaVersion);
  const data: BackupData = {};
  for (const [name, rowSchema] of rowSchemas) {
    const rows = migrated[name] ?? [];
    const parsed = z.array(rowSchema).safeParse(rows);
    if (!parsed.success) throw new BackupError('damaged', `${name}: ${parsed.error.message}`);
    data[name] = parsed.data;
  }
  if (data[getTableName(schema.settings)]?.length !== 1) {
    throw new BackupError('damaged', 'settings');
  }
  for (const { table, field } of PHOTO_COLUMNS) {
    for (const row of data[table] ?? []) {
      const value = row[field];
      if (typeof value === 'string' && !isSafePhotoPath(value)) {
        throw new BackupError('damaged', `${table}.${field}`);
      }
    }
  }
  return {
    app: APP_ID,
    formatVersion: file.formatVersion,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: file.exportedAt,
    data,
  };
}

/** Parses the text of a JSON backup; see `validateBackup`. */
export function parseBackupJson(text: string): BackupFile {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new BackupError('notBackup');
  }
  return validateBackup(input);
}

// ─── Preview ────────────────────────────────────────────────────────────────

export type BackupPreview = {
  products: number;
  routines: number;
  photos: number;
  exportedAt: number;
  /** Photo files in the zip (0 for a JSON backup). */
  photoFiles: number;
};

/** "84 products, 6 routines, 52 photos": products (archived too), routines, progress photos. */
export function previewOf(file: BackupFile, photoFiles = 0): BackupPreview {
  const count = (table: SQLiteTable) => file.data[getTableName(table)]?.length ?? 0;
  return {
    products: count(schema.product),
    routines: count(schema.routine),
    photos: count(schema.progressPhoto),
    exportedAt: file.exportedAt,
    photoFiles,
  };
}
