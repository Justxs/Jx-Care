import { z } from 'zod';

/** "12,99" or "12.99" → 12.99; empty → null. */
export function parseDecimal(text: string): number | null {
  const v = text.trim().replace(',', '.');
  if (v === '') return null;
  return /^\d*\.?\d+$|^\d+\.$/.test(v) ? Number(v) : Number.NaN;
}

/** The gallery's sample form: the patterns every real form follows. */
export const sampleSchema = z.object({
  name: z.string().trim().min(1, 'forms.errors.nameRequired'),
  price: z
    .string()
    .refine((v) => !v.trim().startsWith('-'), 'forms.errors.priceMin')
    .refine((v) => !Number.isNaN(parseDecimal(v)), 'forms.errors.priceNumber')
    .transform(parseDecimal),
  purchased: z.string().nullable(),
  category: z.string().optional(),
  tags: z.array(z.string()).min(1, 'forms.errors.pickOne'),
  answer: z.string(),
  notes: z.string(),
});

export const sampleDefaults: z.input<typeof sampleSchema> = {
  name: '',
  price: '',
  purchased: null,
  category: undefined,
  tags: [],
  answer: '',
  notes: '',
};
