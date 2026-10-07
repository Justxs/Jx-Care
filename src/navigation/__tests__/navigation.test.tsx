import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { TabBar } from '@/components/TabBar';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import TabsLayout from '../../../app/(tabs)/_layout';
import TodayRoute from '../../../app/(tabs)/index';
import ProductStack from '../../../app/(tabs)/products/_layout';
import ProductDetailRoute from '../../../app/(tabs)/products/[id]';
import ProductsRoute from '../../../app/(tabs)/products/index';
import OnboardingStack from '../../../app/(onboarding)/_layout';
import WelcomeRoute from '../../../app/(onboarding)/welcome';

jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(() => Promise.resolve()) }));

const routes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': TodayRoute,
  '(tabs)/products/_layout': ProductStack,
  '(tabs)/products/index': ProductsRoute,
  '(tabs)/products/[id]': ProductDetailRoute,
  '(onboarding)/_layout': OnboardingStack,
  '(onboarding)/welcome': WelcomeRoute,
};

beforeEach(async () => {
  await setI18nLanguage('en');
});

describe('routes', () => {
  it('sends a first launch to onboarding', async () => {
    setupTestApp();
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('O1 · Welcome')).toBeTruthy();
  });

  it('opens a product from a deep link once set up', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en' });
    await renderRouter(routes, { initialUrl: '/products/12', wrapper: app.wrapper });
    expect(await screen.findByText('This product was deleted')).toBeTruthy();
  });
});

const tabBarProps = (
  index: number,
  emit = jest.fn(() => ({ defaultPrevented: false })),
  navigate = jest.fn(),
) =>
  ({
    state: {
      index,
      routes: ['index', 'products', 'routines', 'calendar', 'settings'].map((name) => ({
        key: `${name}-key`,
        name,
        params: undefined,
      })),
    },
    navigation: { emit, navigate },
    descriptors: {},
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  }) as unknown as Parameters<typeof TabBar>[0];

describe('TabBar', () => {
  it('shows five labelled tabs with the active one selected', async () => {
    await setI18nLanguage('lt');
    await render(<TabBar {...tabBarProps(1)} />);
    for (const label of ['Šiandien', 'Produktai', 'Rutinos', 'Kalendorius', 'Nustatymai']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('tab', { name: 'Produktai' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Šiandien' })).not.toBeSelected();
  });

  it('navigates to another tab and not to the current one', async () => {
    const navigate = jest.fn();
    await render(<TabBar {...tabBarProps(0, undefined, navigate)} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Today' }));
    expect(navigate).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('tab', { name: 'Calendar' }));
    expect(navigate).toHaveBeenCalledWith('calendar', undefined);
  });

  it('reports its height so toasts float above it', async () => {
    await render(<TabBar {...tabBarProps(0)} />);
    await fireEvent(screen.getByTestId('tab-bar'), 'layout', {
      nativeEvent: { layout: { height: 72 } },
    });
    expect(uiStore.state.toastInset).toBe(72);
  });
});
