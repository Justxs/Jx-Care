import {
  type RouterHistory,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { FeaturesPage } from '@/features/landing/features-page';
import { LandingPage } from '@/features/landing/landing-page';
import { NotFoundPage } from '@/features/landing/not-found-page';

const rootRoute = createRootRoute({ component: Outlet, notFoundComponent: NotFoundPage });

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

const featuresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/features',
  component: FeaturesPage,
});

export const routeTree = rootRoute.addChildren([landingRoute, featuresRoute]);

/** Pages change with view transitions (the pink band morphs, the rest cross-fades); each opens at the top or its #hash. */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    // No cross-fade on the first load or in a hidden tab: the browser would abort it there and
    // leave an unhandled rejection behind.
    defaultViewTransition: {
      types: ({ fromLocation }) => (fromLocation && !document.hidden ? ['page'] : false),
    },
    scrollRestoration: true,
  });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
