import {
  createFormHook,
  createFormHookContexts,
  useStore,
  type AnyFieldApi,
  type AnyFormApi,
} from '@tanstack/react-form';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { ChipField, type ChipFieldProps } from './chip-field';
import { DateField, TimeField, type DateFieldProps, type TimeFieldProps } from './date-field';
import { Input, type InputProps } from './input';
import { SelectField, type SelectFieldProps } from './select-field';

const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

/**
 * The field's first error as text, shown once the field was left or the form was submitted.
 * Schema messages are i18n keys ("forms.errors.nameRequired"); anything else shows as is.
 */
export function useFieldError(field: AnyFieldApi): string | undefined {
  const { t } = useTranslation();
  const attempts = useStore(field.form.store, (s) => s.submissionAttempts);
  const { errors, isTouched } = field.state.meta;
  if (!isTouched && attempts === 0) return undefined;
  const first: unknown = errors[0];
  if (first === undefined || first === null) return undefined;
  const message =
    typeof first === 'string'
      ? first
      : typeof first === 'object' && 'message' in first && typeof first.message === 'string'
        ? first.message
        : undefined;
  return message ? t(message, { defaultValue: message }) : undefined;
}

/** `useFieldError` for fields drawn by hand inside `form.Field`: renders `children(error)`. */
export function WithFieldError({
  field,
  children,
}: {
  field: AnyFieldApi;
  children: (error: string | undefined) => ReactNode;
}) {
  return children(useFieldError(field));
}

function TextField(props: Omit<InputProps, 'value' | 'onChangeText' | 'error'>) {
  const field = useFieldContext<string>();
  const error = useFieldError(field);
  return (
    <Input
      {...props}
      value={field.state.value ?? ''}
      onChangeText={field.handleChange}
      onBlur={field.handleBlur}
      error={error}
    />
  );
}

function FormSelectField(props: Omit<SelectFieldProps, 'value' | 'onValueChange' | 'error'>) {
  const field = useFieldContext<string | undefined>();
  const error = useFieldError(field);
  return (
    <SelectField
      {...props}
      value={field.state.value}
      onValueChange={(v) => {
        field.handleChange(v);
        field.handleBlur();
      }}
      error={error}
    />
  );
}

function FormDateField(props: Omit<DateFieldProps, 'value' | 'onChange' | 'error'>) {
  const field = useFieldContext<string | null>();
  const error = useFieldError(field);
  return (
    <DateField
      {...props}
      value={field.state.value}
      onChange={(day) => {
        field.handleChange(day);
        field.handleBlur();
      }}
      error={error}
    />
  );
}

function FormTimeField(props: Omit<TimeFieldProps, 'value' | 'onChange' | 'error'>) {
  const field = useFieldContext<string | null>();
  const error = useFieldError(field);
  return (
    <TimeField
      {...props}
      value={field.state.value}
      onChange={(hhmm) => {
        field.handleChange(hhmm);
        field.handleBlur();
      }}
      error={error}
    />
  );
}

function FormChipField(props: Omit<ChipFieldProps, 'value' | 'onValueChange' | 'error'>) {
  const field = useFieldContext<string[]>();
  const error = useFieldError(field);
  return (
    <ChipField
      {...props}
      value={field.state.value ?? []}
      onValueChange={(v) => {
        field.handleChange(v);
        field.handleBlur();
      }}
      error={error}
    />
  );
}

const app = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    SelectField: FormSelectField,
    DateField: FormDateField,
    TimeField: FormTimeField,
    ChipField: FormChipField,
  },
  formComponents: {},
});

/** A form-level validator: zod issues become field errors keyed by path (i18n keys). */
function zodFormValidator(schema: z.ZodType) {
  return ({ value }: { value: unknown }) => {
    const result = schema.safeParse(value);
    if (result.success) return undefined;
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      fields[path] ??= issue.message;
    }
    return { fields };
  };
}

/**
 * A form validated by a zod schema on blur and on submit. Field values stay as typed (strings for
 * numbers); `onSubmit` gets the schema's parsed output. Errors are i18n keys.
 */
export function useAppForm<TSchema extends z.ZodType>(opts: {
  schema: TSchema;
  defaultValues: z.input<TSchema>;
  onSubmit: (value: z.output<TSchema>) => void | Promise<void>;
}) {
  const { schema, defaultValues, onSubmit } = opts;
  const validate = zodFormValidator(schema);
  return app.useAppForm({
    defaultValues,
    validators: { onBlur: validate, onSubmit: validate },
    listeners: {
      // Leaving one field checks the whole form, which can mark a field nobody has edited yet.
      // A field with an error re-checks as it is edited, so fixing it clears the error (and the
      // form can submit) without leaving the field first.
      onChange: ({ formApi, fieldApi }) => {
        if (fieldApi.state.meta.errors.length > 0) void formApi.validate('blur');
      },
    },
    onSubmit: async ({ value }) => {
      await onSubmit(schema.parse(value));
    },
  });
}

/** True once any field differs from its default: closing then asks "Discard changes?". */
export function useFormDirty(form: AnyFormApi): boolean {
  return useStore(form.store, (s) => s.isDirty);
}
