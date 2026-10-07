import type * as ExpoRouter from 'expo-router';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

/**
 * Stand-ins for the parts of expo-router that screens touch, so a screen renders inside a story
 * without navigating anywhere. Used two ways:
 *
 * - On the device, metro resolves `expo-router` imported from src/ to `expoRouterShim.tsx` while
 *   Storybook is enabled; the shim passes the real module in, and the stand-ins only take over
 *   while a story is on screen (the app keeps navigating normally outside Storybook).
 * - In Jest, `jest.mock('expo-router', () => require('@/storybook/router').storyExpoRouterMock())`.
 *
 * This file must never import expo-router at runtime (type imports only).
 */

export type StoryParams = Record<string, string | string[]>;

type StoryRoute = { params: StoryParams };

let mountedStories = 0;

/** Set by the story shell around every story; null outside Storybook. */
const StoryRouteContext = createContext<StoryRoute | null>(null);

/** Provides the route params `useLocalSearchParams()` returns inside the story. */
export function StoryRouteProvider({
  params,
  children,
}: {
  params: StoryParams | undefined;
  children: ReactNode;
}) {
  const parent = useContext(StoryRouteContext);
  const merged = useMemo(() => ({ params: { ...parent?.params, ...params } }), [parent, params]);
  // While any story is mounted, the imperative `router` logs instead of navigating.
  useEffect(() => {
    mountedStories += 1;
    return () => {
      mountedStories -= 1;
    };
  }, []);
  return <StoryRouteContext.Provider value={merged}>{children}</StoryRouteContext.Provider>;
}

type NavigationLogger = (name: string, args: unknown[]) => void;

let logNavigation: NavigationLogger = (name, args) => {
  console.info(`[storybook] ${name}`, ...args);
};

/** Where navigation calls go inside a story; the Storybook preview sends them to Actions. */
export function setNavigationLogger(logger: NavigationLogger): void {
  logNavigation = logger;
}

type Router = typeof ExpoRouter.router;
type Real = Pick<
  typeof ExpoRouter,
  'router' | 'useLocalSearchParams' | 'useNavigation' | 'Redirect' | 'useRouter'
>;

const loggedRouterMethods = [
  'push',
  'navigate',
  'replace',
  'back',
  'dismiss',
  'dismissAll',
  'dismissTo',
  'setParams',
  'prefetch',
  'reload',
] as const;

function fakeRouter(): Router {
  const fake: Record<string, unknown> = {
    canGoBack: () => true,
    canDismiss: () => true,
  };
  for (const method of loggedRouterMethods) {
    fake[method] = (...args: unknown[]) => logNavigation(`router.${method}`, args);
  }
  return fake as unknown as Router;
}

const noop = () => {};

const log =
  (name: string) =>
  (...args: unknown[]) =>
    logNavigation(`navigation.${name}`, args);

function fakeNavigation() {
  return {
    // Screens guard leaving with `beforeRemove`; inside a story nothing leaves.
    addListener: () => noop,
    removeListener: noop,
    setOptions: noop,
    setParams: log('setParams'),
    navigate: log('navigate'),
    goBack: log('goBack'),
    dispatch: log('dispatch'),
    reset: log('reset'),
    canGoBack: () => true,
    isFocused: () => true,
    getParent: () => undefined,
    getId: () => undefined,
    getState: () => undefined,
  };
}

function hrefText(href: ExpoRouter.Href): string {
  if (typeof href === 'string') return href;
  const params = href.params ? ` ${JSON.stringify(href.params)}` : '';
  return `${href.pathname}${params}`;
}

/** Inside a story a redirect is shown, not followed. */
function StoryRedirect({ href }: { href: ExpoRouter.Href }) {
  return (
    <View className="flex-1 items-center justify-center bg-canvas p-6">
      <Text className="text-center text-body text-ink-muted">Redirects to {hrefText(href)}</Text>
    </View>
  );
}

/**
 * The overriding exports. With `real` (the device shim) each one falls back to expo-router
 * outside a story; without it (Jest) the stand-ins always apply.
 */
export function storyRouterOverrides(real?: Real) {
  const fake = fakeRouter();
  const navigation = fakeNavigation();

  const router: Router = real
    ? new Proxy(real.router, {
        get(target, key, receiver) {
          if (mountedStories > 0 && typeof key === 'string' && key in fake) {
            return (fake as unknown as Record<string, unknown>)[key];
          }
          return Reflect.get(target, key, receiver);
        },
      })
    : fake;

  const useLocalSearchParams = real
    ? () => {
        const story = useContext(StoryRouteContext);
        const params = real.useLocalSearchParams();
        return story ? story.params : params;
      }
    : () => useContext(StoryRouteContext)?.params ?? {};

  const useNavigation = real
    ? () => {
        const story = useContext(StoryRouteContext);
        const nav = real.useNavigation();
        return story ? navigation : nav;
      }
    : () => navigation;

  const useRouter = real
    ? () => {
        const story = useContext(StoryRouteContext);
        const r = real.useRouter();
        return story ? fake : r;
      }
    : () => fake;

  const Redirect = real
    ? (props: ExpoRouter.RedirectProps) => {
        const story = useContext(StoryRouteContext);
        const RealRedirect = real.Redirect;
        return story ? <StoryRedirect href={props.href} /> : <RealRedirect {...props} />;
      }
    : (props: ExpoRouter.RedirectProps) => <StoryRedirect href={props.href} />;

  return {
    router,
    useRouter: useRouter as typeof ExpoRouter.useRouter,
    useLocalSearchParams: useLocalSearchParams as typeof ExpoRouter.useLocalSearchParams,
    useNavigation: useNavigation as unknown as typeof ExpoRouter.useNavigation,
    Redirect,
  };
}

/** The whole `expo-router` module as Jest sees it in story tests. */
export function storyExpoRouterMock() {
  return {
    ...storyRouterOverrides(),
    // Screens are focused for as long as they are mounted.
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
    usePathname: () => '/',
    useSegments: () => [],
  };
}
