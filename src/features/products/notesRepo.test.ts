import { eq } from 'drizzle-orm';

import { product, productNote } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { addBuyAgain, listShopping, suggestions } from '@/features/shopping/repo';
import { i18n, setI18nLanguage } from '@/i18n';

import {
  addNote,
  cleanTags,
  deleteNote,
  listNotes,
  noteText,
  notesOnDay,
  setRating,
  setWouldRebuy,
  updateNote,
} from './notesRepo';
import { noteSchema } from './noteSchema';
import { ratingLine } from './ratingText';
import { createProduct, deleteProduct, duplicateProduct, getProduct, markFinished } from './repo';
import type { ProductInput } from './schema';

const TODAY = '2026-10-07';
const WARN = 30;

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'Cream',
  brand: null,
  area: 'skin',
  category: 'other',
  size: null,
  unit: null,
  price: null,
  purchasedAt: null,
  expiresAt: null,
  openedAt: null,
  paoMonths: null,
  notes: null,
  photoUri: null,
  ingredients: [],
  ...over,
});

/** Each note gets its own written time, so "newest written first" is deterministic. */
function writeAt(db: ReturnType<typeof createTestDb>, id: number, ms: number): void {
  db.update(productNote).set({ createdAt: ms }).where(eq(productNote.id, id)).run();
}

describe('product notes', () => {
  it('lists a product’s notes newest day first, then newest written first', () => {
    const db = createTestDb();
    const serum = createProduct(db, input({ name: 'Serum' }));
    const other = createProduct(db, input({ name: 'Other' }));
    const old = addNote(db, { productId: serum, day: '2026-10-01', text: 'Fine', tags: [] });
    const morning = addNote(db, { productId: serum, day: '2026-10-06', text: 'AM', tags: [] });
    const evening = addNote(db, { productId: serum, day: '2026-10-06', text: 'PM', tags: [] });
    addNote(db, { productId: other, day: '2026-10-06', text: 'Not this one', tags: [] });
    writeAt(db, old, 1000);
    writeAt(db, morning, 2000);
    writeAt(db, evening, 3000);

    expect(listNotes(db, serum).map((n) => n.text)).toEqual(['PM', 'AM', 'Fine']);
    expect(listNotes(db, serum)[0]).toMatchObject({
      id: evening,
      productId: serum,
      day: '2026-10-06',
      tags: [],
    });
  });

  it('tidies the text and keeps known tags once each, in the standard order', () => {
    const db = createTestDb();
    const id = createProduct(db, input());
    const note = addNote(db, {
      productId: id,
      day: TODAY,
      text: '  Small   breakout\n\n\n\non chin  ',
      tags: ['redness', 'calm', 'shiny', 'calm'],
    });
    expect(listNotes(db, id)).toEqual([
      expect.objectContaining({
        id: note,
        text: 'Small breakout\n\non chin',
        tags: ['calm', 'redness'],
      }),
    ]);
    expect(cleanTags(['itchy', 'glow', 'dry'])).toEqual(['glow', 'dry', 'itchy']);
    expect(noteText('  a  b \n c ')).toBe('a b\nc');
  });

  it('refuses empty, too long or badly dated notes', () => {
    const db = createTestDb();
    const productId = createProduct(db, input());
    expect(() => addNote(db, { productId, day: TODAY, text: '   ', tags: [] })).toThrow(
      'needs text',
    );
    expect(() => addNote(db, { productId, day: TODAY, text: 'x'.repeat(281), tags: [] })).toThrow(
      'at most 280',
    );
    expect(() => addNote(db, { productId, day: '2026-02-30', text: 'Hi', tags: [] })).toThrow(
      'Invalid note day',
    );
    expect(addNote(db, { productId, day: TODAY, text: 'x'.repeat(280), tags: [] })).toBeGreaterThan(
      0,
    );
  });

  it('updates and deletes a note', () => {
    const db = createTestDb();
    const productId = createProduct(db, input());
    const id = addNote(db, { productId, day: '2026-10-05', text: 'Stung', tags: ['redness'] });
    updateNote(db, id, { day: '2026-10-04', text: 'Stung a bit', tags: ['itchy'] });
    expect(listNotes(db, productId)).toEqual([
      expect.objectContaining({ id, day: '2026-10-04', text: 'Stung a bit', tags: ['itchy'] }),
    ]);
    expect(() => updateNote(db, id, { day: TODAY, text: '', tags: [] })).toThrow('needs text');

    deleteNote(db, id);
    expect(listNotes(db, productId)).toEqual([]);
  });

  it('finds the notes written on a day with their product, in the order written', () => {
    const db = createTestDb();
    const serum = createProduct(db, input({ name: 'Vitamin C serum' }));
    const mask = createProduct(db, input({ name: 'Clay mask' }));
    const first = addNote(db, { productId: mask, day: TODAY, text: 'Calm', tags: ['calm'] });
    const second = addNote(db, { productId: serum, day: TODAY, text: 'Glow', tags: ['glow'] });
    addNote(db, { productId: serum, day: '2026-10-06', text: 'Yesterday', tags: [] });
    writeAt(db, first, 1000);
    writeAt(db, second, 2000);

    expect(notesOnDay(db, TODAY)).toEqual([
      expect.objectContaining({ id: first, productId: mask, productName: 'Clay mask' }),
      expect.objectContaining({ id: second, productId: serum, productName: 'Vitamin C serum' }),
    ]);
    expect(notesOnDay(db, '2026-10-01')).toEqual([]);
  });

  it('deletes a product’s notes with the product', () => {
    const db = createTestDb();
    const id = createProduct(db, input());
    addNote(db, { productId: id, day: TODAY, text: 'Gone soon', tags: [] });
    markFinished(db, id, TODAY);
    deleteProduct(db, id, () => {});
    expect(notesOnDay(db, TODAY)).toEqual([]);
    expect(db.select().from(productNote).all()).toEqual([]);
  });
});

describe('rating and would buy again', () => {
  it('sets, changes and clears the rating', () => {
    const db = createTestDb();
    const id = createProduct(db, input());
    expect(getProduct(db, id, TODAY, WARN)!.rating).toBeNull();
    setRating(db, id, 4);
    expect(getProduct(db, id, TODAY, WARN)!.rating).toBe(4);
    setRating(db, id, 1);
    expect(getProduct(db, id, TODAY, WARN)!.rating).toBe(1);
    setRating(db, id, null);
    expect(getProduct(db, id, TODAY, WARN)!.rating).toBeNull();
  });

  it('refuses ratings outside 1–5', () => {
    const db = createTestDb();
    const id = createProduct(db, input());
    for (const bad of [0, 6, 2.5, -1]) expect(() => setRating(db, id, bad)).toThrow('1 to 5');
  });

  it('sets would buy again to yes, no and back to not chosen', () => {
    const db = createTestDb();
    const id = createProduct(db, input());
    setWouldRebuy(db, id, true);
    expect(getProduct(db, id, TODAY, WARN)!.wouldRebuy).toBe(true);
    setWouldRebuy(db, id, false);
    expect(getProduct(db, id, TODAY, WARN)!.wouldRebuy).toBe(false);
    setWouldRebuy(db, id, null);
    expect(getProduct(db, id, TODAY, WARN)!.wouldRebuy).toBeNull();
  });

  it('never suggests a product marked "Would buy again: No" (shopping list end to end)', () => {
    const db = createTestDb();
    const serum = createProduct(db, input({ name: 'Serum' }));
    const toner = createProduct(db, input({ name: 'Toner', expiresAt: '2026-10-10' }));
    markFinished(db, serum, '2026-10-01');
    const names = () => suggestions(db, TODAY, WARN).map((s) => s.name);
    expect(names()).toEqual(['Toner', 'Serum']);

    setWouldRebuy(db, serum, false);
    setWouldRebuy(db, toner, false);
    expect(names()).toEqual([]);

    // Yes, or clearing the choice, brings them back.
    setWouldRebuy(db, serum, true);
    setRating(db, serum, 4);
    setWouldRebuy(db, toner, null);
    expect(suggestions(db, TODAY, WARN)).toEqual([
      expect.objectContaining({ name: 'Toner', rating: null, wouldRebuy: null }),
      expect.objectContaining({ name: 'Serum', rating: 4, wouldRebuy: true }),
    ]);
  });

  it('shows the rating on linked shopping rows', () => {
    const db = createTestDb();
    const id = createProduct(db, input({ name: 'Serum' }));
    setRating(db, id, 5);
    setWouldRebuy(db, id, true);
    addBuyAgain(db, id);
    expect(listShopping(db).toBuy[0]).toMatchObject({ rating: 5, wouldRebuy: true });
  });

  it('Duplicate copies neither the rating nor the notes', () => {
    const db = createTestDb();
    const id = createProduct(db, input({ name: 'Serum' }));
    setRating(db, id, 5);
    setWouldRebuy(db, id, false);
    addNote(db, { productId: id, day: TODAY, text: 'Lovely', tags: ['glow'] });

    const copy = duplicateProduct(db, id, TODAY);
    const row = db.select().from(product).where(eq(product.id, copy)).get()!;
    expect(row.rating).toBeNull();
    expect(row.wouldRebuy).toBeNull();
    expect(listNotes(db, copy)).toEqual([]);
    expect(listNotes(db, id)).toHaveLength(1);
  });
});

describe('ratingLine', () => {
  const t = i18n.t.bind(i18n);

  it('reads "4 stars · would buy again" and its shorter forms in EN', async () => {
    await setI18nLanguage('en');
    expect(ratingLine(t, 4, true)).toBe('4 stars · would buy again');
    expect(ratingLine(t, 1, false)).toBe('1 star · would not buy again');
    expect(ratingLine(t, 3, null)).toBe('3 stars');
    expect(ratingLine(t, null, true)).toBe('Would buy again');
    expect(ratingLine(t, null, false)).toBe('Would not buy again');
    expect(ratingLine(t, null, null)).toBeNull();
  });

  it('uses Lithuanian plural forms', async () => {
    await setI18nLanguage('lt');
    expect(ratingLine(t, 1, true)).toBe('1 žvaigždutė · pirkčiau dar kartą');
    expect(ratingLine(t, 4, null)).toBe('4 žvaigždutės');
    expect(ratingLine(t, null, false)).toBe('Nepirkčiau dar kartą');
    await setI18nLanguage('en');
  });
});

describe('noteSchema', () => {
  const schema = noteSchema(TODAY);

  it('needs text, at most 280 characters, and a date not after today', () => {
    const issues = (value: { day: string; text: string; tags: string[] }) =>
      schema.safeParse(value).error?.issues.map((i) => i.message) ?? [];
    expect(issues({ day: TODAY, text: '  ', tags: [] })).toEqual([
      'products.notes.errors.required',
    ]);
    expect(issues({ day: TODAY, text: 'x'.repeat(281), tags: [] })).toEqual([
      'products.notes.errors.long',
    ]);
    expect(issues({ day: '2026-10-08', text: 'Hi', tags: [] })).toEqual([
      'products.notes.errors.future',
    ]);
    expect(issues({ day: TODAY, text: 'Hi', tags: ['calm', 'nope'] })).toHaveLength(1);
    expect(schema.parse({ day: TODAY, text: ' Hi ', tags: ['glow'] })).toEqual({
      day: TODAY,
      text: 'Hi',
      tags: ['glow'],
    });
  });
});
