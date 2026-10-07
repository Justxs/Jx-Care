import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** The type scale from global.css, so tailwind-merge reads text-body as a size, not a colour. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'headline',
        'headline-sm',
        'display',
        'title-l',
        'title-m',
        'title-s',
        'body-l',
        'body',
        'label',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
