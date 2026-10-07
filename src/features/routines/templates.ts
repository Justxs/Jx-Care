import type { Area, ProductCategory } from '@/db/enums';
import type { ExpiryStatus } from '@/lib/expiry';

import { defaultSortTimes, everyDay, type RoutineFormValues, type StepFormValues } from './schema';

/** The routine starter (spec R2 "Starting a routine"). Names and labels are i18n keys. */

export type TemplateTimeOfDay = 'morning' | 'evening';
export type TemplateStepKind = 'cleanser' | 'serum' | 'moisturiser' | 'spf' | 'rinse';

export type RoutineTemplate = {
  id:
    | 'morningBasics'
    | 'morningLight'
    | 'morningEmpty'
    | 'eveningTreatment'
    | 'eveningBasics'
    | 'eveningEmpty';
  timeOfDay: TemplateTimeOfDay;
  /** Shown in the starter sheet: "Basics", "Light", "Start empty". */
  nameKey: string;
  /** The routine name the editor is pre-filled with: "Morning basics". */
  routineNameKey: string;
  /** Empty for "Start empty". */
  steps: TemplateStepKind[];
};

const k = (key: string) => `routines.templates.${key}`;

/** In the order the starter sheet lists them. */
export const routineTemplates: Record<TemplateTimeOfDay, RoutineTemplate[]> = {
  morning: [
    {
      id: 'morningBasics',
      timeOfDay: 'morning',
      nameKey: k('basics'),
      routineNameKey: k('routineName.morningBasics'),
      steps: ['cleanser', 'moisturiser', 'spf'],
    },
    {
      id: 'morningLight',
      timeOfDay: 'morning',
      nameKey: k('light'),
      routineNameKey: k('routineName.morningLight'),
      steps: ['rinse', 'moisturiser', 'spf'],
    },
    {
      id: 'morningEmpty',
      timeOfDay: 'morning',
      nameKey: k('empty'),
      routineNameKey: k('routineName.morning'),
      steps: [],
    },
  ],
  evening: [
    {
      id: 'eveningTreatment',
      timeOfDay: 'evening',
      nameKey: k('treatment'),
      routineNameKey: k('routineName.eveningTreatment'),
      steps: ['cleanser', 'serum', 'moisturiser'],
    },
    {
      id: 'eveningBasics',
      timeOfDay: 'evening',
      nameKey: k('basics'),
      routineNameKey: k('routineName.eveningBasics'),
      steps: ['cleanser', 'moisturiser'],
    },
    {
      id: 'eveningEmpty',
      timeOfDay: 'evening',
      nameKey: k('empty'),
      routineNameKey: k('routineName.evening'),
      steps: [],
    },
  ],
};

const categoryOf: Record<TemplateStepKind, ProductCategory | null> = {
  cleanser: 'cleanser',
  serum: 'serum',
  moisturiser: 'moisturiser',
  spf: 'spf',
  rinse: null,
};

/** What the builder needs to know about a product. `status` lets it skip expired ones. */
export type TemplateProduct = {
  id: number;
  area: Area;
  category: ProductCategory;
  archivedAt: string | null;
  createdAt: number;
  status?: ExpiryStatus;
};

export type BuiltStep = {
  kind: TemplateStepKind;
  /** "Cleanser", "Rinse". */
  labelKey: string;
  /** Null for a gap ("Pick a product later") and for the rinse step. */
  productId: number | null;
  /** The rinse step's note ("Rinse with water"), as an i18n key. */
  noteKey: string | null;
};

export type BuiltTemplate = {
  templateId: RoutineTemplate['id'];
  timeOfDay: TemplateTimeOfDay;
  routineNameKey: string;
  steps: BuiltStep[];
};

/**
 * Fills each template step with the newest active skin (or both) product of its category.
 * Finished and expired products never fill a step; gaps get `productId: null`.
 */
export function buildFromTemplate(
  template: RoutineTemplate,
  products: readonly TemplateProduct[],
): BuiltTemplate {
  const usable = products
    .filter((p) => p.archivedAt === null && p.area !== 'hair' && p.status !== 'expired')
    .toSorted((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  return {
    templateId: template.id,
    timeOfDay: template.timeOfDay,
    routineNameKey: template.routineNameKey,
    steps: template.steps.map((kind) => {
      const category = categoryOf[kind];
      return {
        kind,
        labelKey: k(`steps.${kind}`),
        productId: category ? (usable.find((p) => p.category === category)?.id ?? null) : null,
        noteKey: kind === 'rinse' ? k('rinseNote') : null,
      };
    }),
  };
}

/** The editor's starting values for a built template ("Create routine" in the starter sheet). */
export function draftFromTemplate(
  built: BuiltTemplate,
  t: (key: string) => string,
): RoutineFormValues {
  return {
    name: t(built.routineNameKey),
    timeOfDay: built.timeOfDay,
    customName: null,
    sortTime: defaultSortTimes[built.timeOfDay],
    daysOfWeek: everyDay,
    reminderTime: null,
    steps: built.steps.map((s): StepFormValues => ({
      id: null,
      productId: s.productId,
      note: s.noteKey ? t(s.noteKey) : null,
      scheduleKind: 'always',
      daysOfWeek: null,
      everyNDays: null,
      startDate: null,
      waitSeconds: 0,
    })),
  };
}
