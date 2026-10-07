import { describe, expect, it } from 'vitest';

import en from './en.json';
import lt from './lt.json';

function leaves(value: unknown, path = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      for (const [leaf, text] of leaves(child, path ? `${path}.${key}` : key)) out.set(leaf, text);
    }
  } else {
    out.set(path, value);
  }
  return out;
}

describe('locales', () => {
  const english = leaves(en);
  const lithuanian = leaves(lt);

  it('has the same keys in Lithuanian and English', () => {
    expect([...lithuanian.keys()].toSorted()).toEqual([...english.keys()].toSorted());
  });

  it.each([
    ['en', english],
    ['lt', lithuanian],
  ])('%s has no empty strings, em-dashes, exclamation marks or emoji', (_name, texts) => {
    const broken = [...texts]
      .filter(
        ([, text]) =>
          typeof text !== 'string' ||
          text.trim() === '' ||
          /[—!]|\p{Extended_Pictographic}/u.test(text),
      )
      .map(([key]) => key);
    expect(broken).toEqual([]);
  });
});
