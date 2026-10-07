import '../src/global.css';

import { withThemeByClassName } from '@storybook/addon-themes';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import type { Preview } from '@storybook/react-vite';
import { I18nextProvider } from 'react-i18next';

import { i18n, isLocale } from '../src/lib/i18n';
import { preferencesStore } from '../src/stores/preferences';

const preview: Preview = {
  loaders: [
    function localeLoader(context) {
      const locale: unknown = context.globals.locale;
      if (isLocale(locale) && preferencesStore.state.locale !== locale) {
        preferencesStore.setState((prev) => ({ ...prev, locale }));
      }
      return Promise.resolve({});
    },
  ],
  globalTypes: {
    locale: {
      description: 'Language',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'lt', title: 'Lietuvių' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'en' },
  parameters: {
    layout: 'centered',
    a11y: { test: 'error' },
  },
  decorators: [
    withThemeByClassName({ themes: { light: 'light', dark: 'dark' }, defaultTheme: 'light' }),
    // Links need a router: every story renders inside one whose / and /features both show it.
    (Story) => {
      const rootRoute = createRootRoute({ component: () => <Story /> });
      const router = createRouter({
        routeTree: rootRoute.addChildren([
          createRoute({ getParentRoute: () => rootRoute, path: '/' }),
          createRoute({ getParentRoute: () => rootRoute, path: '/features' }),
        ]),
        history: createMemoryHistory(),
      });
      return (
        <I18nextProvider i18n={i18n}>
          <RouterProvider router={router} />
        </I18nextProvider>
      );
    },
  ],
};

export default preview;
