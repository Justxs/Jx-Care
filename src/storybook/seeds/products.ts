/**
 * Story data for Products and Shopping, beyond `seedDemo`: a product with a photo, long Lithuanian
 * names (the wrapping case), the shelf view, and plain list items for the row and tile stories.
 * Seeds go through the repo functions only; `seedDemo`'s ids stay as they are.
 */
import type { Db } from '@/db';
import { addNote } from '@/features/products/notesRepo';
import { createProduct, markFinished } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import type { ProductListItem } from '@/features/products/types';
import { saveSettings } from '@/features/settings/repo';
import { addItem } from '@/features/shopping/repo';
import type { ShoppingRowItem } from '@/features/shopping/types';
import { addDays, momentOf } from '@/lib/appDay';

import { demoIds, FIXTURE_TODAY, seedDemo } from '../fixtures';

/** A small product photo (a dropper bottle) inlined, since stories have no photo files. */
export const samplePhotoUri =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgBAMAAAB54XoeAAAAElBMVEX69Ozw4tbi0MLIqpa+eFo8NDDLfCfhAAABIklEQVR42u3a0Q2CMBCA4QO6gCs4QRMX4KFj88ACJE5gGMEBFH3iQSD2zmIK5OfF5oJfruXOh8PiJOtepQACAgIC/gV0yvuCPNo1Mwwirl4RDCJasTSci9vuU64nn6mgs5TEMTqlXljx4wAYudqF1cG3/JgtKBtAQMDsYBGbOVReZLzndRfpEsHKTyNd2pa9ImIBK1XIAHplTAtW6mCuOvSGKL0MCAgIuDMwOuiYjrxCYoazEVqztTNsFRHqEPDvrffZbPHZ8yG23FA2gBuow8u4eF43mmHHUwbMDdaKSN4MZy9EQ2rruUDZAM6q4of/fX0ds/JQdgf2hmieDAd1UJthb91xDBysCUbPsDcmGAWH6fdvsUY/0ymAgICAgICA2cA3E98nToqmhFAAAAAASUVORK5CYII=';

/** The ids `seedProductExtras` adds after `seedDemo`'s. */
export const productStoryIds = {
  products: {
    /** Rosehip oil with a photo, opened two weeks ago: OK. */
    rosehipOil: 10,
    /** Long Lithuanian name and brand, Expiring, contains Parfum (avoided), one long note. */
    longName: 11,
  },
  shoppingItems: {
    /** To buy, long Lithuanian name, brand and note. */
    longName: 5,
  },
} as const;

function expectId(what: string, actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`seedProductExtras: ${what} got id ${actual}, expected ${expected}`);
  }
}

const input = (over: Partial<ProductInput> & Pick<ProductInput, 'name'>): ProductInput => ({
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

/** `seedDemo`, plus a product with a photo and the long Lithuanian product and shopping item. */
export function seedProductExtras(db: Db, today: string = FIXTURE_TODAY): void {
  const day = (n: number) => addDays(today, n);
  seedDemo(db, today);

  const ids = productStoryIds;
  expectId(
    'rosehipOil',
    createProduct(
      db,
      input({
        name: 'Rosehip Face Oil',
        brand: 'Nordic Skin',
        category: 'serum',
        size: 30,
        unit: 'ml',
        price: 1650,
        purchasedAt: day(-20),
        openedAt: day(-14),
        paoMonths: 6,
        photoUri: samplePhotoUri,
        ingredients: ['Rosa canina fruit oil', 'Tocopherol'],
      }),
    ),
    ids.products.rosehipOil,
  );
  expectId(
    'longName',
    createProduct(
      db,
      input({
        name: 'Drėkinamasis veido kremas su hialurono rūgštimi ir ceramidais jautriai odai',
        brand: 'Baltijos natūralios kosmetikos laboratorija',
        category: 'moisturiser',
        size: 50,
        unit: 'ml',
        price: 2890,
        purchasedAt: day(-60),
        expiresAt: day(20),
        notes: 'Naudoti vakare po serumo, ant drėgnos odos, ypač žiemą, kai oda sausesnė.',
        ingredients: [
          'Aqua',
          'Natrio hialuronatas',
          'Butyrospermum parkii (taukmedžio) sviestas',
          'Ceramide NP',
          'Parfum',
        ],
      }),
    ),
    ids.products.longName,
  );
  addNote(db, {
    productId: ids.products.longName,
    day: day(-1),
    text: 'Po savaitės oda aplink nosį nebesilupa, bet kvapas per stiprus, todėl kitą kartą rinksiuosi bekvapį.',
    tags: ['calm', 'itchy'],
  });
  expectId(
    'longName item',
    addItem(db, {
      name: 'Švelnus micelinis vanduo jautriai ir sausai odai',
      brand: 'Baltijos natūralios kosmetikos laboratorija',
      area: 'skin',
      list: 'to_buy',
      note: 'Pirkti didesnę pakuotę, kai vaistinėje bus nuolaida',
    }),
    ids.shoppingItems.longName,
  );
}

/**
 * `seedProductExtras` with more finished products for the Archive: the sunscreen and the rosehip
 * oil (both with a cost per day) and the long-named cream (no opened date, so no cost per day).
 */
export function seedArchive(db: Db, today: string = FIXTURE_TODAY): void {
  seedProductExtras(db, today);
  const p = productStoryIds.products;
  markFinished(db, demoIds.products.sunscreen, addDays(today, -3));
  markFinished(db, p.rosehipOil, addDays(today, -1));
  markFinished(db, p.longName, addDays(today, -20));
}

/** `seedProductExtras` with the Products list set to the shelf view. */
export function seedShelf(db: Db, today: string = FIXTURE_TODAY): void {
  seedProductExtras(db, today);
  saveSettings(db, { productView: 'shelf' });
}

/**
 * One Products list item as the list query returns it, for the row and tile stories. Defaults to
 * the demo vitamin C serum: Expiring, 12 days before `FIXTURE_TODAY`'s expiry.
 */
export function sampleProduct(over: Partial<ProductListItem> = {}): ProductListItem {
  const created = momentOf(addDays(FIXTURE_TODAY, -40), '09:00');
  return {
    id: 2,
    name: 'Vitamin C 15% Serum',
    brand: 'Lumi Lab',
    area: 'skin',
    category: 'serum',
    photoUri: null,
    size: 30,
    unit: 'ml',
    priceCents: 2450,
    purchasedAt: null,
    expiresAt: addDays(FIXTURE_TODAY, 12),
    openedAt: addDays(FIXTURE_TODAY, -40),
    paoMonths: null,
    notes: null,
    rating: null,
    wouldRebuy: null,
    archivedAt: null,
    createdAt: created,
    updatedAt: created,
    status: 'expiring',
    daysLeft: 12,
    effectiveExpiry: addDays(FIXTURE_TODAY, 12),
    avoid: false,
    ...over,
  };
}

/** One shopping list row. Defaults to a free-text To buy item with a note. */
export function sampleShoppingItem(over: Partial<ShoppingRowItem> = {}): ShoppingRowItem {
  return {
    id: 2,
    productId: null,
    name: 'Argan Hair Oil',
    brand: null,
    area: 'hair',
    note: 'Small bottle to try first',
    list: 'to_buy',
    boughtAt: null,
    createdAt: momentOf(addDays(FIXTURE_TODAY, -3), '18:00'),
    category: null,
    priceCents: null,
    size: null,
    unit: null,
    rating: null,
    wouldRebuy: null,
    needsProduct: false,
    ...over,
  };
}
