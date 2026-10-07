import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';

import { i18n } from '@/lib/i18n';
import { createAppRouter } from '@/router';

/** Renders the site at `path` with the real routes and an in-memory history. */
export function renderAt(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const view = render(
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
  return { router, ...view };
}
