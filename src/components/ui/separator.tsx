import * as SeparatorPrimitive from '@rn-primitives/separator';

import { cn } from '@/lib/cn';

export type SeparatorProps = { inset?: boolean; className?: string };

/** 1 px hairline between rows; `inset` starts after a 48 pt thumb plus its gap. */
export function Separator({ inset, className }: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      decorative
      className={cn('h-px bg-border', inset ? 'ml-[60px]' : '', className)}
    />
  );
}
