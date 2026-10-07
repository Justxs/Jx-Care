import { normalizeName } from './text';

/** The personal avoid list (spec S4): which avoid items a product hits. */

export type AvoidItemLite = { id: number; kind: 'ingredient' | 'group'; refId: number };

export function avoidMatches<A extends AvoidItemLite>(
  productIngredientIds: readonly number[],
  ingredientGroup: ReadonlyMap<number, number | null>,
  avoidItems: readonly A[],
): A[] {
  const ingredients = new Set(productIngredientIds);
  const groups = new Set<number>();
  for (const id of productIngredientIds) {
    const g = ingredientGroup.get(id);
    if (g != null) groups.add(g);
  }
  return avoidItems.filter((item) =>
    item.kind === 'ingredient' ? ingredients.has(item.refId) : groups.has(item.refId),
  );
}

export type KnownIngredientWithGroup = { id: number; name: string; normalizedName: string };

/**
 * The same for ingredient lines typed in the form before saving. Lines match known ingredients
 * by normalised name; new ingredients can't be on the list yet.
 */
export function parsedLinesAvoidMatches<A extends AvoidItemLite>(
  lines: readonly string[],
  known: readonly KnownIngredientWithGroup[],
  ingredientGroup: ReadonlyMap<number, number | null>,
  avoidItems: readonly A[],
): { line: string; item: A }[] {
  const byNorm = new Map(known.map((k) => [k.normalizedName, k]));
  const out: { line: string; item: A }[] = [];
  for (const line of lines) {
    const hit = byNorm.get(normalizeName(line));
    if (!hit) continue;
    for (const item of avoidMatches([hit.id], ingredientGroup, avoidItems))
      out.push({ line, item });
  }
  return out;
}
