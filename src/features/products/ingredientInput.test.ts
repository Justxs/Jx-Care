import { parseIngredientLines } from '@/lib/ingredients';

import {
  applyIngredientChange,
  insertedText,
  isPaste,
  lineAt,
  replaceLine,
} from './ingredientInput';

describe('ingredient input', () => {
  it('finds what a change inserted', () => {
    expect(insertedText('Aqua\n', 'Aqua\nGlycerin')).toEqual({ start: 5, text: 'Glycerin' });
    expect(insertedText('ab', 'aXb')).toEqual({ start: 1, text: 'X' });
    expect(insertedText('abc', 'ac')).toEqual({ start: 1, text: '' });
  });

  it('treats typing as typing, commas included', () => {
    expect(isPaste('Aqua', 'Aqua,')).toBe(false);
    expect(isPaste('Aqua\n', 'Aqua\nG')).toBe(false);
    expect(isPaste('', 'Glycerin')).toBe(false);
    const typed = applyIngredientChange('Extract (leaf, root', 'Extract (leaf, root,');
    expect(typed).toEqual({ value: 'Extract (leaf, root,', splitLines: 0, undoValue: null });
  });

  it('splits a pasted list at commas into lines, with Undo text', () => {
    const pasted = 'Aqua, Glycerin, Niacinamide, Parfum';
    const change = applyIngredientChange('', pasted);
    expect(change.splitLines).toBe(4);
    expect(change.value).toBe('Aqua\nGlycerin\nNiacinamide\nParfum');
    expect(change.undoValue).toBe(pasted);
    expect(parseIngredientLines(change.value)).toHaveLength(4);
  });

  it('splits only the pasted part and keeps one-per-line pastes as they are', () => {
    const change = applyIngredientChange('Water\n', 'Water\nA, B, C\n');
    expect(change.value).toBe('Water\nA\nB\nC\n');
    const lines = applyIngredientChange('', 'Aqua\nGlycerin');
    expect(lines).toEqual({ value: 'Aqua\nGlycerin', splitLines: 0, undoValue: null });
  });

  it('finds and replaces the line under the cursor', () => {
    const text = 'Aqua\nGly\nParfum';
    expect(lineAt(text, 7)).toEqual({ start: 5, end: 8, line: 'Gly' });
    expect(lineAt(text, 0).line).toBe('Aqua');
    expect(lineAt(text, text.length).line).toBe('Parfum');
    expect(replaceLine(text, 7, 'Glycerin')).toEqual({
      value: 'Aqua\nGlycerin\nParfum',
      cursor: 13,
    });
  });
});
