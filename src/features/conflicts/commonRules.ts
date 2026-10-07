/**
 * The default conflict rules (spec S3). They are added on first launch and once for existing
 * installs (`seedCommonRules`), and again by "Add common rules", which puts back any the person
 * deleted. Ingredient names are INCI names, the same in every language; group names and notes are
 * translated when they are created (see `commonRuleLabels`), after which they are the person's
 * own to edit or delete.
 *
 * Every rule is backed by a published source (`sources`): an FDA drug label, the FDA acne
 * monograph or a stability study. Popular pairings without such evidence (vitamin C with acids,
 * copper peptides with vitamin C, retinol with AHAs, niacinamide with vitamin C) are not defaults;
 * people can still add them as their own rules. Adapalene with benzoyl peroxide is not a conflict:
 * adapalene stays stable with it, and the two are sold together as an approved combination.
 */

export type CommonGroupKey = 'retinoids';
export type CommonNoteKey = 'labelIrritation' | 'bpTretinoin' | 'peroxideStain';

export type CommonSide = { group: CommonGroupKey } | { ingredient: string };

export type CommonRule = {
  left: CommonSide;
  right: CommonSide;
  note: CommonNoteKey;
  /** Where the rule comes from (URLs, see `sources`). */
  sources: readonly SourceKey[];
};

/**
 * Bump when rules are added to the pack, so existing installs get them on the next launch.
 * Seeding re-runs the whole (idempotent) pack, which also puts back deleted rules.
 */
export const COMMON_RULES_VERSION = 1;

type SourceKey = keyof typeof sources;

/** The evidence behind the defaults (checked 2026-10-07). */
export const sources = {
  /**
   * Tretinoin gel (microsphere) 0.1% / 0.04%, FDA label: "Particular caution should be exercised
   * with the concomitant use of topical over-the-counter acne preparations containing benzoyl
   * peroxide, sulfur, resorcinol, or salicylic acid with tretinoin gel."
   */
  tretinoinLabel:
    'https://www.accessdata.fda.gov/drugsatfda_docs/label/2013/202567Orig1s000lbl.pdf',
  /**
   * Differin (adapalene) gel 0.1%, FDA label: "Particular caution should be exercised in using
   * preparations containing sulfur, resorcinol, or salicylic acid in combination with DIFFERIN Gel."
   */
  adapaleneGelLabel: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2007/020380s004lbl.pdf',
  /** Differin (adapalene) lotion 0.1%, FDA label: the same caution. */
  adapaleneLotionLabel: 'https://www.accessdata.fda.gov/drugsatfda_docs/nda/2010/022502s000Lbl.pdf',
  /**
   * Nighland M et al. The effect of simulated solar UV irradiation on tretinoin in tretinoin gel
   * microsphere 0.1% and tretinoin gel 0.025%. Cutis. 2006: tretinoin gel 0.025% mixed with an
   * erythromycin–benzoyl peroxide gel kept 7% of its tretinoin after 2 hours and 0% after 6.
   */
  tretinoinBpStudy:
    'https://www.mdedge.com/dermatology/article/67367/acne/effect-simulated-solar-uv-irradiation-tretinoin-tretinoin-gel',
  /**
   * 21 CFR 333.350, labeling of OTC acne products (benzoyl peroxide, resorcinol, salicylic acid,
   * sulfur): "skin irritation and dryness is more likely to occur if you use another topical acne
   * medication at the same time."
   */
  acneMonograph: 'https://www.law.cornell.edu/cfr/text/21/333.350',
  /**
   * Hydroquinone topical, patient drug information: "Using hydroquinone topical together with
   * benzoyl peroxide, hydrogen peroxide, or other peroxide products may stain your skin."
   */
  hydroquinoneInfo: 'https://www.drugs.com/mtm/hydroquinone-topical.html',
} as const;

export const commonGroups: Record<CommonGroupKey, readonly string[]> = {
  /** Only the retinoids whose labels carry the caution above. */
  retinoids: ['Tretinoin', 'Adapalene'],
};

const BP = 'Benzoyl peroxide';
const retinoidLabels: readonly SourceKey[] = [
  'tretinoinLabel',
  'adapaleneGelLabel',
  'adapaleneLotionLabel',
];

export const commonRules: readonly CommonRule[] = [
  {
    left: { group: 'retinoids' },
    right: { ingredient: 'Salicylic acid' },
    note: 'labelIrritation',
    sources: retinoidLabels,
  },
  {
    left: { group: 'retinoids' },
    right: { ingredient: 'Sulfur' },
    note: 'labelIrritation',
    sources: retinoidLabels,
  },
  {
    left: { group: 'retinoids' },
    right: { ingredient: 'Resorcinol' },
    note: 'labelIrritation',
    sources: retinoidLabels,
  },
  {
    left: { ingredient: 'Tretinoin' },
    right: { ingredient: BP },
    note: 'bpTretinoin',
    sources: ['tretinoinLabel', 'tretinoinBpStudy'],
  },
  {
    left: { ingredient: BP },
    right: { ingredient: 'Salicylic acid' },
    note: 'labelIrritation',
    sources: ['acneMonograph'],
  },
  {
    left: { ingredient: BP },
    right: { ingredient: 'Sulfur' },
    note: 'labelIrritation',
    sources: ['acneMonograph'],
  },
  {
    left: { ingredient: BP },
    right: { ingredient: 'Resorcinol' },
    note: 'labelIrritation',
    sources: ['acneMonograph'],
  },
  {
    left: { ingredient: 'Hydroquinone' },
    right: { ingredient: BP },
    note: 'peroxideStain',
    sources: ['hydroquinoneInfo'],
  },
  {
    left: { ingredient: 'Hydroquinone' },
    right: { ingredient: 'Hydrogen peroxide' },
    note: 'peroxideStain',
    sources: ['hydroquinoneInfo'],
  },
];

export const commonNoteKeys: readonly CommonNoteKey[] = [
  'labelIrritation',
  'bpTretinoin',
  'peroxideStain',
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
  return { groups: { retinoids: names('retinoids') }, notes };
}
