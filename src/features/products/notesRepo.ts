import { asc, desc, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import { skinTags, type SkinTag } from '@/db/enums';
import { product, productNote } from '@/db/schema';
import { isValidDay } from '@/lib/appDay';

/** P8: a note's text is required and at most this long. */
export const NOTE_MAX = 280;

/** One dated reaction note on a product (P2 Notes timeline). */
export type ProductNoteItem = {
  id: number;
  productId: number;
  day: string;
  text: string;
  tags: SkinTag[];
  createdAt: number;
};

/** A note written on a day, with its product's name (C2 Day detail). */
export type DayNote = ProductNoteItem & { productName: string };

export type NoteInput = { day: string; text: string; tags: readonly string[] };

/** Known skin tags only, once each, in the standard order (Calm, Glow, … Itchy). */
export function cleanTags(tags: readonly string[]): SkinTag[] {
  const set = new Set(tags);
  return skinTags.filter((tag) => set.has(tag));
}

/** Trims the note and tidies spaces; line breaks stay (at most one blank line in a row). */
export function noteText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function checked(input: NoteInput): { day: string; text: string; tags: SkinTag[] } {
  const text = noteText(input.text);
  if (!isValidDay(input.day)) throw new Error(`Invalid note day ${input.day}`);
  if (text.length === 0) throw new Error('A note needs text');
  if (text.length > NOTE_MAX) throw new Error(`A note is at most ${NOTE_MAX} characters`);
  return { day: input.day, text, tags: cleanTags(input.tags) };
}

const noteColumns = {
  id: productNote.id,
  productId: productNote.productId,
  day: productNote.day,
  text: productNote.text,
  tags: productNote.tags,
  createdAt: productNote.createdAt,
};

function toItem<T extends { tags: string[] }>(row: T): T & { tags: SkinTag[] } {
  return { ...row, tags: cleanTags(row.tags) };
}

/** A product's notes, newest day first; notes on the same day newest written first. */
export function listNotes(db: Db, productId: number): ProductNoteItem[] {
  return db
    .select(noteColumns)
    .from(productNote)
    .where(eq(productNote.productId, productId))
    .orderBy(desc(productNote.day), desc(productNote.createdAt), desc(productNote.id))
    .all()
    .map(toItem);
}

export function addNote(db: Db, input: NoteInput & { productId: number }): number {
  return db
    .insert(productNote)
    .values({ productId: input.productId, ...checked(input) })
    .returning({ id: productNote.id })
    .get().id;
}

export function updateNote(db: Db, id: number, input: NoteInput): void {
  db.update(productNote).set(checked(input)).where(eq(productNote.id, id)).run();
}

export function deleteNote(db: Db, id: number): void {
  db.delete(productNote).where(eq(productNote.id, id)).run();
}

/** Notes written on an app day, in the order they were written, each with its product (C2). */
export function notesOnDay(db: Db, day: string): DayNote[] {
  return db
    .select({ ...noteColumns, productName: product.name })
    .from(productNote)
    .innerJoin(product, eq(product.id, productNote.productId))
    .where(eq(productNote.day, day))
    .orderBy(asc(productNote.createdAt), asc(productNote.id))
    .all()
    .map(toItem);
}

/** P2 My rating: 1–5 stars, or `null` to clear it. */
export function setRating(db: Db, productId: number, rating: number | null): void {
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new Error(`A rating is 1 to 5, got ${rating}`);
  }
  db.update(product).set({ rating }).where(eq(product.id, productId)).run();
}

/** P2 "Would buy again": yes, no, or `null` when not chosen. No keeps it out of Suggested (P6). */
export function setWouldRebuy(db: Db, productId: number, wouldRebuy: boolean | null): void {
  db.update(product).set({ wouldRebuy }).where(eq(product.id, productId)).run();
}
