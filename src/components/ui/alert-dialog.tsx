import * as AlertDialogPrimitive from '@rn-primitives/alert-dialog';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, withTiming } from 'react-native-reanimated';

import { motion } from '@/theme/motion';

import { Button } from './button';
import { Input } from './input';
import { Text } from './text';

/** Dialog enter: fade and scale 0.96 → 1 in 200 ms. Reanimated skips it under Reduce Motion. */
function dialogEnter() {
  'worklet';
  const config = { duration: motion.duration.base };
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.96 }] },
    animations: {
      opacity: withTiming(1, config),
      transform: [{ scale: withTiming(1, config) }],
    },
  };
}

export type AlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The question ("Delete Vitamin C serum?"). */
  title: string;
  /** What is lost and whether it can be undone. */
  description: string;
  /** The verb ("Delete"), never "OK". */
  actionLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onAction: () => void;
  onCancel?: () => void;
  /** The action stays off until this is typed exactly ("RESET"). */
  confirmText?: string;
  /** Label of the confirm field ("Type RESET to confirm"). */
  confirmLabel?: string;
};

/** Confirmation for destructive or irreversible actions. */
export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  cancelLabel,
  destructive,
  onAction,
  onCancel,
  confirmText,
  confirmLabel,
}: AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="absolute inset-0 items-center justify-center px-6">
          <Animated.View
            entering={FadeIn.duration(motion.duration.base)}
            exiting={FadeOut.duration(motion.duration.fast)}
            className="absolute inset-0 bg-ink/40"
          />
          <AlertDialogPrimitive.Content className="w-full max-w-[400px]">
            <DialogBody
              title={title}
              description={description}
              actionLabel={actionLabel}
              cancelLabel={cancelLabel}
              destructive={destructive}
              onAction={onAction}
              onCancel={onCancel}
              confirmText={confirmText}
              confirmLabel={confirmLabel}
            />
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Overlay>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

/** Mounted only while the dialog is open, so the typed confirm text starts empty every time. */
function DialogBody({
  title,
  description,
  actionLabel,
  cancelLabel,
  destructive,
  onAction,
  onCancel,
  confirmText,
  confirmLabel,
}: Omit<AlertDialogProps, 'open' | 'onOpenChange'>) {
  const [typed, setTyped] = useState('');
  const confirmed = confirmText === undefined || typed === confirmText;
  return (
    <Animated.View
      entering={dialogEnter}
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
      {confirmText !== undefined ? (
        <Input
          label={confirmLabel}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          noHelper
        />
      ) : null}
      <View className="gap-2">
        <AlertDialogPrimitive.Action asChild disabled={!confirmed} onPress={onAction}>
          <Button variant={destructive ? 'danger' : 'primary'} disabled={!confirmed}>
            {actionLabel}
          </Button>
        </AlertDialogPrimitive.Action>
        <AlertDialogPrimitive.Cancel asChild onPress={onCancel}>
          <Button variant="ghost">{cancelLabel}</Button>
        </AlertDialogPrimitive.Cancel>
      </View>
    </Animated.View>
  );
}
