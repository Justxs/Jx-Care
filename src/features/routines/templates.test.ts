import en from '@/i18n/en.json';

import { routineSchema } from './schema';
import {
  buildFromTemplate,
  draftFromTemplate,
  routineTemplates,
  type RoutineTemplate,
  type TemplateProduct,
} from './templates';

const template = (id: RoutineTemplate['id']) =>
  [...routineTemplates.morning, ...routineTemplates.evening].find((t) => t.id === id)!;

let nextId = 1;
const prod = (over: Partial<TemplateProduct>): TemplateProduct => ({
  id: nextId++,
  area: 'skin',
  category: 'other',
  archivedAt: null,
  createdAt: 1000,
  ...over,
});

/** Looks a dotted key up in en.json, so the test also proves every key exists. */
function translate(key: string): string {
  const value = key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
    return undefined;
  }, en);
  if (typeof value !== 'string') throw new Error(`Missing string ${key}`);
  return value;
}

describe('routineTemplates', () => {
  it('lists the starter templates per time of day (spec R2)', () => {
    expect(routineTemplates.morning.map((x) => [x.id, x.steps])).toEqual([
      ['morningBasics', ['cleanser', 'moisturiser', 'spf']],
      ['morningLight', ['rinse', 'moisturiser', 'spf']],
      ['morningEmpty', []],
    ]);
    expect(routineTemplates.evening.map((x) => [x.id, x.steps])).toEqual([
      ['eveningTreatment', ['cleanser', 'serum', 'moisturiser']],
      ['eveningBasics', ['cleanser', 'moisturiser']],
      ['eveningEmpty', []],
    ]);
  });

  it('has a string for every name and label', () => {
    for (const x of [...routineTemplates.morning, ...routineTemplates.evening]) {
      expect(translate(x.nameKey)).toBeTruthy();
      expect(translate(x.routineNameKey)).toBeTruthy();
      for (const s of buildFromTemplate(x, []).steps) {
        expect(translate(s.labelKey)).toBeTruthy();
      }
    }
  });
});

describe('buildFromTemplate', () => {
  it('picks the newest usable skin product per category and leaves gaps', () => {
    const oldCleanser = prod({ category: 'cleanser', createdAt: 1 });
    const newCleanser = prod({ category: 'cleanser', createdAt: 5 });
    const finishedCleanser = prod({ category: 'cleanser', createdAt: 9, archivedAt: '2026-10-01' });
    const hairSerum = prod({ category: 'serum', area: 'hair', createdAt: 9 });
    const expiredMoist = prod({ category: 'moisturiser', createdAt: 9, status: 'expired' });
    const bothMoist = prod({ category: 'moisturiser', area: 'both', createdAt: 2 });

    const built = buildFromTemplate(template('eveningTreatment'), [
      oldCleanser,
      newCleanser,
      finishedCleanser,
      hairSerum,
      expiredMoist,
      bothMoist,
    ]);
    expect(built.steps.map((s) => [s.kind, s.productId])).toEqual([
      ['cleanser', newCleanser.id],
      ['serum', null],
      ['moisturiser', bothMoist.id],
    ]);
  });

  it('gives the rinse step a note and no product', () => {
    expect(translate('routines.templates.rinseNote')).toBe('Rinse with water');
    const moist = prod({ category: 'moisturiser' });
    const built = buildFromTemplate(template('morningLight'), [moist]);
    expect(built.steps[0]).toEqual({
      kind: 'rinse',
      labelKey: 'routines.templates.steps.rinse',
      productId: null,
      noteKey: 'routines.templates.rinseNote',
    });
    expect(built.steps.map((s) => s.productId)).toEqual([null, moist.id, null]);
  });

  it('makes editor values that pass the routine schema', () => {
    const cleanser = prod({ category: 'cleanser' });
    const draft = draftFromTemplate(
      buildFromTemplate(template('morningLight'), [cleanser]),
      translate,
    );
    expect(draft).toMatchObject({
      name: 'Light morning',
      timeOfDay: 'morning',
      sortTime: '07:00',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    });
    expect(draft.steps[0]).toMatchObject({ note: 'Rinse with water', productId: null });
    expect(routineSchema.safeParse(draft).success).toBe(true);
    // Start empty has no steps, so it can't be saved until one is added.
    const empty = draftFromTemplate(buildFromTemplate(template('eveningEmpty'), []), translate);
    expect(empty.name).toBe('Evening');
    expect(routineSchema.safeParse(empty).success).toBe(false);
  });
});
