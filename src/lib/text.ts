/** Text normalisation for matching names and recovery answers. */

/** Trim, collapse inner whitespace, strip diacritics, lowercase. "  Ąžuolas " → "azuolas". */
export function normalizeName(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Compares an answer ignoring case, accents and extra spaces (spec L2). */
export function matchesAnswer(input: string, storedNormalized: string): boolean {
  return normalizeName(input) === storedNormalized;
}

/** Collapse whitespace and trim, keeping case and accents (for display names). */
export function tidy(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
