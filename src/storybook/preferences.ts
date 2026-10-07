import { createStore } from '@tanstack/react-store';
import { colorScheme } from 'nativewind';

import { setI18nLanguage, type Language } from '@/i18n';
import { appStore } from '@/state/app';
import type { ColorSchemeName } from '@/theme/colors';

/** The story toolbar's theme and language. Kept here so they stay put from story to story. */
export type StoryPrefs = { scheme: ColorSchemeName; language: Language };

export const storyPrefsStore = createStore<StoryPrefs>({ scheme: 'light', language: 'en' });

function applyScheme(scheme: ColorSchemeName): void {
  // `useThemeColors()` and every `dark:` class follow NativeWind's scheme.
  colorScheme.set(scheme);
}

function applyLanguage(language: Language): Promise<unknown> {
  appStore.setState((s) => ({ ...s, language }));
  return setI18nLanguage(language);
}

export function setStoryScheme(scheme: ColorSchemeName): void {
  storyPrefsStore.setState((s) => ({ ...s, scheme }));
  applyScheme(scheme);
}

export function setStoryLanguage(language: Language): Promise<unknown> {
  storyPrefsStore.setState((s) => ({ ...s, language }));
  return applyLanguage(language);
}

/** Puts the stored theme and language in force; the story shell calls it as each story mounts. */
export function applyStoryPrefs(): Promise<unknown> {
  const { scheme, language } = storyPrefsStore.state;
  applyScheme(scheme);
  return applyLanguage(language);
}
