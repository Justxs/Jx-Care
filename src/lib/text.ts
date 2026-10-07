/** Text normalisation for matching names and recovery answers (the answer is hashed normalised). */

/** Trim, collapse inner whitespace, strip diacritics, lowercase. "  Ąžuolas " → "azuolas". */
export function normalizeName(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Collapse whitespace and trim, keeping case and accents (for display names). */
export function tidy(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
