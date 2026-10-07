import { z } from 'zod';

import { areas, shoppingLists } from '@/db/enums';
import { nameSchema, optionalText } from '@/features/products/schema';

/** P7 New item: name required; brand, area and note optional. Messages are i18n keys. */
export const shoppingItemSchema = z.object({
  name: nameSchema,
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
