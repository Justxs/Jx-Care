import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './text';

export type CardProps = {
  /** Sentence-case heading drawn above the card. */
  title?: string;
  /** No padding, for lists of rows divided by Separators. */
  flush?: boolean;
  children: ReactNode;
  className?: string;
};

/** Surface container. Never nest a card in a card. Dark mode swaps the shadow for a hairline. */
export function Card({ title, flush, children, className }: CardProps) {
  const body = (
    <View
      className={cn(
        'rounded-xl bg-surface shadow-card dark:border dark:border-border dark:shadow-none',
        flush ? 'overflow-hidden' : 'p-4',
        className,
      )}
    >
      {children}
    </View>
  );
  if (!title) return body;
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="text-title-s px-1">
        {title}
      </Text>
      {body}
    </View>
  );
}
