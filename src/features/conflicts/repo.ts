import { and, asc, count, eq, inArray, isNull, notInArray, or } from 'drizzle-orm';

import type { Db, DbOrTx } from '@/db';
import type { RefKind } from '@/db/enums';
import {
  avoidItem,
  conflict,
  ingredient,
  ingredientGroup,
  product,
  productIngredient,
  routine,
  routineChoice,
  routineStep,
  settings,
} from '@/db/schema';
import { appDay } from '@/lib/appDay';
import {
  routinesPerRule,
  weeklyConflicts,
  type ConflictHit,
  type ConflictInput,
  type RuleLite,
} from '@/lib/conflicts';
import type { RoutineChoiceLite, RoutineLite, StepLite } from '@/lib/schedule';
import { normalizeName, tidy } from '@/lib/text';

import {
  COMMON_RULES_VERSION,
  commonGroups,
  commonRules,
  type CommonRuleLabels,
  type CommonSide,
} from './commonRules';

// ─── Types ──────────────────────────────────────────────────────────────────

export type IngredientListItem = {
  id: number;
  name: string;
  normalizedName: string;
  groupId: number | null;
  groupName: string | null;
  /** Products (active or finished) that list it. */
  productCount: number;
  /** Conflict rules with it on either side. */
  ruleCount: number;
  /** Avoid list entries for it. */
  avoidCount: number;
};

export type IngredientProduct = {
  id: number;
  name: string;
  brand: string | null;
  archivedAt: string | null;
};

export type GroupMember = { id: number; name: string };

export type GroupListItem = {
  id: number;
  name: string;
  members: GroupMember[];
  memberCount: number;
};

/** What deleting a group takes with it, for the confirmation dialog. */
export type GroupImpact = { members: number; rules: number; avoid: number };

export type RuleSide = { kind: RefKind; id: number; name: string };

export type RuleItem = { id: number; left: RuleSide; right: RuleSide; note: string | null };

/** A rule with the number of routines it currently fires in (S3). */
export type RuleWithCount = RuleItem & { routineCount: number };

export type RuleInput = {
  id?: number | null;
  leftKind: RefKind;
  leftId: number;
  rightKind: RefKind;
  rightId: number;
  note: string | null;
};

export type SaveGroupInput = { id?: number | null; name: string; memberIds: readonly number[] };

export type CommonRulesResult = { groupsAdded: number; rulesAdded: number };

export const RULE_NOTE_MAX = 120;

export class EmptyNameError extends Error {
  constructor() {
    super('A name is required');
    this.name = 'EmptyNameError';
  }
}

export class IngredientInUseError extends Error {
  constructor() {
    super('The ingredient is still used in a product, rule or avoid item');
    this.name = 'IngredientInUseError';
  }
}

export class SameSidesError extends Error {
  constructor() {
    super("A rule's two sides must differ");
    this.name = 'SameSidesError';
  }
}

export class DuplicateRuleError extends Error {
  constructor() {
    super('A rule for these two sides already exists');
    this.name = 'DuplicateRuleError';
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const sideKey = (kind: RefKind, id: number) => `${kind}:${id}`;

/** The same key for a pair either way round, so A × B and B × A are one rule. */
const pairKey = (r: Pick<RuleInput, 'leftKind' | 'leftId' | 'rightKind' | 'rightId'>) =>
  [sideKey(r.leftKind, r.leftId), sideKey(r.rightKind, r.rightId)].sort().join('|');

function countBy<T>(rows: readonly T[], key: (row: T) => number | null): Map<number, number> {
  const out = new Map<number, number>();
  for (const row of rows) {
    const k = key(row);
    if (k != null) out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

function findIngredientByNormalized(db: DbOrTx, normalizedName: string) {
  return db
    .select({ id: ingredient.id, groupId: ingredient.groupId })
    .from(ingredient)
    .where(eq(ingredient.normalizedName, normalizedName))
    .get();
}

/** Drops rules whose two sides became one, and repeated pairs (the oldest stays). */
function dedupeRules(db: DbOrTx): void {
  const rows = db.select().from(conflict).orderBy(asc(conflict.id)).all();
  const seen = new Set<string>();
  const drop: number[] = [];
  for (const r of rows) {
    const key = pairKey(r);
    if (sideKey(r.leftKind, r.leftId) === sideKey(r.rightKind, r.rightId) || seen.has(key)) {
      drop.push(r.id);
    } else seen.add(key);
  }
  if (drop.length > 0) db.delete(conflict).where(inArray(conflict.id, drop)).run();
}

/** Drops repeated avoid items for the same ingredient or group (the oldest stays). */
function dedupeAvoid(db: DbOrTx): void {
  const rows = db.select().from(avoidItem).orderBy(asc(avoidItem.id)).all();
  const seen = new Set<string>();
  const drop: number[] = [];
  for (const a of rows) {
    const key = sideKey(a.kind, a.refId);
    if (seen.has(key)) drop.push(a.id);
    else seen.add(key);
  }
  if (drop.length > 0) db.delete(avoidItem).where(inArray(avoidItem.id, drop)).run();
}

// ─── Ingredients ────────────────────────────────────────────────────────────

/** Every ingredient with its group and how much uses it, by name (S2). */
export function listIngredients(db: DbOrTx): IngredientListItem[] {
  const rows = db
    .select({
      id: ingredient.id,
      name: ingredient.name,
      normalizedName: ingredient.normalizedName,
      groupId: ingredient.groupId,
      groupName: ingredientGroup.name,
    })
    .from(ingredient)
    .leftJoin(ingredientGroup, eq(ingredientGroup.id, ingredient.groupId))
    .orderBy(asc(ingredient.normalizedName))
    .all();
  const products = countBy(
    db.select({ id: productIngredient.ingredientId }).from(productIngredient).all(),
    (r) => r.id,
  );
  const rules = new Map<number, number>();
  for (const r of db.select().from(conflict).all()) {
    // A rule with the ingredient on both sides cannot exist; count each rule once.
    const ids = new Set<number>();
    if (r.leftKind === 'ingredient') ids.add(r.leftId);
    if (r.rightKind === 'ingredient') ids.add(r.rightId);
    for (const id of ids) rules.set(id, (rules.get(id) ?? 0) + 1);
  }
  const avoid = countBy(
    db.select().from(avoidItem).where(eq(avoidItem.kind, 'ingredient')).all(),
    (a) => a.refId,
  );
  return rows.map((r) => ({
    ...r,
    productCount: products.get(r.id) ?? 0,
    ruleCount: rules.get(r.id) ?? 0,
    avoidCount: avoid.get(r.id) ?? 0,
  }));
}

/** Products that list an ingredient, active ones first, then by name (S2 sheet). */
export function ingredientProducts(db: DbOrTx, id: number): IngredientProduct[] {
  const rows = db
    .select({
      id: product.id,
      name: product.name,
      brand: product.brand,
      archivedAt: product.archivedAt,
    })
    .from(productIngredient)
    .innerJoin(product, eq(product.id, productIngredient.productId))
    .where(eq(productIngredient.ingredientId, id))
    .all();
  return rows.toSorted(
    (a, b) =>
      Number(a.archivedAt !== null) - Number(b.archivedAt !== null) ||
      normalizeName(a.name).localeCompare(normalizeName(b.name)),
  );
}

/**
 * Moves every product link, conflict rule and avoid item of `mergeIds` to `keepId`, dropping the
 * duplicates that makes, then deletes the merged ingredients. `keepId` keeps its group, or takes
 * the first merged one's when it has none. One transaction.
 */
export function mergeIngredients(db: Db, keepId: number, mergeIds: readonly number[]): void {
  const others = [...new Set(mergeIds)].filter((id) => id !== keepId);
  if (others.length === 0) return;
  db.transaction((tx) => mergeInto(tx, keepId, others));
}

function mergeInto(tx: DbOrTx, keepId: number, others: number[]): void {
  const keep = tx.select().from(ingredient).where(eq(ingredient.id, keepId)).get();
  if (!keep) throw new Error(`Ingredient ${keepId} not found`);

  // Product links: a product that already lists the kept ingredient just loses the duplicate.
  const keptProducts = new Set(
    tx
      .select({ productId: productIngredient.productId })
      .from(productIngredient)
      .where(eq(productIngredient.ingredientId, keepId))
      .all()
      .map((l) => l.productId),
  );
  const links = tx
    .select()
    .from(productIngredient)
    .where(inArray(productIngredient.ingredientId, others))
    .orderBy(asc(productIngredient.position))
    .all();
  for (const link of links) {
    const where = and(
      eq(productIngredient.productId, link.productId),
      eq(productIngredient.ingredientId, link.ingredientId),
    );
    if (keptProducts.has(link.productId)) {
      tx.delete(productIngredient).where(where).run();
    } else {
      tx.update(productIngredient).set({ ingredientId: keepId }).where(where).run();
      keptProducts.add(link.productId);
    }
  }

  // Conflict rules and avoid items that name a merged ingredient now name the kept one.
  tx.update(conflict)
    .set({ leftId: keepId })
    .where(and(eq(conflict.leftKind, 'ingredient'), inArray(conflict.leftId, others)))
    .run();
  tx.update(conflict)
    .set({ rightId: keepId })
    .where(and(eq(conflict.rightKind, 'ingredient'), inArray(conflict.rightId, others)))
    .run();
  tx.update(avoidItem)
    .set({ refId: keepId })
    .where(and(eq(avoidItem.kind, 'ingredient'), inArray(avoidItem.refId, others)))
    .run();
  dedupeRules(tx);
  dedupeAvoid(tx);

  if (keep.groupId == null) {
    const merged = tx
      .select({ id: ingredient.id, groupId: ingredient.groupId })
      .from(ingredient)
      .where(inArray(ingredient.id, others))
      .all();
    const groupId = others
      .map((id) => merged.find((m) => m.id === id)?.groupId)
      .find((g) => g != null);
    if (groupId != null) {
      tx.update(ingredient).set({ groupId }).where(eq(ingredient.id, keepId)).run();
    }
  }
  tx.delete(ingredient).where(inArray(ingredient.id, others)).run();
}

/**
 * Renames an ingredient. When another ingredient already has the new name (ignoring case,
 * accents and spaces) the two are merged into that one, which takes the typed spelling.
 * Returns the id the ingredient now has.
 */
export function renameIngredient(db: Db, id: number, name: string): number {
  const display = tidy(name);
  const normalizedName = normalizeName(display);
  if (!normalizedName) throw new EmptyNameError();
  return db.transaction((tx) => {
    const existing = findIngredientByNormalized(tx, normalizedName);
    if (existing && existing.id !== id) {
      mergeInto(tx, existing.id, [id]);
      tx.update(ingredient).set({ name: display }).where(eq(ingredient.id, existing.id)).run();
      return existing.id;
    }
    tx.update(ingredient).set({ name: display, normalizedName }).where(eq(ingredient.id, id)).run();
    return id;
  });
}

export function setIngredientGroup(db: DbOrTx, id: number, groupId: number | null): void {
  db.update(ingredient).set({ groupId }).where(eq(ingredient.id, id)).run();
}

/** Deletes an ingredient nothing uses: no product, conflict rule or avoid item. */
export function deleteIngredient(db: Db, id: number): void {
  const item = listIngredients(db).find((i) => i.id === id);
  if (!item) return;
  if (item.productCount + item.ruleCount + item.avoidCount > 0) throw new IngredientInUseError();
  db.delete(ingredient).where(eq(ingredient.id, id)).run();
}

// ─── Groups ─────────────────────────────────────────────────────────────────

/** Every group with its members by name; groups by name (S2). */
export function listGroups(db: DbOrTx): GroupListItem[] {
  const groups = db.select().from(ingredientGroup).all();
  const members = db
    .select({ id: ingredient.id, name: ingredient.name, groupId: ingredient.groupId })
    .from(ingredient)
    .orderBy(asc(ingredient.normalizedName))
    .all();
  return groups
    .map((g) => {
      const list = members.filter((m) => m.groupId === g.id).map(({ id, name }) => ({ id, name }));
      return { id: g.id, name: g.name, members: list, memberCount: list.length };
    })
    .toSorted((a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name)) || a.id - b.id);
}

/**
 * Creates or updates a group and sets its members to exactly `memberIds` (an ingredient has one
 * group, so members are moved from any other group). Returns the group id.
 */
export function saveGroup(db: Db, input: SaveGroupInput): number {
  const name = tidy(input.name);
  if (!name) throw new EmptyNameError();
  return db.transaction((tx) => {
    let id = input.id ?? null;
    if (id !== null) {
      tx.update(ingredientGroup).set({ name }).where(eq(ingredientGroup.id, id)).run();
    } else {
      id = tx
        .insert(ingredientGroup)
        .values({ name })
        .returning({ id: ingredientGroup.id })
        .get().id;
    }
    const groupId = id;
    const memberIds = [...new Set(input.memberIds)];
    tx.update(ingredient)
      .set({ groupId: null })
      .where(
        memberIds.length > 0
          ? and(eq(ingredient.groupId, groupId), notInArray(ingredient.id, memberIds))
          : eq(ingredient.groupId, groupId),
      )
      .run();
    if (memberIds.length > 0) {
      tx.update(ingredient).set({ groupId }).where(inArray(ingredient.id, memberIds)).run();
    }
    return groupId;
  });
}

export function groupImpact(db: DbOrTx, id: number): GroupImpact {
  const [members] = db
    .select({ n: count() })
    .from(ingredient)
    .where(eq(ingredient.groupId, id))
    .all();
  const [rules] = db
    .select({ n: count() })
    .from(conflict)
    .where(
      or(
        and(eq(conflict.leftKind, 'group'), eq(conflict.leftId, id)),
        and(eq(conflict.rightKind, 'group'), eq(conflict.rightId, id)),
      ),
    )
    .all();
  const [avoid] = db
    .select({ n: count() })
    .from(avoidItem)
    .where(and(eq(avoidItem.kind, 'group'), eq(avoidItem.refId, id)))
    .all();
  return { members: members?.n ?? 0, rules: rules?.n ?? 0, avoid: avoid?.n ?? 0 };
}

/**
 * Deletes a group: its members stay without a group, and the conflict rules and avoid items that
 * point at the group are deleted with it (the UI warns first). One transaction.
 */
export function deleteGroup(db: Db, id: number): void {
  db.transaction((tx) => {
    tx.update(ingredient).set({ groupId: null }).where(eq(ingredient.groupId, id)).run();
    tx.delete(conflict)
      .where(
        or(
          and(eq(conflict.leftKind, 'group'), eq(conflict.leftId, id)),
          and(eq(conflict.rightKind, 'group'), eq(conflict.rightId, id)),
        ),
      )
      .run();
    tx.delete(avoidItem)
      .where(and(eq(avoidItem.kind, 'group'), eq(avoidItem.refId, id)))
      .run();
    tx.delete(ingredientGroup).where(eq(ingredientGroup.id, id)).run();
  });
}

// ─── Rules ──────────────────────────────────────────────────────────────────

function sideNames(db: DbOrTx) {
  const ingredients = new Map(
    db
      .select({ id: ingredient.id, name: ingredient.name })
      .from(ingredient)
      .all()
      .map((i) => [i.id, i.name]),
  );
  const groups = new Map(
    db
      .select({ id: ingredientGroup.id, name: ingredientGroup.name })
      .from(ingredientGroup)
      .all()
      .map((g) => [g.id, g.name]),
  );
  return (kind: RefKind, id: number): RuleSide | null => {
    const name = (kind === 'ingredient' ? ingredients : groups).get(id);
    return name === undefined ? null : { kind, id, name };
  };
}

/** Every rule with both sides resolved to names and kinds, oldest first. */
export function listRules(db: DbOrTx): RuleItem[] {
  const resolve = sideNames(db);
  return db
    .select()
    .from(conflict)
    .orderBy(asc(conflict.id))
    .all()
    .flatMap((r) => {
      const left = resolve(r.leftKind, r.leftId);
      const right = resolve(r.rightKind, r.rightId);
      // A side whose ingredient or group is gone can never match; leave it out.
      return left && right ? [{ id: r.id, left, right, note: r.note }] : [];
    });
}

/** The rules with how many routines each currently fires in, from `weeklyConflicts` (S3). */
export function listRulesWithCounts(db: Db): RuleWithCount[] {
  const perRule = routinesPerRule(weeklyConflicts(conflictInput(db)));
  return listRules(db).map((r) => ({ ...r, routineCount: perRule.get(r.id)?.size ?? 0 }));
}

/** The number of routines a rule fires in now (the editor's "Affects 2 routines"). */
export function ruleRoutineCount(db: Db, ruleId: number): number {
  const input = conflictInput(db);
  const only = { ...input, rules: input.rules.filter((r) => r.id === ruleId) };
  return routinesPerRule(weeklyConflicts(only)).get(ruleId)?.size ?? 0;
}

/**
 * Inserts or updates a rule. The two sides must differ, and no other rule may have the same pair
 * (either way round). Returns the rule id.
 */
export function saveRule(db: Db, input: RuleInput): number {
  if (sideKey(input.leftKind, input.leftId) === sideKey(input.rightKind, input.rightId)) {
    throw new SameSidesError();
  }
  const note = tidy(input.note ?? '').slice(0, RULE_NOTE_MAX) || null;
  const id = input.id ?? null;
  const key = pairKey(input);
  const clash = db
    .select()
    .from(conflict)
    .all()
    .some((r) => r.id !== id && pairKey(r) === key);
  if (clash) throw new DuplicateRuleError();
  const values = {
    leftKind: input.leftKind,
    leftId: input.leftId,
    rightKind: input.rightKind,
    rightId: input.rightId,
    note,
  };
  if (id !== null) {
    db.update(conflict).set(values).where(eq(conflict.id, id)).run();
    return id;
  }
  return db.insert(conflict).values(values).returning({ id: conflict.id }).get().id;
}

export function deleteRule(db: DbOrTx, id: number): void {
  db.delete(conflict).where(eq(conflict.id, id)).run();
}

// ─── Common rules ───────────────────────────────────────────────────────────

/** Finds an ingredient by normalised name or creates it; returns its id and group. */
export function ensureIngredient(tx: DbOrTx, name: string): { id: number; groupId: number | null } {
  const normalizedName = normalizeName(name);
  return (
    findIngredientByNormalized(tx, normalizedName) ??
    tx
      .insert(ingredient)
      .values({ name, normalizedName })
      .returning({ id: ingredient.id, groupId: ingredient.groupId })
      .get()
  );
}

/**
 * "Add common rules": creates the starter groups and rules as ordinary, editable rows. Existing
 * ingredients are matched by normalised name and missing ones created; a group is reused when one
 * already has one of its names (in any app language). Members already in another group stay
 * there. Rules whose pair already exists are skipped, so running it twice adds nothing.
 */
export function addCommonRules(db: Db, labels: CommonRuleLabels): CommonRulesResult {
  return db.transaction((tx) => {
    let groupsAdded = 0;
    let rulesAdded = 0;
    const groups = tx.select().from(ingredientGroup).orderBy(asc(ingredientGroup.id)).all();
    const groupIds = new Map<string, number>();

    for (const [key, members] of Object.entries(commonGroups) as [
      keyof typeof commonGroups,
      readonly string[],
    ][]) {
      const names = new Set(labels.groups[key].map(normalizeName));
      let groupId = groups.find((g) => names.has(normalizeName(g.name)))?.id;
      if (groupId === undefined) {
        groupId = tx
          .insert(ingredientGroup)
          .values({ name: labels.groups[key][0] })
          .returning({ id: ingredientGroup.id })
          .get().id;
        groupsAdded++;
      }
      groupIds.set(key, groupId);
      for (const name of members) {
        const ing = ensureIngredient(tx, name);
        if (ing.groupId == null) setIngredientGroup(tx, ing.id, groupId);
      }
    }

    const resolve = (side: CommonSide): { kind: RefKind; id: number } =>
      'group' in side
        ? { kind: 'group', id: groupIds.get(side.group)! }
        : { kind: 'ingredient', id: ensureIngredient(tx, side.ingredient).id };

    const existing = new Set(tx.select().from(conflict).all().map(pairKey));
    for (const rule of commonRules) {
      const left = resolve(rule.left);
      const right = resolve(rule.right);
      const values = {
        leftKind: left.kind,
        leftId: left.id,
        rightKind: right.kind,
        rightId: right.id,
        note: labels.notes[rule.note],
      };
      const key = pairKey(values);
      if (existing.has(key)) continue;
      tx.insert(conflict).values(values).run();
      existing.add(key);
      rulesAdded++;
    }
    return { groupsAdded, rulesAdded };
  });
}

/**
 * The default rules, added once: on first launch (after onboarding creates the settings row) and,
 * for installs from before they existed, on the next launch. Does nothing without a settings row
 * or when this version of the pack was already added; returns what it added, or null.
 */
export function seedCommonRules(db: Db, labels: CommonRuleLabels): CommonRulesResult | null {
  const row = db.select({ version: settings.commonRulesVersion }).from(settings).get();
  if (!row || row.version >= COMMON_RULES_VERSION) return null;
  const result = addCommonRules(db, labels);
  db.update(settings).set({ commonRulesVersion: COMMON_RULES_VERSION }).run();
  return result;
}

// ─── Conflict input ─────────────────────────────────────────────────────────

/**
 * Everything `weeklyConflicts` and `dayConflicts` (src/lib/conflicts.ts) need: routines, their
 * steps, product → ingredient ids, ingredient → group, and the rules.
 */
export function conflictInput(db: DbOrTx): ConflictInput {
  const routines: RoutineLite[] = db
    .select()
    .from(routine)
    .where(isNull(routine.deletedAt))
    .all()
    .map((r) => ({
      id: r.id,
      name: r.name,
      timeOfDay: r.timeOfDay,
      customName: r.customName,
      sortTime: r.sortTime,
      daysOfWeek: r.daysOfWeek,
      active: r.active,
      createdDay: appDay(r.createdAt),
    }));
  const steps: StepLite[] = db
    .select({
      id: routineStep.id,
      routineId: routineStep.routineId,
      productId: routineStep.productId,
      position: routineStep.position,
      scheduleKind: routineStep.scheduleKind,
      daysOfWeek: routineStep.daysOfWeek,
      everyNDays: routineStep.everyNDays,
      startDate: routineStep.startDate,
    })
    .from(routineStep)
    .where(isNull(routineStep.deletedAt))
    .all();
  const productIngredients = new Map<number, number[]>();
  for (const l of db
    .select({
      productId: productIngredient.productId,
      ingredientId: productIngredient.ingredientId,
    })
    .from(productIngredient)
    .orderBy(asc(productIngredient.position))
    .all()) {
    const list = productIngredients.get(l.productId) ?? [];
    list.push(l.ingredientId);
    productIngredients.set(l.productId, list);
  }
  const ingredientGroupMap = new Map<number, number | null>(
    db
      .select({ id: ingredient.id, groupId: ingredient.groupId })
      .from(ingredient)
      .all()
      .map((i) => [i.id, i.groupId]),
  );
  const rules: RuleLite[] = db
    .select({
      id: conflict.id,
      leftKind: conflict.leftKind,
      leftId: conflict.leftId,
      rightKind: conflict.rightKind,
      rightId: conflict.rightId,
    })
    .from(conflict)
    .all();
  return { routines, steps, productIngredients, ingredientGroup: ingredientGroupMap, rules };
}

// ─── Warnings (task 030) ────────────────────────────────────────────────────

/** Names the warnings show: products, ingredients and groups by id, and each rule's note. */
export type ConflictNames = {
  products: Map<number, string>;
  ingredients: Map<number, string>;
  groups: Map<number, string>;
  notes: Map<number, string | null>;
};

/**
 * Everything the conflict warnings need, with this week's hits worked out once. `choices` are the
 * remembered A/B picks per weekday, which decide the option a day's checks compare.
 */
export type ConflictData = {
  input: ConflictInput;
  names: ConflictNames;
  weekly: ConflictHit[];
  choices: RoutineChoiceLite[];
};

const byId = (rows: { id: number; name: string }[]) => new Map(rows.map((r) => [r.id, r.name]));

export function conflictNames(db: DbOrTx): ConflictNames {
  return {
    products: byId(db.select({ id: product.id, name: product.name }).from(product).all()),
    ingredients: byId(
      db.select({ id: ingredient.id, name: ingredient.name }).from(ingredient).all(),
    ),
    groups: byId(
      db.select({ id: ingredientGroup.id, name: ingredientGroup.name }).from(ingredientGroup).all(),
    ),
    notes: new Map(
      db
        .select({ id: conflict.id, note: conflict.note })
        .from(conflict)
        .all()
        .map((r) => [r.id, r.note]),
    ),
  };
}

export function conflictData(db: DbOrTx): ConflictData {
  const input = conflictInput(db);
  return {
    input,
    names: conflictNames(db),
    weekly: weeklyConflicts(input),
    choices: db.select().from(routineChoice).all(),
  };
}
