/**
 * Story data, written only through the repo functions so it always matches the real rules.
 * Product names and notes are data, so they stay in English in both languages.
 *
 * Every seed runs on a fresh database, so the ids it creates are fixed: `demoIds` lists them and
 * `seedDemo` checks them, so a story can pass `params: { id: String(demoIds.products.retinol) }`.
 */
import type { Db } from '@/db';
import { routine } from '@/db/schema';
import { addAvoidIngredientByName } from '@/features/conflicts/avoidRepo';
import { commonRuleLabels } from '@/features/conflicts/commonRules';
import { addCommonRules, ensureIngredient, saveRule } from '@/features/conflicts/repo';
import { saveConditionDay } from '@/features/condition/repo';
import { markHairDone, saveHairTask } from '@/features/hair/repo';
import { addNote, setRating, setWouldRebuy } from '@/features/products/notesRepo';
import { createProduct, markFinished } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { getRoutine, saveRoutine, setChoice, tickSteps } from '@/features/routines/repo';
import type { StepInput } from '@/features/routines/schema';
import { saveSettings } from '@/features/settings/repo';
import { addBuyAgain, addItem, setBought } from '@/features/shopping/repo';
import { i18n, languages } from '@/i18n';
import { addDays, momentOf, weekdayOf } from '@/lib/appDay';

/** The app day every story runs on unless it says otherwise (a Wednesday). */
export const FIXTURE_TODAY = '2026-10-07';

/** The ids `seedDemo` creates, in creation order. */
export const demoIds = {
  products: {
    /** Opened, plenty of time left: OK. */
    cleanser: 1,
    /** Printed expiry in 12 days: Expiring. */
    vitaminC: 2,
    /** Opened a month ago, 6 months after opening: OK. Has notes, a rating and Would buy again. */
    retinol: 3,
    /** Not opened, expiry far off: Unopened. */
    glycolicToner: 4,
    /** Printed expiry 5 days ago: Expired. */
    sunscreen: 5,
    /** No dates at all: No date. */
    moisturiser: 6,
    /** Hair, opened, OK. */
    shampoo: 7,
    /** Hair, no dates, contains Parfum (on the avoid list). */
    conditioner: 8,
    /** Finished (archived) 10 days ago; on the shopping list through Buy again. */
    clayMask: 9,
  },
  routines: {
    /** Every day: cleanser, vitamin C (1 min wait), moisturiser, sunscreen. Two steps ticked today. */
    morning: 1,
    /** Evening A/B: cleanser, retinol, moisturiser. Picked for today. */
    eveningA: 2,
    /** Evening A/B: cleanser, glycolic toner, moisturiser. Glycolic + vitamin C is a conflict. */
    eveningB: 3,
  },
  hairTasks: {
    /** Wash every 3 days, with shampoo and conditioner; last washed 3 days ago, so due today. */
    wash: 1,
    /** Trim every 8 weeks, last done 50 days ago. */
    trim: 2,
  },
  shoppingItems: {
    /** Buy again: the finished clay mask. */
    clayMask: 1,
    /** To buy, free text. */
    hairOil: 2,
    /** Want to try, free text. */
    hydratingToner: 3,
    /** Bought today. */
    lipBalm: 4,
  },
} as const;

function expectId(what: string, actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`seedDemo: ${what} got id ${actual}, expected ${expected}; update demoIds`);
  }
}

const product = (over: Partial<ProductInput> & Pick<ProductInput, 'name'>): ProductInput => ({
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

const step = (productId: number, over: Partial<StepInput> = {}): StepInput => ({
  id: null,
  productId,
  note: null,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 0,
  ...over,
});

const everyDay = [1, 2, 3, 4, 5, 6, 7];

/** A fresh install after onboarding: the settings row and nothing else. */
export function seedEmpty(db: Db): void {
  saveSettings(db, { language: 'en', reminderAskDone: true });
}

/** A few weeks of realistic use. See `demoIds` for what each id is. */
export function seedDemo(db: Db, today: string = FIXTURE_TODAY): typeof demoIds {
  const day = (n: number) => addDays(today, n);
  const ids = demoIds;

  saveSettings(db, {
    language: 'en',
    currency: 'EUR',
    expiryRemindersOn: true,
    reminderAskDone: true,
    setupDoneAt: day(-30),
  });

  // ─── Products, one in every status ────────────────────────────────────────
  const p = ids.products;
  expectId(
    'cleanser',
    createProduct(
      db,
      product({
        name: 'Gentle Foaming Cleanser',
        brand: 'Lumi Lab',
        category: 'cleanser',
        size: 236,
        unit: 'ml',
        price: 1299,
        purchasedAt: day(-70),
        openedAt: day(-60),
        paoMonths: 12,
        ingredients: ['Aqua', 'Glycerin', 'Ceramide NP', 'Niacinamide'],
      }),
    ),
    p.cleanser,
  );
  expectId(
    'vitaminC',
    createProduct(
      db,
      product({
        name: 'Vitamin C 15% Serum',
        brand: 'Lumi Lab',
        category: 'serum',
        size: 30,
        unit: 'ml',
        price: 2450,
        openedAt: day(-40),
        expiresAt: day(12),
        ingredients: ['Aqua', 'Ascorbic acid', 'Ferulic acid', 'Tocopherol'],
      }),
    ),
    p.vitaminC,
  );
  expectId(
    'retinol',
    createProduct(
      db,
      product({
        name: 'Retinol 0.5% in Squalane',
        brand: 'Nordic Skin',
        category: 'serum',
        size: 30,
        unit: 'ml',
        price: 1890,
        purchasedAt: day(-35),
        openedAt: day(-30),
        paoMonths: 6,
        notes: 'Start twice a week, then build up.',
        ingredients: ['Squalane', 'Retinol', 'Tocopherol'],
      }),
    ),
    p.retinol,
  );
  expectId(
    'glycolicToner',
    createProduct(
      db,
      product({
        name: 'Glycolic Acid 7% Toner',
        brand: 'Nordic Skin',
        category: 'toner',
        size: 240,
        unit: 'ml',
        price: 1100,
        expiresAt: day(400),
        paoMonths: 12,
        ingredients: ['Aqua', 'Glycolic acid', 'Aloe barbadensis leaf juice'],
      }),
    ),
    p.glycolicToner,
  );
  expectId(
    'sunscreen',
    createProduct(
      db,
      product({
        name: 'Daily Fluid SPF 50',
        brand: 'Sol Care',
        category: 'spf',
        size: 50,
        unit: 'ml',
        price: 2200,
        openedAt: day(-150),
        expiresAt: day(-5),
        ingredients: ['Aqua', 'Homosalate', 'Octocrylene', 'Glycerin'],
      }),
    ),
    p.sunscreen,
  );
  expectId(
    'moisturiser',
    createProduct(
      db,
      product({
        name: 'Barrier Cream',
        brand: 'Lumi Lab',
        category: 'moisturiser',
        ingredients: ['Aqua', 'Ceramide NP', 'Butyrospermum parkii butter'],
      }),
    ),
    p.moisturiser,
  );
  expectId(
    'shampoo',
    createProduct(
      db,
      product({
        name: 'Repair Shampoo',
        brand: 'Hair Studio',
        area: 'hair',
        category: 'shampoo',
        size: 250,
        unit: 'ml',
        price: 1550,
        openedAt: day(-20),
        paoMonths: 12,
        ingredients: ['Aqua', 'Sodium laureth sulfate', 'Panthenol'],
      }),
    ),
    p.shampoo,
  );
  expectId(
    'conditioner',
    createProduct(
      db,
      product({
        name: 'Silk Conditioner',
        brand: 'Hair Studio',
        area: 'hair',
        category: 'conditioner',
        ingredients: ['Aqua', 'Cetearyl alcohol', 'Parfum'],
      }),
    ),
    p.conditioner,
  );
  expectId(
    'clayMask',
    createProduct(
      db,
      product({
        name: 'Green Clay Mask',
        brand: 'Sol Care',
        category: 'mask',
        size: 75,
        unit: 'ml',
        price: 1400,
        openedAt: day(-120),
        paoMonths: 6,
        ingredients: ['Kaolin', 'Bentonite', 'Parfum'],
      }),
    ),
    p.clayMask,
  );
  markFinished(db, p.clayMask, day(-10));

  // Notes, rating and Would buy again (P2, P8).
  addNote(db, {
    productId: p.retinol,
    day: day(-12),
    text: 'Skin feels smoother already.',
    tags: ['glow'],
  });
  addNote(db, {
    productId: p.retinol,
    day: day(-2),
    text: 'A little dry around the nose after two nights in a row.',
    tags: ['dry', 'redness'],
  });
  setRating(db, p.retinol, 4);
  setWouldRebuy(db, p.retinol, true);
  setRating(db, p.clayMask, 2);
  setWouldRebuy(db, p.clayMask, false);

  // ─── Conflict rules and the avoid list (S3, S4) ───────────────────────────
  addCommonRules(
    db,
    commonRuleLabels((key, options) => i18n.t(key, options), 'en', languages),
  );
  // The person's own rule on top of the defaults: vitamin C stings on glycolic acid days (the
  // morning then conflicts with the exfoliating night).
  saveRule(db, {
    leftKind: 'ingredient',
    leftId: ensureIngredient(db, 'Ascorbic acid').id,
    rightKind: 'ingredient',
    rightId: ensureIngredient(db, 'Glycolic acid').id,
    note: 'Stings on the same day',
  });
  addAvoidIngredientByName(db, 'Parfum', 'Makes my scalp itchy');

  // ─── Routines: morning, and an A/B evening (R1–R3) ────────────────────────
  const r = ids.routines;
  expectId(
    'morning',
    saveRoutine(db, {
      name: 'Morning',
      timeOfDay: 'morning',
      customName: null,
      sortTime: '07:00',
      daysOfWeek: everyDay,
      reminderTime: '07:30',
      steps: [
        step(p.cleanser),
        step(p.vitaminC, { waitSeconds: 60 }),
        step(p.moisturiser),
        step(p.sunscreen),
      ],
    }),
    r.morning,
  );
  expectId(
    'eveningA',
    saveRoutine(db, {
      name: 'Retinol night',
      timeOfDay: 'evening',
      customName: null,
      sortTime: '21:00',
      daysOfWeek: everyDay,
      reminderTime: '21:30',
      steps: [step(p.cleanser), step(p.retinol, { waitSeconds: 120 }), step(p.moisturiser)],
    }),
    r.eveningA,
  );
  expectId(
    'eveningB',
    saveRoutine(db, {
      name: 'Exfoliating night',
      timeOfDay: 'evening',
      customName: null,
      sortTime: '21:00',
      daysOfWeek: everyDay,
      reminderTime: null,
      steps: [step(p.cleanser), step(p.glycolicToner), step(p.moisturiser)],
    }),
    r.eveningB,
  );
  setChoice(db, 'evening', weekdayOf(today), r.eveningA);
  // A routine is due only from the day it was made; date them a month back, so the streak below
  // counts and a fixed FIXTURE_TODAY still works after the real date has moved past it.
  db.update(routine)
    .set({ createdAt: momentOf(day(-30), '08:00') })
    .run();

  const stepIds = (routineId: number) =>
    (getRoutine(db, routineId, today, 30)?.steps ?? []).map((st) => st.id);
  const morningSteps = stepIds(r.morning);
  const eveningASteps = stepIds(r.eveningA);
  const eveningBSteps = stepIds(r.eveningB);
  // A five-day streak before today, the evenings alternating, and today's morning half done.
  for (let n = 5; n >= 1; n--) {
    const d = day(-n);
    tickSteps(db, r.morning, morningSteps, d, true, morningSteps, momentOf(d, '07:20'));
    const evening = n % 2 === 0 ? r.eveningB : r.eveningA;
    const eveningSteps = n % 2 === 0 ? eveningBSteps : eveningASteps;
    tickSteps(db, evening, eveningSteps, d, true, eveningSteps, momentOf(d, '21:40'));
  }
  tickSteps(db, r.morning, morningSteps.slice(0, 2), today, true, morningSteps);

  // ─── Hair (R5, T3) ────────────────────────────────────────────────────────
  const h = ids.hairTasks;
  expectId(
    'wash',
    saveHairTask(db, {
      name: 'Wash',
      kind: 'wash',
      otherKind: null,
      productIds: [p.shampoo, p.conditioner],
      scheduleKind: 'interval',
      everyNDays: 3,
      intervalUnit: 'days',
      daysOfWeek: null,
      lastDoneAt: day(-9),
      reminderTime: '19:00',
    }),
    h.wash,
  );
  markHairDone(db, h.wash, { day: day(-6), productIds: [p.shampoo, p.conditioner], note: null });
  markHairDone(db, h.wash, {
    day: day(-3),
    productIds: [p.shampoo],
    note: 'Scalp a bit itchy',
  });
  expectId(
    'trim',
    saveHairTask(db, {
      name: 'Trim',
      kind: 'other',
      otherKind: 'trim',
      productIds: [],
      scheduleKind: 'interval',
      everyNDays: 56,
      intervalUnit: 'weeks',
      daysOfWeek: null,
      lastDoneAt: day(-50),
      reminderTime: null,
    }),
    h.trim,
  );

  // ─── Condition log (T4) ───────────────────────────────────────────────────
  saveConditionDay(db, day(-4), { skin: { states: ['dry'], note: null } });
  saveConditionDay(db, day(-2), {
    skin: { states: ['breakout', 'redness'], note: 'Two spots on the chin.' },
    hair: { states: ['oily_roots'], note: null },
  });
  saveConditionDay(db, day(-1), {
    skin: { states: ['calm', 'glow'], note: null },
    hair: { states: ['shiny'], note: null },
  });

  // ─── Shopping (P6, P7) ────────────────────────────────────────────────────
  const s = ids.shoppingItems;
  expectId('clayMask item', addBuyAgain(db, p.clayMask)?.id ?? -1, s.clayMask);
  expectId(
    'hairOil item',
    addItem(db, {
      name: 'Argan Hair Oil',
      brand: null,
      area: 'hair',
      list: 'to_buy',
      note: 'Small bottle to try first',
    }),
    s.hairOil,
  );
  expectId(
    'hydratingToner item',
    addItem(db, {
      name: 'Hydrating Toner',
      brand: 'Lumi Lab',
      area: 'skin',
      list: 'want_to_try',
      note: null,
    }),
    s.hydratingToner,
  );
  expectId(
    'lipBalm item',
    addItem(db, { name: 'Lip Balm', brand: null, area: 'skin', list: 'to_buy', note: null }),
    s.lipBalm,
  );
  setBought(db, s.lipBalm, momentOf(today, '12:00'));

  return ids;
}
