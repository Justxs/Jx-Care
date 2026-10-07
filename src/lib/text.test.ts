import { matchesAnswer, normalizeName, tidy } from './text';

describe('normalizeName', () => {
  it('trims, collapses spaces, strips accents and lowercases', () => {
    expect(normalizeName('  Niacinamide ')).toBe('niacinamide');
    expect(normalizeName('Ąžuolas')).toBe('azuolas');
    expect(normalizeName('Hyaluronic   Acid')).toBe('hyaluronic acid');
    expect(normalizeName('Šarkė  Ėglė')).toBe('sarke egle');
  });
});

describe('matchesAnswer', () => {
  it('ignores case, accents and extra spaces', () => {
    const stored = normalizeName('Šarūnas');
    expect(matchesAnswer('  sarunas ', stored)).toBe(true);
    expect(matchesAnswer('ŠARŪNAS', stored)).toBe(true);
    expect(matchesAnswer('Sarunai', stored)).toBe(false);
  });
});

describe('tidy', () => {
  it('collapses whitespace but keeps case', () => {
    expect(tidy('  Vitamin   C ')).toBe('Vitamin C');
  });
});
