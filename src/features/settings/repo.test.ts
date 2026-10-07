import { createTestDb } from '@/db/test-db';

import { defaultSettings, getSettings, hasSettingsRow, saveSettings } from './repo';

describe('settings repo', () => {
  it('returns defaults when no row exists', () => {
    const db = createTestDb();
    expect(hasSettingsRow(db)).toBe(false);
    expect(getSettings(db)).toEqual(defaultSettings);
    expect(getSettings(db, 'lt').language).toBe('lt');
  });

  it('creates the row on first save and patches it later', () => {
    const db = createTestDb();
    const first = saveSettings(db, { language: 'lt', currency: 'USD' });
    expect(first.language).toBe('lt');
    expect(first.currency).toBe('USD');
    expect(first.expiryWarnDays).toBe(30);
    expect(hasSettingsRow(db)).toBe(true);

    const second = saveSettings(db, { expiryWarnDays: 14, skinAngles: ['front', 'left'] });
    expect(second.language).toBe('lt');
    expect(second.expiryWarnDays).toBe(14);
    expect(second.skinAngles).toEqual(['front', 'left']);
    expect(saveSettings(db, {})).toEqual(second);
  });
});
