import {
  type RouterHistory,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { FeaturesPage } from '@/features/landing/features-page';
import { LandingPage } from '@/features/landing/landing-page';

const rootRoute = createRootRoute({ component: Outlet });

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

/** Pages cross-fade with view transitions and every page opens at the top (or at its #hash). */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    defaultViewTransition: true,
    scrollRestoration: true,
  });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
