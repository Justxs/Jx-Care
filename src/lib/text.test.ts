import { normalizeName, tidy } from './text';

describe('normalizeName', () => {
  it('trims, collapses spaces, strips accents and lowercases', () => {
    expect(normalizeName('  Niacinamide ')).toBe('niacinamide');
    expect(normalizeName('Ąžuolas')).toBe('azuolas');
    expect(normalizeName('Hyaluronic   Acid')).toBe('hyaluronic acid');
    expect(normalizeName('Šarkė  Ėglė')).toBe('sarke egle');
    // Recovery answers (spec L2): case, accents and extra spaces don't matter.
    expect(normalizeName('  ŠARŪNAS ')).toBe(normalizeName('sarunas'));
  });
});

describe('tidy', () => {
  it('collapses whitespace but keeps case', () => {
    expect(tidy('  Vitamin   C ')).toBe('Vitamin C');
  });
});
