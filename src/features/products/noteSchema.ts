import { z } from 'zod';

import { skinTags } from '@/db/enums';
import { isValidDay } from '@/lib/appDay';

import { NOTE_MAX, noteText } from './notesRepo';

/** P8 Product note: date (not after today), text (required, max 280) and quick tags. */
export function noteSchema(today: string) {
  return z.object({
    day: z
      .string()
      .refine(isValidDay, 'products.errors.date')
      .refine((v) => v <= today, 'products.notes.errors.future'),
    text: z
      .string()
      .transform(noteText)
      .refine((v) => v.length > 0, 'products.notes.errors.required')
      .refine((v) => v.length <= NOTE_MAX, 'products.notes.errors.long'),
    tags: z.array(z.enum(skinTags)),
  });
}

export type NoteFormValues = z.input<ReturnType<typeof noteSchema>>;
