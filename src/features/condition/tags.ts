import { hairTags, skinTags, type ConditionArea, type HairTag, type SkinTag } from '@/db/enums';

/** Condition tags: the standard order, the severity order and one day's entries (spec T4, C1). */

export type ConditionTag = SkinTag | HairTag;

/** One area's log for a day. */
export type ConditionEntry = { states: string[]; note: string | null };

/** A day's log: an area is missing when nothing was logged for it. */
export type ConditionDay = { skin?: ConditionEntry; hair?: ConditionEntry };

export const CONDITION_NOTE_MAX = 280;

/**
 * The order the calendar picks a day's main skin state in: the state that most needs
 * attention first (breakout, redness, itchy, oily, dry, calm, glow).
 */
export const skinSeverity: readonly SkinTag[] = [
  'breakout',
  'redness',
  'itchy',
  'oily',
  'dry',
  'calm',
  'glow',
];

/** An area's tags in the standard order. */
export function tagsFor(area: ConditionArea): readonly ConditionTag[] {
  return area === 'skin' ? skinTags : hairTags;
}

export function isTagOf(area: ConditionArea, tag: string): tag is ConditionTag {
  return (tagsFor(area) as readonly string[]).includes(tag);
}

/** Known tags of the area, each once, in the standard order (unknown ones are dropped). */
export function normaliseStates(area: ConditionArea, states: readonly string[]): ConditionTag[] {
  const picked = new Set(states);
  return tagsFor(area).filter((tag) => picked.has(tag));
}

/** The note trimmed and cut to 280 characters; empty becomes null. */
export function cleanNote(note: string | null | undefined): string | null {
  const text = (note ?? '').trim().slice(0, CONDITION_NOTE_MAX).trim();
  return text.length > 0 ? text : null;
}

/** A clean entry, or null when it holds nothing (no states and no note). */
export function cleanEntry(
  area: ConditionArea,
  entry: ConditionEntry | null | undefined,
): ConditionEntry | null {
  if (!entry) return null;
  const states = normaliseStates(area, entry.states);
  const note = cleanNote(entry.note);
  return states.length === 0 && note === null ? null : { states, note };
}

/** The day with `tag` switched on or off; an area that ends empty (no states, no note) goes. */
export function toggleInDay(
  day: ConditionDay,
  area: ConditionArea,
  tag: ConditionTag,
): ConditionDay {
  const current = day[area];
  const states = current?.states ?? [];
  const nextStates = states.includes(tag) ? states.filter((s) => s !== tag) : [...states, tag];
  const entry = cleanEntry(area, { states: nextStates, note: current?.note ?? null });
  const next: ConditionDay = { ...day };
  if (entry) next[area] = entry;
  else delete next[area];
  return next;
}

/** Skin states in severity order (known tags only). */
export function bySeverity(states: readonly string[]): SkinTag[] {
  const picked = new Set(states);
  return skinSeverity.filter((tag) => picked.has(tag));
}

/** The skin state the calendar shows for a day, or null when none is logged. */
export function mainSkinState(states: readonly string[]): SkinTag | null {
  return bySeverity(states)[0] ?? null;
}
