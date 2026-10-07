import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it } from 'vitest';

import { i18n } from '@/lib/i18n';
import { preferencesStorageKey, preferencesStore } from '@/stores/preferences';

import { LandingPage } from './landing-page';

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LandingPage />
    </I18nextProvider>,
  );
}

describe('LandingPage', () => {
  beforeEach(() => {
    preferencesStore.setState(() => ({ locale: 'en', theme: null }));
  });

  it('leads with the headline, the features link and the source link', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Know what to put on today' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: "See what's inside" })).toHaveAttribute(
      'href',
      '#features',
    );
    const source = screen.getByRole('link', { name: /^See it on GitHub/ });
    expect(source).toHaveAccessibleName(/opens in a new tab/);
    expect(source).toHaveAttribute('href', 'https://github.com/Justxs/Jx-Care');
    expect(source).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('lists every feature group with its features', () => {
    renderPage();
    const features = screen.getByRole('region', { name: "What you'll find inside" });

    for (const group of ['Products', 'Routines', 'Hair', 'Ingredients', 'Progress', 'Shopping']) {
      expect(within(features).getByRole('heading', { level: 3, name: group })).toBeVisible();
    }
    expect(
      within(features).getByRole('heading', { level: 4, name: 'Conflicts across the day' }),
    ).toBeVisible();
  });

  it('marks the phone and cards as sample data', () => {
    renderPage();

    expect(screen.getByRole('figure', { name: 'Today screen with sample data' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'My products' })).toHaveTextContent('Sample data');
  });

  it('switches to Lithuanian and remembers it', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'EN, switch to Lithuanian' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Žinokite, ką naudoti šiandien' }),
    ).toBeVisible();
    expect(document.documentElement.lang).toBe('lt');
    expect(document.title).toBe('Jx-Care: odos ir plaukų priežiūra jūsų telefone');
    expect(JSON.parse(localStorage.getItem(preferencesStorageKey) ?? '{}')).toMatchObject({
      locale: 'lt',
    });
  });

  it('switches to the dark theme and back', async () => {
    const user = userEvent.setup();
    renderPage();
    const root = document.documentElement;

    await user.click(screen.getByRole('button', { name: /switch to dark theme/i }));
    expect(root).toHaveClass('dark');
    expect(root).not.toHaveClass('light');

    await user.click(screen.getByRole('button', { name: /switch to dark theme/i }));
    expect(root).toHaveClass('light');
    expect(root).not.toHaveClass('dark');
  });
});
