import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { preferencesStore } from '@/stores/preferences';
import { renderAt } from '@/test/render';

describe('FeaturesPage', () => {
  beforeEach(() => {
    preferencesStore.setState(() => ({ locale: 'en', theme: null }));
  });

  it('lists every group with each feature, its text and an example', async () => {
    renderAt('/features');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Everything Jx Care does' }),
    ).toBeVisible();
    for (const group of ['Products', 'Routines', 'Hair', 'Ingredients', 'Progress', 'Shopping']) {
      expect(screen.getByRole('heading', { level: 2, name: group })).toBeVisible();
    }
    const ingredients = screen.getByRole('region', { name: 'Ingredients' });
    expect(
      within(ingredients).getByRole('heading', { level: 3, name: 'Conflicts across the day' }),
    ).toBeVisible();
    expect(within(ingredients).getAllByText('For example:')).toHaveLength(3);
    expect(document.title).toBe('Features · Jx Care');
  });

  it('marks Features as the current page and goes home from the logo', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/features');
    const nav = await screen.findByRole('navigation', { name: 'Main' });

    expect(within(nav).getByRole('link', { name: 'Features' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(screen.getByRole('link', { name: /home/ }));
    expect(router.state.location.pathname).toBe('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Know what to put on today' }),
    ).toBeVisible();
  });
});
