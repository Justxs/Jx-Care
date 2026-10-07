import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

const statusTones = {
  ok: 'bg-ok-soft text-ok',
  expiring: 'bg-warning-soft text-warning',
  expired: 'bg-danger-soft text-danger',
  unopened: 'bg-neutral-soft text-neutral',
} as const;

export type Status = keyof typeof statusTones;

/** Expiry status: always a dot and a word, never colour alone. */
export function StatusBadge({
  status,
  children,
}: Readonly<{ status: Status; children: ReactNode }>) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2 text-label font-medium whitespace-nowrap',
        statusTones[status],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

const areaTones = {
  skin: 'bg-skin-soft text-skin',
  hair: 'bg-hair-soft text-hair',
  both: 'bg-subtle text-ink-muted',
} as const;

export type Area = keyof typeof areaTones;

/** Care area as a word in a coloured pill. */
export function AreaTag({ area, children }: Readonly<{ area: Area; children: ReactNode }>) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 shrink-0 items-center rounded-full px-2 text-label font-medium whitespace-nowrap',
        areaTones[area],
      )}
    >
      {children}
    </span>
  );
}

/** The only conflict marker: an amber pill with a triangle and the word. */
export function ConflictTag({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2 text-label font-medium whitespace-nowrap text-warning">
      <TriangleAlert aria-hidden="true" className="size-3.5" />
      {children}
    </span>
  );
}

/** A small neutral label, used for "Sample data". */
export function Tag({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 shrink-0 items-center rounded-full bg-subtle px-2 text-label font-medium whitespace-nowrap text-ink-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}
