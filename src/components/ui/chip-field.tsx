import { ChipGroup, type ChipGroupProps } from './chip';
import { Field } from './field';

export type ChipFieldProps = ChipGroupProps & {
  label: string;
  hint?: string;
  error?: string;
  noHelper?: boolean;
};

/** A labelled ChipGroup with the reserved helper line (PAO months, tags). */
export function ChipField({ label, hint, error, noHelper, className, ...group }: ChipFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} noHelper={noHelper} className={className}>
      <ChipGroup accessibilityLabel={label} {...group} />
    </Field>
  );
}
