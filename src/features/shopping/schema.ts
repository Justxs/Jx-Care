import { z } from 'zod';

import { areas, shoppingLists } from '@/db/enums';
import { tidy } from '@/lib/text';

const optionalText = (max: number, key: string) =>
  z
    .string()
    .transform(tidy)
    .refine((v) => v.length <= max, key)
    .transform((v) => (v === '' ? null : v));

/** P7 New item: name required; brand, area and note optional. Messages are i18n keys. */
export const shoppingItemSchema = z.object({
  name: z
    .string()
    .transform(tidy)
    .refine((v) => v.length > 0, 'products.errors.nameRequired')
    .refine((v) => v.length <= 80, 'products.errors.nameLong'),
  brand: optionalText(80, 'products.errors.brandLong'),
  area: z.enum(areas).nullable(),
  list: z.enum(shoppingLists),
  note: optionalText(200, 'shopping.errors.noteLong'),
});

export type ShoppingItemFormValues = z.input<typeof shoppingItemSchema>;

export const emptyShoppingItem: ShoppingItemFormValues = {
  name: '',
  brand: '',
  area: null,
  list: 'to_buy',
  note: '',
};
