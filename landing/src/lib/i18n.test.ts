import { describe, expect, it } from 'vitest';

import { browserLocale } from './i18n';

describe('browserLocale', () => {
  it('picks Lithuanian when the browser asks for it first', () => {
    expect(browserLocale(['lt-LT', 'en'])).toBe('lt');
    expect(browserLocale(['lt'])).toBe('lt');
  });

  it('falls back to English for everything else', () => {
    expect(browserLocale(['en-GB', 'lt'])).toBe('en');
    expect(browserLocale(['de'])).toBe('en');
    expect(browserLocale([])).toBe('en');
  });
});
