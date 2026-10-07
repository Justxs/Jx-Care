import { act, fireEvent, screen } from '@testing-library/react-native';

import { getDb } from '@/db';
import { getSettings, saveSettings } from '@/features/settings/repo';
import { i18n, setI18nLanguage } from '@/i18n';
import { makeFormatter } from '@/i18n/useFormat';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { currencyCodes, currencyOptions } from '../../currencies';
import { PreferencesScreen } from '../PreferencesScreen';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('@/db/queryClient', () => {
  const actual = jest.requireActual('@/db/queryClient');
  return { ...actual, queryClient: actual.createQueryClient({ gcTime: Infinity }) };
});

const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

beforeEach(async () => {
  await setI18nLanguage('en');
  router.push.mockClear();
});

describe('currencies', () => {
  it('lists EUR, USD, GBP and PLN first, then the rest sorted', () => {
    const codes = currencyCodes({
      ...Intl,
      supportedValuesOf: () => ['SEK', 'AUD', 'EUR', 'CHF'],
    } as never);
    expect(codes).toEqual(['EUR', 'USD', 'GBP', 'PLN', 'AUD', 'CHF', 'SEK']);
  });

  it('falls back to a short list without Intl.supportedValuesOf', () => {
    const codes = currencyCodes({} as never);
    expect(codes).toEqual(['EUR', 'USD', 'GBP', 'PLN', 'CHF', 'CZK', 'DKK', 'NOK', 'SEK']);
  });

  it('names currencies when the phone can', () => {
    const [eur] = currencyOptions('en', ['EUR']);
    expect(eur?.value).toBe('EUR');
    expect(eur?.label).toMatch(/^EUR/);
  });
});

describe('SettingsScreen', () => {
  it('shows every group and row in order, and rows push', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en', currency: 'EUR' });
    await app.render(<SettingsScreen />);
    expect(await screen.findByText('English')).toBeTruthy();

    const order = [
      'Care data',
      'Ingredients',
      'Conflicts',
      'Avoid list',
      'Notifications',
      'Reminders',
      'Security',
      'PIN and security',
      'Preferences',
      'Language',
      'Currency',
      'Progress photos',
      'Data',
      'Backup and restore',
      'Reset app',
      'About',
      'Version',
      'Licences',
    ];
    const texts = screen.getAllByText(/.+/).map((n) => n.props.children as unknown);
    let last = -1;
    for (const label of order) {
      const at = texts.findIndex((x, i) => i > last && x === label);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    expect(screen.getByText('Never')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Ingredients' }));
    expect(router.push).toHaveBeenCalledWith('/settings/ingredients');
    await fireEvent.press(screen.getByRole('button', { name: 'Language, English' }));
    expect(router.push).toHaveBeenCalledWith('/settings/preferences');
  });

  it('shows the last backup on its app day, as Backup and restore does', async () => {
    const app = setupTestApp();
    // 01:30 still belongs to the day before (the app day ends at 04:00).
    saveSettings(app.db, { language: 'en', lastBackupAt: new Date(2025, 2, 2, 1, 30).getTime() });
    await app.render(<SettingsScreen />);
    expect(
      await screen.findByRole('button', { name: 'Backup and restore, 1 Mar 2025' }),
    ).toBeTruthy();
  });

  it('reads in Lithuanian', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'lt' });
    await setI18nLanguage('lt');
    await app.render(<SettingsScreen />);
    for (const label of ['Nustatymai', 'Priežiūros duomenys', 'Atkurti programėlę', 'Licencijos']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});

describe('PreferencesScreen', () => {
  it('switches the language at once and saves it', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en' });
    await app.render(<PreferencesScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Lietuvių' }));
    await act(async () => {});
    expect(i18n.language).toBe('lt');
    expect(appStore.state.language).toBe('lt');
    expect(screen.getAllByText('Valiuta').length).toBeGreaterThan(0);
    expect(screen.queryByText('Currency')).toBeNull();
    // Survives a restart: it is in the settings row.
    expect(getSettings(getDb()).language).toBe('lt');
  });

  it('saves the currency, and prices reformat', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en', currency: 'EUR' });
    await app.render(<PreferencesScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: /^USD/ }));
    await act(async () => {});
    expect(getSettings(app.db).currency).toBe('USD');

    const before = makeFormatter({
      lang: 'en',
      locale: 'en-GB',
      currency: 'EUR',
      today: '2026-10-07',
      uses24h: true,
    });
    const after = makeFormatter({
      lang: 'en',
      locale: 'en-GB',
      currency: 'USD',
      today: '2026-10-07',
      uses24h: true,
    });
    expect(before.money(1299)).toContain('€');
    expect(after.money(1299)).toContain('US$');
  });
});
