/**
 * The default conflict rules (spec S3). They are added on first launch and once for existing
 * installs (`seedCommonRules`), and again by "Add common rules", which puts back any the person
 * deleted. Ingredient names are INCI names, the same in every language; group names and notes are
 * translated when they are created (see `commonRuleLabels`), after which they are the person's
 * own to edit or delete.
 *
 * Conflicts are checked across the whole day, so only pairs that shouldn't meet on the same day
 * are here. Pairs that are fine morning and evening (retinoids with vitamin C, niacinamide with
 * vitamin C) are left out on purpose.
 */

export type CommonGroupKey = 'retinoids' | 'ahaBha' | 'vitaminC';
export type CommonNoteKey =
  | 'irritate'
  | 'bpRetinoids'
  | 'dryIrritate'
  | 'bpVitaminC'
  | 'bpHydroquinone'
  | 'copperVitaminC'
  | 'copperAcids';

export type CommonSide = { group: CommonGroupKey } | { ingredient: string };

export type CommonRule = { left: CommonSide; right: CommonSide; note: CommonNoteKey };

/**
 * Bump when rules are added to the pack, so existing installs get them on the next launch.
 * Seeding re-runs the whole (idempotent) pack, which also puts back deleted rules.
 */
export const COMMON_RULES_VERSION = 1;

export const commonGroups: Record<CommonGroupKey, readonly string[]> = {
  retinoids: [
    'Retinol',
    'Retinal',
    'Retinyl palmitate',
    'Retinyl acetate',
    'Retinyl propionate',
    'Hydroxypinacolone retinoate',
    'Adapalene',
    'Tretinoin',
    'Tazarotene',
    'Trifarotene',
  ],
  ahaBha: [
    'Glycolic acid',
    'Lactic acid',
    'Mandelic acid',
    'Malic acid',
    'Salicylic acid',
    'Betaine salicylate',
    'Capryloyl salicylic acid',
  ],
  vitaminC: [
    'Ascorbic acid',
    'Sodium ascorbyl phosphate',
    'Magnesium ascorbyl phosphate',
    'Ascorbyl glucoside',
    'Ethyl ascorbic acid',
    '3-O-ethyl ascorbic acid',
    'Tetrahexyldecyl ascorbate',
  ],
};

const BP = 'Benzoyl peroxide';
const COPPER = 'Copper tripeptide-1';

export const commonRules: readonly CommonRule[] = [
  { left: { group: 'retinoids' }, right: { group: 'ahaBha' }, note: 'irritate' },
  { left: { group: 'retinoids' }, right: { ingredient: BP }, note: 'bpRetinoids' },
  { left: { group: 'vitaminC' }, right: { group: 'ahaBha' }, note: 'irritate' },
  { left: { group: 'ahaBha' }, right: { ingredient: BP }, note: 'dryIrritate' },
  { left: { group: 'vitaminC' }, right: { ingredient: BP }, note: 'bpVitaminC' },
  { left: { ingredient: 'Hydroquinone' }, right: { ingredient: BP }, note: 'bpHydroquinone' },
  { left: { ingredient: COPPER }, right: { group: 'vitaminC' }, note: 'copperVitaminC' },
  { left: { ingredient: COPPER }, right: { group: 'ahaBha' }, note: 'copperAcids' },
];

export const commonNoteKeys: readonly CommonNoteKey[] = [
  'irritate',
  'bpRetinoids',
  'dryIrritate',
  'bpVitaminC',
  'bpHydroquinone',
  'copperVitaminC',
  'copperAcids',
];

/**
 * Translated words for the pack. Each group lists the names it may already exist under (every
 * app language), the first one being the name a new group gets.
 */
export type CommonRuleLabels = {
  groups: Record<CommonGroupKey, readonly [string, ...string[]]>;
  notes: Record<CommonNoteKey, string>;
};

type Translate = (key: string, options?: { lng?: string }) => string;

/** The pack's words in `language`, with group names in every other language for matching. */
export function commonRuleLabels(
  t: Translate,
  language: string,
  allLanguages: readonly string[],
): CommonRuleLabels {
  const names = (key: CommonGroupKey): [string, ...string[]] => [
    t(`conflicts.common.${key}`, { lng: language }),
    ...allLanguages
      .filter((l) => l !== language)
      .map((lng) => t(`conflicts.common.${key}`, { lng })),
  ];
  const notes = Object.fromEntries(
    commonNoteKeys.map((k) => [k, t(`conflicts.common.${k}`, { lng: language })]),
  ) as Record<CommonNoteKey, string>;
  return {
    groups: { retinoids: names('retinoids'), ahaBha: names('ahaBha'), vitaminC: names('vitaminC') },
    notes,
  };
}
