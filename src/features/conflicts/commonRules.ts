/**
 * The starter pack behind "Add common rules" (spec S3 empty state). Ingredient names are INCI
 * names, the same in every language; group names and notes are translated when they are created
 * (see `commonRuleLabels` in api.ts), after which they are the person's own to edit.
 */

export type CommonGroupKey = 'retinoids' | 'ahaBha' | 'vitaminC';
export type CommonNoteKey = 'irritate' | 'bpRetinoids';

export type CommonSide = { group: CommonGroupKey } | { ingredient: string };

export type CommonRule = { left: CommonSide; right: CommonSide; note: CommonNoteKey };

export const commonGroups: Record<CommonGroupKey, readonly string[]> = {
  retinoids: [
    'Retinol',
    'Retinal',
    'Retinyl palmitate',
    'Hydroxypinacolone retinoate',
    'Adapalene',
    'Tretinoin',
  ],
  ahaBha: ['Glycolic acid', 'Lactic acid', 'Mandelic acid', 'Malic acid', 'Salicylic acid'],
  vitaminC: [
    'Ascorbic acid',
    'Sodium ascorbyl phosphate',
    'Magnesium ascorbyl phosphate',
    'Ascorbyl glucoside',
    'Ethyl ascorbic acid',
    '3-O-ethyl ascorbic acid',
  ],
};

export const commonRules: readonly CommonRule[] = [
  { left: { group: 'retinoids' }, right: { group: 'ahaBha' }, note: 'irritate' },
  { left: { group: 'retinoids' }, right: { ingredient: 'Benzoyl peroxide' }, note: 'bpRetinoids' },
  { left: { group: 'vitaminC' }, right: { group: 'ahaBha' }, note: 'irritate' },
];

/**
 * Translated words for the pack. Each group lists the names it may already exist under (every
 * app language), the first one being the name a new group gets.
 */
export type CommonRuleLabels = {
  groups: Record<CommonGroupKey, readonly [string, ...string[]]>;
  notes: Record<CommonNoteKey, string>;
};
