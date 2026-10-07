import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Our type scale classes, so tailwind-merge doesn't mistake `text-body` for a colour. */
const typeScale = [
  'display',
  'title-l',
  'title-m',
  'title-s',
  'body-l',
  'body',
  'body-strong',
  'label',
  'caption',
  'overline',
  'tiny',
  'tiny-strong',
];

const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: typeScale }] } },
});

/** Joins class names; later classes win over earlier ones of the same kind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
