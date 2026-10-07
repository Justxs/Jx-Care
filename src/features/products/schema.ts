import { z } from 'zod';

import { areas, productCategories, units } from '@/db/enums';
import { isValidDay } from '@/lib/appDay';
import { parseIngredientLines } from '@/lib/ingredients';
import { tidy } from '@/lib/text';

/** "12,99" or "12.99" → 1299 cents; empty → null; anything else → NaN (caught by the schema). */
export function parsePriceCents(text: string): number | null {
  const v = text.trim().replace(',', '.');
  if (v === '') return null;
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(v)) return Number.NaN;
  return Math.round(Number(v) * 100);
}

/** "50" or "50,5" → 50.5; empty → null; anything else → NaN. */
export function parseDecimal(text: string): number | null {
  const v = text.trim().replace(',', '.');
  if (v === '') return null;
  return /^\d*\.?\d+$|^\d+\.$/.test(v) ? Number(v) : Number.NaN;
}

/** A stored decimal as the form shows it: 12.5 → "12,5". */
export function decimalText(n: number): string {
  return String(n).replace('.', ',');
}

const optionalText = (max: number, key: string) =>
  z
    .string()
    .transform(tidy)
    .refine((v) => v.length <= max, key)
    .transform((v) => (v === '' ? null : v));

const optionalDay = z
  .string()
  .nullable()
  .refine((v) => v === null || isValidDay(v), 'products.errors.date');

/**
 * The product form's values (strings as typed) and the rules from spec P3. Messages are i18n
 * keys. Parse with a `today` so "opened" can't be in the future.
 */
export function productSchema(today: string) {
  return z.object({
    name: z
      .string()
      .transform(tidy)
      .refine((v) => v.length > 0, 'products.errors.nameRequired')
      .refine((v) => v.length <= 80, 'products.errors.nameLong'),
    brand: optionalText(80, 'products.errors.brandLong'),
    area: z.enum(areas, { message: 'products.errors.areaRequired' }),
    category: z.enum(productCategories).default('other'),
    size: z
      .string()
      .refine((v) => !Number.isNaN(parseDecimal(v)), 'products.errors.sizeNumber')
      .transform(parseDecimal)
      .refine((v) => v === null || v > 0, 'products.errors.sizePositive'),
    unit: z.enum(units).nullable(),
    price: z
      .string()
      .refine((v) => !v.trim().startsWith('-'), {
        message: 'products.errors.priceNegative',
        abort: true,
      })
      .refine((v) => !Number.isNaN(parsePriceCents(v)), 'products.errors.priceNumber')
      .transform(parsePriceCents),
    purchasedAt: optionalDay,
    expiresAt: optionalDay,
    openedAt: optionalDay.refine((v) => v === null || v <= today, 'products.errors.openedFuture'),
    paoMonths: z
      .string()
      .refine((v) => v.trim() === '' || /^\d+$/.test(v.trim()), 'products.errors.monthsNumber')
      .transform((v) => (v.trim() === '' ? null : Number(v.trim())))
      .refine((v) => v === null || (v >= 1 && v <= 120), 'products.errors.monthsRange'),
    notes: optionalText(500, 'products.errors.notesLong'),
    photoUri: z.string().nullable(),
    /** The ingredient box: one ingredient per line (P4), parsed into clean names. */
    ingredients: z.string().transform(parseIngredientLines),
  });
}

export type ProductFormValues = z.input<ReturnType<typeof productSchema>>;
export type ProductInput = z.output<ReturnType<typeof productSchema>>;

export const emptyProductForm: ProductFormValues = {
  name: '',
  brand: '',
  area: undefined as unknown as ProductFormValues['area'],
  category: 'other',
  size: '',
  unit: null,
  price: '',
  purchasedAt: null,
  expiresAt: null,
  openedAt: null,
  paoMonths: '',
  notes: '',
  photoUri: null,
  ingredients: '',
};
