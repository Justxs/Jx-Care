import { router, type Href } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';

export type PlaceholderLink = { label: string; href: Href };

export type PlaceholderScreenProps = {
  /** Spec screen ID ("P2"). */
  specId: string;
  title: string;
  /** The task that builds the real screen. */
  task: string;
  /** `back` for pushed screens, `close` for full-screen modals, `none` for tab roots. */
  nav?: 'back' | 'close' | 'none';
  /** Where this screen leads, so the skeleton can be walked through. */
  links?: readonly PlaceholderLink[];
};

/** Stands in for a screen until its task replaces it. */
export function PlaceholderScreen({
  specId,
  title,
  task,
  nav = 'back',
  links = [],
}: PlaceholderScreenProps) {
  const { t } = useTranslation();
  return (
    <SafeAreaView edges={nav === 'none' ? ['top'] : ['top', 'bottom']} className="flex-1 bg-canvas">
      <ScreenHeader
        title={title}
        close={nav === 'close'}
        onBack={
          nav === 'none'
            ? undefined
            : () => (router.canGoBack() ? router.back() : router.replace('/'))
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <EmptyState icon="info" title={`${specId} · ${title}`}>
          {t('dev.builtIn', { task })}
        </EmptyState>
        <View className="gap-2">
          {links.map((link) => (
            <Button key={link.label} variant="secondary" onPress={() => router.push(link.href)}>
              {link.label}
            </Button>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
