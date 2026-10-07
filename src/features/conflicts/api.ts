import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import { languages } from '@/i18n';

import type { CommonGroupKey, CommonRuleLabels } from './commonRules';
import {
  addCommonRules,
  conflictInput,
  deleteGroup,
  deleteIngredient,
  deleteRule,
  groupImpact,
  ingredientProducts,
  listGroups,
  listIngredients,
  listRulesWithCounts,
  mergeIngredients,
  renameIngredient,
  ruleRoutineCount,
  saveGroup,
  saveRule,
  setIngredientGroup,
  type RuleInput,
  type SaveGroupInput,
} from './repo';

// ─── Reads ──────────────────────────────────────────────────────────────────

/** S2 list; `qk.ingredients.list` is the products form's lighter list. */
export function useIngredients() {
  return useQuery({
    queryKey: [...qk.ingredients.all, 'manage'],
    queryFn: () => listIngredients(getDb()),
    placeholderData: keepPreviousData,
  });
}

export function useIngredientProducts(id: number | null) {
  return useQuery({
    queryKey: qk.ingredients.detail(id ?? 0),
    queryFn: () => ingredientProducts(getDb(), id ?? 0),
    enabled: id !== null,
  });
}

export function useGroups() {
  return useQuery({
    queryKey: qk.ingredients.groups,
    queryFn: () => listGroups(getDb()),
    placeholderData: keepPreviousData,
  });
}

export function useGroupImpact(id: number | null) {
  return useQuery({
    queryKey: [...qk.ingredients.groups, 'impact', id ?? 0],
    queryFn: () => groupImpact(getDb(), id ?? 0),
    enabled: id !== null,
  });
}

/**
 * S3 rules with "In N routines". Routine edits (task 022's hooks) don't invalidate conflict
 * keys yet, so the list re-reads whenever the screen mounts.
 */
export function useRules() {
  return useQuery({
    queryKey: qk.conflicts.rules,
    queryFn: () => listRulesWithCounts(getDb()),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

/** Everything `weeklyConflicts` and `dayConflicts` need (task 030's warnings). */
export function useConflictInput() {
  return useQuery({ queryKey: qk.conflicts.input, queryFn: () => conflictInput(getDb()) });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Ingredient, group and rule changes reach product chips and avoid badges, and every conflict
 * warning (routines, Today, the player).
 */
function invalidateCare(client: QueryClient): void {
  for (const queryKey of [
    qk.ingredients.all,
    qk.conflicts.all,
    qk.avoid.all,
    qk.products.all,
    qk.routines.all,
    ['today'],
  ]) {
    client.invalidateQueries({ queryKey });
  }
}

function useCareMutation<V, R>(fn: (vars: V) => R) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (vars: V) => fn(vars),
    onSuccess: () => invalidateCare(client),
  });
}

/** Returns the id the ingredient has afterwards (another one's when the rename merged them). */
export function useRenameIngredient() {
  return useCareMutation(({ id, name }: { id: number; name: string }) =>
    renameIngredient(getDb(), id, name),
  );
}

export function useSetIngredientGroup() {
  return useCareMutation(({ id, groupId }: { id: number; groupId: number | null }) =>
    setIngredientGroup(getDb(), id, groupId),
  );
}

export function useMergeIngredients() {
  return useCareMutation(({ keepId, mergeIds }: { keepId: number; mergeIds: number[] }) =>
    mergeIngredients(getDb(), keepId, mergeIds),
  );
}

export function useDeleteIngredient() {
  return useCareMutation((id: number) => deleteIngredient(getDb(), id));
}

export function useSaveGroup() {
  return useCareMutation((input: SaveGroupInput) => saveGroup(getDb(), input));
}

export function useDeleteGroup() {
  return useCareMutation((id: number) => deleteGroup(getDb(), id));
}

/** Saves a rule and re-checks every routine: `affected` is how many it fires in now. */
export function useSaveRule() {
  return useCareMutation((input: RuleInput) => {
    const db = getDb();
    const id = saveRule(db, input);
    return { id, affected: ruleRoutineCount(db, id) };
  });
}

export function useDeleteRule() {
  return useCareMutation((id: number) => deleteRule(getDb(), id));
}

const groupKeys: Record<CommonGroupKey, string> = {
  retinoids: 'conflicts.common.retinoids',
  ahaBha: 'conflicts.common.ahaBha',
  vitaminC: 'conflicts.common.vitaminC',
};

/** "Add common rules", named in the app language (and matched in every language). */
export function useAddCommonRules() {
  const { t, i18n } = useTranslation();
  return useCareMutation(() => {
    const current = i18n.language;
    const names = (key: string): [string, ...string[]] => [
      t(key),
      ...languages.filter((l) => l !== current).map((lng) => t(key, { lng })),
    ];
    const labels: CommonRuleLabels = {
      groups: {
        retinoids: names(groupKeys.retinoids),
        ahaBha: names(groupKeys.ahaBha),
        vitaminC: names(groupKeys.vitaminC),
      },
      notes: {
        irritate: t('conflicts.common.irritate'),
        bpRetinoids: t('conflicts.common.bpRetinoids'),
      },
    };
    return addCommonRules(getDb(), labels);
  });
}
