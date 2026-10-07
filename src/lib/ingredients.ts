import { normalizeName, tidy } from './text';

/** Ingredient entry: one ingredient per line (spec P4). */

export type KnownIngredient = { id: number; name: string; normalizedName: string };

export type ClassifiedIngredient =
  | { name: string; normalizedName: string; status: 'existing'; id: number }
  | { name: string; normalizedName: string; status: 'new' };

/** Lines → ingredient names: trimmed, blanks dropped, duplicates merged (first spelling kept). */
export function parseIngredientLines(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const name = tidy(raw);
    if (!name) continue;
    const key = normalizeName(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Splits a line at commas that are not inside parentheses. */
function splitTopLevelCommas(line: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of line) {
    if (ch === '(' || ch === '[') depth++;
    if ((ch === ')' || ch === ']') && depth > 0) depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function topLevelCommaCount(line: string): number {
  return splitTopLevelCommas(line).length - 1;
}

/**
 * Pasted text only: every line with two or more commas (outside parentheses) is split at its
 * commas into separate lines. `splitLines` is how many lines the split produced, 0 if none.
 */
export function splitPastedText(pasted: string): { text: string; splitLines: number } {
  let splitLines = 0;
  const lines = pasted.split(/\r?\n/).flatMap((line) => {
    if (topLevelCommaCount(line) < 2) return [line];
    const parts = splitTopLevelCommas(line)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    splitLines += parts.length;
    return parts;
  });
  return { text: lines.join('\n'), splitLines };
}

export function classifyIngredients(
  parsed: readonly string[],
  known: readonly KnownIngredient[],
): ClassifiedIngredient[] {
  const byNorm = new Map(known.map((k) => [k.normalizedName, k]));
  return parsed.map((name) => {
    const normalizedName = normalizeName(name);
    const hit = byNorm.get(normalizedName);
    return hit
      ? { name, normalizedName, status: 'existing', id: hit.id }
      : { name, normalizedName, status: 'new' };
  });
}

/** Prefix matches first, then substring matches; case- and accent-insensitive. */
export function suggestIngredients(
  prefix: string,
  known: readonly KnownIngredient[],
  limit = 5,
): KnownIngredient[] {
  const q = normalizeName(prefix);
  if (!q) return [];
  const starts: KnownIngredient[] = [];
  const contains: KnownIngredient[] = [];
  for (const k of known) {
    if (k.normalizedName === q) continue;
    if (k.normalizedName.startsWith(q)) starts.push(k);
    else if (k.normalizedName.includes(q)) contains.push(k);
  }
  const byName = (a: KnownIngredient, b: KnownIngredient) => a.name.localeCompare(b.name);
  return [...starts.sort(byName), ...contains.sort(byName)].slice(0, limit);
}
