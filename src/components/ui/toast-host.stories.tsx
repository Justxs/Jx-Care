import type { Meta, StoryObj } from '@storybook/react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { dismissToast, setScreenReaderOn, setToastInset, showToast, uiStore } from '@/state/ui';

import { Button } from './button';
import { ToastHost } from './toast-host';

type ToastInput = Parameters<typeof showToast>[0];

/**
 * Every story already has a ToastHost (the story shell, as in app/_layout.tsx), so these show a
 * toast through `showToast()` on open and keep a button to show it again.
 */
function ToastDemo({
  toast,
  screenReader = false,
  inset = 0,
}: {
  toast: ToastInput;
  screenReader?: boolean;
  inset?: number;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    const before = uiStore.state;
    setScreenReaderOn(screenReader);
    setToastInset(inset);
    const id = showToast(toast);
    return () => {
      dismissToast(id);
      setScreenReaderOn(before.screenReaderOn);
      setToastInset(before.toastInset);
    };
    // Runs when the story opens and again on an EN/LT switch (the toast is rebuilt then).
  }, [toast, screenReader, inset]);
  return (
    <View className="gap-3">
      <Button variant="secondary" onPress={() => showToast(toast)}>
        {t('dev.showToast')}
      </Button>
    </View>
  );
}

const meta = {
  title: 'UI/ToastHost',
  component: ToastHost,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ToastHost>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A message alone; it goes after 8 s. */
export const Message: Story = {
  render: function Message() {
    const { t } = useTranslation();
    return (
      <ToastDemo toast={{ message: t('products.finishedToast', { name: 'Retinol serum' }) }} />
    );
  },
};

/** With Undo. */
export const WithUndo: Story = {
  render: function WithUndo() {
    const { t } = useTranslation();
    return (
      <ToastDemo
        toast={{
          message: t('products.finishedToast', { name: 'Retinol serum' }),
          actionLabel: t('common.undo'),
          onAction: () => {},
        }}
      />
    );
  },
};

/** Two actions: "Buy again" before Undo. */
export const TwoActions: Story = {
  render: function TwoActions() {
    const { t } = useTranslation();
    return (
      <ToastDemo
        toast={{
          message: t('products.finishedToast', { name: 'Clay mask' }),
          secondaryLabel: t('common.buyAgain'),
          onSecondary: () => {},
          actionLabel: t('common.undo'),
          onAction: () => {},
        }}
      />
    );
  },
};

/** With a screen reader on the toast stays until closed, so it gets an X. */
export const ScreenReader: Story = {
  render: function ScreenReader() {
    const { t } = useTranslation();
    return (
      <ToastDemo
        screenReader
        toast={{
          message: t('products.finishedToast', { name: 'Retinol serum' }),
          actionLabel: t('common.undo'),
          onAction: () => {},
        }}
      />
    );
  },
};

/** Floats above a bottom bar (tab bar or timer bar) that sets its height as the inset. */
export const AboveTabBar: Story = {
  render: function AboveTabBar() {
    const { t } = useTranslation();
    return (
      <ToastDemo
        inset={64}
        toast={{ message: t('products.finishedToast', { name: 'Retinol serum' }) }}
      />
    );
  },
};

/** A long Lithuanian message wraps; the actions keep their size. */
export const LongLithuanian: Story = {
  render: () => (
    <ToastDemo
      toast={{
        message: '„Drėkinamasis veido kremas jautriai ir sausai odai“ perkeltas į archyvą',
        secondaryLabel: 'Pirkti dar kartą',
        onSecondary: () => {},
        actionLabel: 'Anuliuoti',
        onAction: () => {},
      }}
    />
  ),
};
