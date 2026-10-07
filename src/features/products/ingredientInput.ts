import { splitPastedText } from '@/lib/ingredients';

/**
 * Typing vs pasting in the one-per-line ingredient field (spec P4). React Native has no paste
 * event for multi-line fields, so a change counts as a paste when it inserts more than one
 * character at once and the insert holds a line break or a comma.
 */
export function insertedText(prev: string, next: string): { start: number; text: string } {
  let start = 0;
  const max = Math.min(prev.length, next.length);
  while (start < max && prev[start] === next[start]) start++;
  let endPrev = prev.length;
  let endNext = next.length;
  while (endPrev > start && endNext > start && prev[endPrev - 1] === next[endNext - 1]) {
    endPrev--;
    endNext--;
  }
  return { start, text: next.slice(start, endNext) };
}

export function isPaste(prev: string, next: string): boolean {
  const { text } = insertedText(prev, next);
  return text.length > 1 && /[\n,]/.test(text);
}

export type IngredientChange = {
  value: string;
  /** Lines the paste was split into; 0 when nothing was split. */
  splitLines: number;
  /** The text as pasted, for Undo; null when nothing was split. */
  undoValue: string | null;
};

/** Applies a change to the field: pasted lists with commas split into lines, typing never. */
export function applyIngredientChange(prev: string, next: string): IngredientChange {
  if (!isPaste(prev, next)) return { value: next, splitLines: 0, undoValue: null };
  const { start, text } = insertedText(prev, next);
  const split = splitPastedText(text);
  if (split.splitLines === 0) return { value: next, splitLines: 0, undoValue: null };
  const value = next.slice(0, start) + split.text + next.slice(start + text.length);
  return { value, splitLines: split.splitLines, undoValue: next };
}

/** The line the cursor is on, with its bounds, for suggestions. */
export function lineAt(text: string, cursor: number): { start: number; end: number; line: string } {
  const at = Math.max(0, Math.min(cursor, text.length));
  const start = text.lastIndexOf('\n', at - 1) + 1;
  const nl = text.indexOf('\n', at);
  const end = nl === -1 ? text.length : nl;
  return { start, end, line: text.slice(start, end) };
}

/** Replaces the cursor's line with a suggestion; returns the new text and cursor. */
export function replaceLine(
  text: string,
  cursor: number,
  name: string,
): { value: string; cursor: number } {
  const { start, end } = lineAt(text, cursor);
  const value = text.slice(0, start) + name + text.slice(end);
  return { value, cursor: start + name.length };
}
