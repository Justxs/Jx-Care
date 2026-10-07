import en from './en.json';
import lt from './lt.json';

const pluralSuffix = /_(zero|one|two|few|many|other)$/;

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

function values(obj: unknown): unknown[] {
  return typeof obj === 'object' && obj !== null ? Object.values(obj).flatMap(values) : [obj];
}

function normalised(obj: unknown): string[] {
  return [...new Set(keys(obj).map((k) => k.replace(pluralSuffix, '')))].sort();
}

describe('translation files', () => {
  it('have the same keys in EN and LT (plural forms aside)', () => {
    expect(normalised(lt)).toEqual(normalised(en));
  });

  it('have every LT plural form where a key is plural', () => {
    const ltKeys = keys(lt);
    const plural = new Set(
      ltKeys.filter((k) => pluralSuffix.test(k)).map((k) => k.replace(pluralSuffix, '')),
    );
    for (const base of plural) {
      for (const form of ['one', 'few', 'other']) {
        expect(ltKeys).toContain(`${base}_${form}`);
      }
    }
  });

  it('has no empty strings', () => {
    expect(values(en).filter((v) => v === '')).toEqual([]);
    expect(values(lt).filter((v) => v === '')).toEqual([]);
  });
});
