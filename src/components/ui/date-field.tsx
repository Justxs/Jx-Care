import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useFormat } from '@/i18n/useFormat';
import { localDate } from '@/lib/appDay';
import { useThemeColors } from '@/theme/colors';

import { Button } from './button';
import { Field } from './field';
import { FieldButton } from './field-button';
import { Sheet } from './sheet';

/** 'YYYY-MM-DD' → local midnight. */
export function dayToDate(day: string): Date {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 'HH:MM' → today at that time (the picker only reads the time). */
export function timeToDate(hhmm: string): Date {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
}

export function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

type PickerFieldProps = {
  label: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  noHelper?: boolean;
  disabled?: boolean;
  className?: string;
};

type PickerProps = {
  mode: 'date' | 'time';
  shown: string | undefined;
  initial: Date;
  min?: Date;
  max?: Date;
  onPick: (date: Date) => void;
  field: PickerFieldProps;
};

/** Android opens the system dialog; iOS shows the inline picker in a sheet with Done. */
function PickerField({ mode, shown, initial, min, max, onPick, field }: PickerProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);

  const press = () => {
    if (Platform.OS === 'android') {
      // No is24Hour: the dialog follows the phone's 12/24-hour setting, like the times we show.
      DateTimePickerAndroid.open({
        value: initial,
        mode,
        minimumDate: min,
        maximumDate: max,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onPick(date);
        },
      });
      return;
    }
    setDraft(initial);
    setOpen(true);
  };

  return (
    <Field
      label={field.label}
      hint={field.hint}
      error={field.error}
      noHelper={field.noHelper}
      className={field.className}
    >
      <FieldButton
        label={field.label}
        value={shown}
        placeholder={field.placeholder}
        invalid={!!field.error}
        disabled={field.disabled}
        icon={mode === 'date' ? 'calendar' : 'clock'}
        onPress={press}
      />
      {Platform.OS === 'ios' ? (
        <Sheet
          title={field.label}
          open={open}
          onClose={() => setOpen(false)}
          footer={
            <Button
              onPress={() => {
                onPick(draft);
                setOpen(false);
              }}
            >
              {t('common.done')}
            </Button>
          }
        >
          <View className="items-center">
            <DateTimePicker
              value={draft}
              mode={mode}
              display={mode === 'date' ? 'inline' : 'spinner'}
              minimumDate={min}
              maximumDate={max}
              accentColor={colors.accent}
              themeVariant={colors.scheme}
              onChange={(_, date) => {
                if (date) setDraft(date);
              }}
            />
          </View>
        </Sheet>
      ) : null}
    </Field>
  );
}

export type DateFieldProps = PickerFieldProps & {
  /** App day 'YYYY-MM-DD', or empty. */
  value: string | null | undefined;
  onChange: (day: string) => void;
  min?: string;
  max?: string;
};

/** A date shown as "Today, 6 Oct"; opens the native picker. */
export function DateField({ value, onChange, min, max, ...field }: DateFieldProps) {
  const f = useFormat();
  return (
    <PickerField
      mode="date"
      shown={value ? f.dateField(value) : undefined}
      initial={dayToDate(value ?? f.today)}
      min={min ? dayToDate(min) : undefined}
      max={max ? dayToDate(max) : undefined}
      onPick={(date) => onChange(localDate(date))}
      field={field}
    />
  );
}

export type TimeFieldProps = PickerFieldProps & {
  /** 'HH:MM', or empty. */
  value: string | null | undefined;
  onChange: (hhmm: string) => void;
};

/** A time of day; opens the native picker. */
export function TimeField({ value, onChange, ...field }: TimeFieldProps) {
  const f = useFormat();
  return (
    <PickerField
      mode="time"
      shown={value ? f.time(value) : undefined}
      initial={timeToDate(value ?? '08:00')}
      onPick={(date) => onChange(dateToTime(date))}
      field={field}
    />
  );
}
