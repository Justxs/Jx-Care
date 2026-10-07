import { z } from 'zod';

import {
  presetQuestionIds,
  presetQuestionKey,
  validateAnswer,
  type PresetQuestionId,
  type RecoveryQuestion,
} from '@/features/security/pin';

/** The picker value for "Write my own". */
export const CUSTOM_QUESTION = 'custom';
export const CUSTOM_QUESTION_MAX = 120;

function isPreset(value: string): value is PresetQuestionId {
  return (presetQuestionIds as readonly string[]).includes(value);
}

/** O4 form. Messages are i18n keys. */
export const recoverySchema = z
  .object({
    questionId: z.string(),
    customText: z.string(),
    answer: z.string().refine((a) => validateAnswer(a) === null, 'security.errors.answerShort'),
  })
  .superRefine((v, ctx) => {
    if (v.questionId !== CUSTOM_QUESTION && !isPreset(v.questionId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['questionId'],
        message: 'onboarding.errors.questionRequired',
      });
    }
    if (v.questionId === CUSTOM_QUESTION && v.customText.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['customText'],
        message: 'onboarding.errors.customRequired',
      });
    }
  });

export type RecoveryFormValues = z.input<typeof recoverySchema>;

export const emptyRecoveryForm: RecoveryFormValues = { questionId: '', customText: '', answer: '' };

/** The question as the security service stores it. */
export function toRecoveryQuestion(v: RecoveryFormValues): RecoveryQuestion {
  if (isPreset(v.questionId)) return { kind: 'preset', id: v.questionId };
  return { kind: 'custom', text: v.customText.trim() };
}

/** Picker options: the five presets in the app's language, then "Write my own". */
export function questionOptions(t: (key: string) => string) {
  return [
    ...presetQuestionIds.map((id) => ({ value: id, label: t(presetQuestionKey(id)) })),
    { value: CUSTOM_QUESTION, label: t('onboarding.writeOwn') },
  ];
}
