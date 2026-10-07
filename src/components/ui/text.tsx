import { createContext, useContext, type ComponentProps } from 'react';
import { Text as RNText } from 'react-native';

import { cn } from '@/lib/cn';

/** Lets a parent (a Button, a Badge) set the text classes of the Text inside it. */
export const TextClassContext = createContext<string | undefined>(undefined);

export type TextProps = ComponentProps<typeof RNText> & { className?: string };

/**
 * The one text component. Defaults to `text-body text-ink`; type classes (`text-body-strong`)
 * carry the Figtree family for their weight. Large system text wraps instead of breaking layouts.
 */
export function Text({ className, maxFontSizeMultiplier = 1.6, ...props }: TextProps) {
  const inherited = useContext(TextClassContext);
  return (
    <RNText
      className={cn('text-body text-ink', inherited, className)}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...props}
    />
  );
}
