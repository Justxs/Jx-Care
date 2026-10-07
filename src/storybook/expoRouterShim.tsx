/**
 * What `import … from 'expo-router'` means for files under src/ while Storybook is enabled
 * (metro.config.js resolves it here; this file itself is excluded, so the import below is the real
 * module). Everything is the real expo-router except the stand-ins in `./router`, which take over
 * only while a story is on screen.
 */
import * as Real from 'expo-router';

import { storyRouterOverrides } from './router';

export * from 'expo-router';

const overrides = storyRouterOverrides(Real);

export const router = overrides.router;
export const useRouter = overrides.useRouter;
export const useLocalSearchParams = overrides.useLocalSearchParams;
export const useNavigation = overrides.useNavigation;
export const Redirect = overrides.Redirect;
