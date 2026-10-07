import * as AlertDialogPrimitive from '@rn-primitives/alert-dialog';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PIN_LENGTH } from '@/components/ui/pin-pad';
import { Text } from '@/components/ui/text';
import { motion } from '@/theme/motion';

import { pinService, type PinService } from '../pin';
import { tryAgainText, useCountdown } from '../useCountdown';

export type PinConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The right PIN was typed. */
  onConfirmed: () => void;
  portalHost?: string;
  service?: Pick<PinService, 'verifyPin' | 'lockoutUntil'>;
};

/**
 * Asks for the PIN before something that needs it while unlocked (Reset app from Settings). It
 * checks on the 4th digit under the same lockout as the lock screen.
 */
export function PinConfirmDialog({
  open,
  onOpenChange,
  portalHost,
  ...body
}: PinConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal hostName={portalHost}>
        <AlertDialogPrimitive.Overlay className="absolute inset-0 items-center justify-center px-6">
          <Animated.View
            entering={FadeIn.duration(motion.duration.base)}
            exiting={FadeOut.duration(motion.duration.fast)}
            className="absolute inset-0 bg-ink/40"
          />
          <AlertDialogPrimitive.Content className="w-full max-w-[400px]">
            <PinConfirmBody {...body} />
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Overlay>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

/** Mounted only while open, so the field starts empty every time. */
function PinConfirmBody({
  title,
  description,
  onConfirmed,
  service = pinService,
}: Omit<PinConfirmDialogProps, 'open' | 'onOpenChange' | 'portalHost'>) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const busy = useRef(false);
  const left = useCountdown(lockedUntil);
  // A check that finishes after the dialog closed (Cancel, then maybe opened again) is ignored.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    service
      .lockoutUntil(Date.now())
      .catch(() => 0)
      .then((until) => {
        if (!cancelled) setLockedUntil(until);
      });
    return () => {
      cancelled = true;
    };
  }, [service]);

  const onChange = async (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(digits);
    if (digits.length > 0) setWrong(false);
    if (digits.length < PIN_LENGTH || busy.current) return;
    busy.current = true;
    const result = await service.verifyPin(digits, Date.now());
    busy.current = false;
    if (!mounted.current) return;
    if (result.ok) {
      onConfirmed();
      return;
    }
    setPin('');
    if (result.locked || result.lockedUntil) setLockedUntil(result.lockedUntil ?? 0);
    if (!result.locked) setWrong(true);
  };

  const error = left > 0 ? tryAgainText(t, left) : wrong ? t('lock.wrongPin') : undefined;

  return (
    <Animated.View
      entering={FadeIn.duration(motion.duration.base)}
      exiting={FadeOut.duration(motion.duration.fast)}
      className="gap-4 rounded-xl bg-surface p-6 shadow-raised dark:border dark:border-border"
    >
      <View className="gap-2">
        <AlertDialogPrimitive.Title asChild>
          <Text accessibilityRole="header" className="text-title-m">
            {title}
          </Text>
        </AlertDialogPrimitive.Title>
        <AlertDialogPrimitive.Description asChild>
          <Text className="text-body text-ink-muted">{description}</Text>
        </AlertDialogPrimitive.Description>
      </View>
      <Input
        label={t('lock.reset.pinLabel')}
        value={pin}
        onChangeText={(text) => void onChange(text)}
        type="password"
        keyboard="numeric"
        maxLength={PIN_LENGTH}
        autoFocus
        editable={left === 0}
        error={error}
      />
      <AlertDialogPrimitive.Cancel asChild>
        <Button variant="ghost">{t('common.cancel')}</Button>
      </AlertDialogPrimitive.Cancel>
    </Animated.View>
  );
}
