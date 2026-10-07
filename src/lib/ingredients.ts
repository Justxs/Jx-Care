import { ingredientCatalog } from './ingredientCatalog';
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

/** A suggestion for the current line (P4): the person's own ingredient or one from the catalogue. */
export type IngredientSuggestion = {
  /** The normalised name, unique among suggestions. */
  key: string;
  /** What tapping it puts on the line. */
  name: string;
  /** The other name that matched when the name itself didn't ("Vitamin C" for Ascorbic acid). */
  alias: string | null;
};

/** A catalogue entry as suggestions need it (see `src/lib/ingredientCatalog.ts`). */
export type SuggestibleEntry = { name: string; aliases: readonly string[] };

type Candidate = { name: string; norm: string; aliases: { text: string; norm: string }[] };

const catalogCandidates = new WeakMap<readonly SuggestibleEntry[], Candidate[]>();

/** Normalised once per catalogue array. */
function candidatesOf(catalog: readonly SuggestibleEntry[]): Candidate[] {
  let list = catalogCandidates.get(catalog);
  if (!list) {
    list = catalog.map((c) => ({
      name: c.name,
      norm: normalizeName(c.name),
      aliases: c.aliases.map((a) => ({ text: a, norm: normalizeName(a) })),
    }));
    catalogCandidates.set(catalog, list);
  }
  return list;
}

/**
 * Suggestions for what is typed on a line, case- and accent-insensitive. Order: an alias typed in
 * full, then names starting with the text, aliases starting with it, names containing it and
 * aliases containing it; within each, the person's own ingredients come before the catalogue's.
 * A name the line already spells exactly is left out, and catalogue entries the person already
 * has are shown once, with their spelling (and still found by the catalogue's aliases).
 */
export function suggestIngredients(
  query: string,
  known: readonly KnownIngredient[],
  limit = 5,
  catalog: readonly SuggestibleEntry[] = ingredientCatalog,
): IngredientSuggestion[] {
  const q = normalizeName(query);
  if (!q) return [];
  const own = new Set(known.map((k) => k.normalizedName));
  const ranked: { s: IngredientSuggestion; rank: number; own: boolean }[] = [];
  const consider = (c: Candidate, isOwn: boolean) => {
    if (c.norm === q) return;
    let rank = -1;
    let alias: string | null = null;
    if (c.norm.startsWith(q)) rank = 1;
    else if (c.norm.includes(q)) rank = 3;
    for (const a of c.aliases) {
      const r = a.norm === q ? 0 : a.norm.startsWith(q) ? 2 : a.norm.includes(q) ? 4 : -1;
      if (r >= 0 && (rank < 0 || r < rank)) {
        rank = r;
        alias = a.text;
      }
    }
    if (rank < 0) return;
    ranked.push({ s: { key: c.norm, name: c.name, alias }, rank, own: isOwn });
  };
  const fromCatalog = candidatesOf(catalog);
  const catalogAliases = new Map(fromCatalog.map((c) => [c.norm, c.aliases]));
  for (const k of known) {
    const aliases = catalogAliases.get(k.normalizedName) ?? [];
    consider({ name: k.name, norm: k.normalizedName, aliases }, true);
  }
  for (const c of fromCatalog) if (!own.has(c.norm)) consider(c, false);
  ranked.sort(
    (a, b) => a.rank - b.rank || Number(b.own) - Number(a.own) || a.s.name.localeCompare(b.s.name),
  );
  return ranked.slice(0, limit).map((r) => r.s);
}
