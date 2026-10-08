import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { preferencesStorageKey, preferencesStore } from '@/stores/preferences';
import { renderAt } from '@/test/render';

describe('LandingPage', () => {
  beforeEach(() => {
    preferencesStore.setState(() => ({ locale: 'en', theme: null }));
  });

  it('leads with the headline, the features link and the source link', async () => {
    renderAt('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Know what to put on today' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /See what's inside/ })).toHaveAttribute(
      'href',
      '/features',
    );
    const hero = screen.getByRole('heading', { level: 1 }).parentElement as HTMLElement;
    const source = within(hero).getByRole('link', { name: /^See it on GitHub/ });
    expect(source).toHaveAccessibleName(/opens in a new tab/);
    expect(source).toHaveAttribute('href', 'https://github.com/Justxs/Jx-Care');
    expect(source).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows three feature groups with their cards and links to the rest', async () => {
    renderAt('/');
    const overview = await screen.findByRole('region', { name: "What you'll find inside" });

    for (const group of ['Routines', 'Ingredients', 'Progress']) {
      expect(within(overview).getByRole('heading', { level: 3, name: group })).toBeVisible();
    }
    expect(within(overview).getByRole('link', { name: 'More about routines' })).toHaveAttribute(
      'href',
      '/features#routines',
    );
    for (const group of ['Products', 'Hair', 'Shopping']) {
      expect(within(overview).getByRole('link', { name: group })).toHaveAttribute(
        'href',
        `/features#${group.toLowerCase()}`,
      );
    }
    expect(within(overview).queryByText(/For example/)).not.toBeInTheDocument();
    expect(within(overview).getByRole('link', { name: /See all features/ })).toHaveAttribute(
      'href',
      '/features',
    );
  });

  it('marks the phone and cards as sample data', async () => {
    renderAt('/');

    expect(
      await screen.findByRole('figure', { name: 'Today screen with sample data' }),
    ).toBeVisible();
    expect(screen.getByRole('group', { name: 'My products' })).toHaveTextContent('Sample data');
  });

  it('links to Ko-fi', async () => {
    renderAt('/');
    const support = await screen.findByRole('region', { name: 'Support Jx Care' });

    expect(within(support).getByRole('link', { name: /Support me on Ko-fi/ })).toHaveAttribute(
      'href',
      'https://ko-fi.com/justxs',
    );
  });

  it('switches to Lithuanian and remembers it', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.click(await screen.findByRole('button', { name: 'Lietuviškai' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Žinokite, ką naudoti šiandien' }),
    ).toBeVisible();
    expect(document.documentElement.lang).toBe('lt');
    expect(JSON.parse(localStorage.getItem(preferencesStorageKey) ?? '{}')).toMatchObject({
      locale: 'lt',
    });
  });

  it('shows its own page for an unknown address', async () => {
    renderAt('/nowhere');

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Go to the home page/ })).toHaveAttribute('href', '/');
  });

  it('switches to the dark theme and back', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const root = document.documentElement;

    await user.click(await screen.findByRole('button', { name: /switch to dark theme/i }));
    expect(root).toHaveClass('dark');
    expect(root).not.toHaveClass('light');

    await user.click(screen.getByRole('button', { name: /switch to dark theme/i }));
    expect(root).toHaveClass('light');
    expect(root).not.toHaveClass('dark');
  });
});
