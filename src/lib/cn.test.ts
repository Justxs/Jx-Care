import { cn } from './cn';

describe('cn', () => {
  it('keeps a type style and a colour together', () => {
    expect(cn('text-body text-ink', 'text-ink-muted')).toBe('text-body text-ink-muted');
    expect(cn('text-body text-ink', 'text-title-s')).toBe('text-ink text-title-s');
  });
  it('drops falsy values', () => {
    expect(cn('p-4', false, undefined, 'rounded-xl')).toBe('p-4 rounded-xl');
  });
});
