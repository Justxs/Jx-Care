import { useSelector } from '@tanstack/react-store';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { ToggleGroup } from '@/components/ui/toggle-group';
import type { ConditionArea } from '@/db/enums';
import { appStore } from '@/state/app';

import { conditionKeys, useConditionDay, useSaveConditionDay } from '../api';
import { CONDITION_NOTE_MAX, cleanEntry, type ConditionDay, type ConditionEntry } from '../tags';
import { ConditionChips } from './ConditionChips';

type Side = { states: string[]; note: string };
type Draft = Record<ConditionArea, Side>;

const areas = ['skin', 'hair'] as const;

const sideOf = (e: ConditionEntry | undefined): Side => ({
  states: e?.states ?? [],
  note: e?.note ?? '',
});

function draftOf(day: ConditionDay | undefined): Draft {
  return { skin: sideOf(day?.skin), hair: sideOf(day?.hair) };
}

/** True when saving the draft would change what is stored. */
function changed(draft: Draft, saved: ConditionDay | undefined): boolean {
  return areas.some((area) => {
    const a = cleanEntry(area, draft[area]);
    const b = cleanEntry(area, saved?.[area]);
    return JSON.stringify(a) !== JSON.stringify(b);
  });
}

export type ConditionLogSheetProps = {
  open: boolean;
  onClose: () => void;
  /** The day it opens on (today from Today, the shown day from C2). */
  day: string;
  /** The side it opens on: Hair from Today's "Hair and note", Skin otherwise. */
  area?: ConditionArea;
};

/**
 * T4 Condition log: date (not in the future), a Skin / Hair switch with the picked count on
 * each side over that side's tag chips, the side's note (up to 280 characters) and Save. The
 * fields hold the chosen day's log; picking another date loads that day's. Mount with a new
 * `key` each time it opens (`useConditionLogSheet` does).
 */
export function ConditionLogSheet({ open, onClose, day, area = 'skin' }: ConditionLogSheetProps) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const today = useSelector(appStore, (s) => s.activeDay);
  const save = useSaveConditionDay();
  const [date, setDate] = useState(day > today ? today : day);
  const [side, setSide] = useState<ConditionArea>(area);
  const [draft, setDraft] = useState<Draft>(() =>
    draftOf(client.getQueryData<ConditionDay>(conditionKeys.day(date))),
  );
  const [loadedFor, setLoadedFor] = useState<string | null>(() =>
    client.getQueryData(conditionKeys.day(date)) ? date : null,
  );
  const { data } = useConditionDay(date);

  // The fields follow the chosen day: load its log once it is read.
  if (data && loadedFor !== date) {
    setLoadedFor(date);
    setDraft(draftOf(data));
  }
  const ready = loadedFor === date;
  const dirty = ready && changed(draft, data);

  const current = draft[side];
  const setSideDraft = (next: Partial<Side>) =>
    setDraft((d) => ({ ...d, [side]: { ...d[side], ...next } }));

  const onSave = () => {
    // Saving cleans each side (standard tag order, trimmed note) and drops an empty one.
    if (ready) save.mutate({ day: date, ...draft }, { onSuccess: onClose });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dirty={dirty && !save.isSuccess}
      title={t('condition.sheet.title')}
      footer={
        <Button onPress={onSave} loading={save.isPending}>
          {t('common.save')}
        </Button>
      }
    >
      <DateField label={t('condition.sheet.date')} value={date} max={today} onChange={setDate} />
      <ToggleGroup
        value={side}
        onValueChange={(v) => setSide(v as ConditionArea)}
        accessibilityLabel={t('condition.sheet.switch')}
        items={areas.map((a) => ({
          value: a,
          label: t(`common.${a}`),
          count: draft[a].states.length,
        }))}
      />
      <ConditionChips
        // A new set for each side, so its chips never animate from the other side's.
        key={side}
        area={side}
        value={current.states}
        accessibilityLabel={t(`condition.sheet.tags.${side}`)}
        onToggle={(tag) =>
          setSideDraft({
            states: current.states.includes(tag)
              ? current.states.filter((s) => s !== tag)
              : [...current.states, tag],
          })
        }
      />
      <Input
        key={`note-${side}`}
        label={t(`condition.sheet.note.${side}`)}
        placeholder={t('condition.sheet.notePlaceholder')}
        hint={t('condition.sheet.noteCount', {
          used: current.note.length,
          max: CONDITION_NOTE_MAX,
        })}
        value={current.note}
        onChangeText={(note) => setSideDraft({ note })}
        maxLength={CONDITION_NOTE_MAX}
        multiline
      />
    </Sheet>
  );
}

/**
 * Opens T4 from anywhere: `open(day, area)` mounts a fresh sheet; render `element` once on the
 * screen. Used by Today's check-in and C2; the Routine done screen's "Add a note" can use it
 * with `area` 'skin'.
 */
export function useConditionLogSheet(): {
  open: (day: string, area?: ConditionArea) => void;
  element: ReactNode;
} {
  const [state, setState] = useState({
    key: 0,
    open: false,
    day: '',
    area: 'skin' as ConditionArea,
  });
  const open = useCallback(
    (day: string, area: ConditionArea = 'skin') =>
      setState((s) => ({ key: s.key + 1, open: true, day, area })),
    [],
  );
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const element =
    state.key > 0 ? (
      <ConditionLogSheet
        key={state.key}
        open={state.open}
        day={state.day}
        area={state.area}
        onClose={close}
      />
    ) : null;
  return { open, element };
}
