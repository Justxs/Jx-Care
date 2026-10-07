import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * The app's square checkbox as a picture. When checked, the tick appears after `delay` ms;
 * the box keeps its size so nothing around it moves.
 */
export function CheckMark({
  checked,
  delay = 0,
  className,
}: Readonly<{ checked: boolean; delay?: number; className?: string }>) {
  return (
    <span
      aria-hidden="true"
      style={{ '--tick-delay': `${delay}ms` }}
      className={cn(
        'relative grid size-5.5 shrink-0 place-items-center rounded-[7px] ring-2 ring-border-strong ring-inset',
        className,
      )}
    >
      {checked ? (
        <span className="absolute inset-0 grid place-items-center rounded-[7px] bg-accent text-on-accent motion-safe:animate-tick">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      ) : null}
    </span>
  );
}
