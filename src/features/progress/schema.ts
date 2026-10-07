import { z } from 'zod';

/** The review's note (C5), like every other note in the app. */
export const PROGRESS_NOTE_MAX = 280;

/** C5 review: rating 0 means not rated; messages are i18n keys. */
export const reviewSchema = z.object({
  rating: z.number().int().min(0).max(5),
  tags: z.array(z.string()),
  note: z.string().max(PROGRESS_NOTE_MAX, 'progress.review.noteTooLong'),
});

export type ReviewValues = z.input<typeof reviewSchema>;

export const emptyReview: ReviewValues = { rating: 0, tags: [], note: '' };
