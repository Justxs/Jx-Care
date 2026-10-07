import type { Decorator, Meta, StoryObj } from '@storybook/react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useProducts } from '@/features/products/api';
import { defaultProductFilters } from '@/features/products/types';
import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo } from '@/storybook/fixtures';
import { routineSeedIds, seedPlayerProblems } from '@/storybook/seeds/routines';

import { NEW_ROUTINE_ID, setRoutineDraft } from '../draft';
import {
  buildFromTemplate,
  draftFromTemplate,
  routineTemplates,
  type TemplateProduct,
} from '../templates';
import { RoutineEditorScreen } from './RoutineEditorScreen';

const r = demoIds.routines;

/** Hands the editor the draft the starter sheet makes from the first evening template. */
function SetTemplateDraft({
  products,
  children,
}: {
  products: readonly TemplateProduct[];
  children: ReactNode;
}) {
  const { t } = useTranslation();
  // Before the editor mounts: it reads the draft once, when it opens.
  useState(() =>
    setRoutineDraft(
      draftFromTemplate(buildFromTemplate(routineTemplates.evening[0]!, products), t),
    ),
  );
  return children;
}

function WithTemplateDraft({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const products = useProducts(defaultProductFilters, i18n.language).data;
  if (!products) return null;
  return <SetTemplateDraft products={products}>{children}</SetTemplateDraft>;
}

const withTemplateDraft: Decorator = (Story) => (
  <WithTemplateDraft>
    <Story />
  </WithTemplateDraft>
);

const meta = {
  title: 'Screens/Routines/Routine editor',
  component: RoutineEditorScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RoutineEditorScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** R2 editing the morning routine: four steps, a wait, an expired SPF. */
export const EditMorning: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: String(r.morning) } })],
};

/** Editing the B evening: the conflict panel opens at the end of the form. */
export const WithConflicts: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: String(r.eveningB) } })],
};

/** A custom time of day with a finished product, a step without one and an expired product. */
export const ProblemSteps: Story = {
  decorators: [
    withAppData({ seed: seedPlayerProblems, params: { id: String(routineSeedIds.problems) } }),
  ],
};

/** New routine from the starter sheet's evening template, steps filled from the products. */
export const NewFromTemplate: Story = {
  decorators: [withTemplateDraft, withAppData({ seed: seedDemo, params: { id: NEW_ROUTINE_ID } })],
};

/** New routine with no draft: an empty form. */
export const NewEmpty: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: NEW_ROUTINE_ID } })],
};

/** A routine that no longer exists. */
export const NotFound: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: '999' } })],
};
