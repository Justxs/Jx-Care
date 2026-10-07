import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

type CardProps = ComponentProps<'div'> & { delay?: number };

/** A floating sample card (a group, not a landmark). It rises in once, after `delay` ms, at its final size. */
export function ShowcaseCard({ className, delay = 0, style, ...props }: Readonly<CardProps>) {
  return (
    <div
      role="group"
      data-slot="showcase-card"
      style={{ '--card-delay': `${delay}ms`, ...style }}
      className={cn(
        'min-w-0 rounded-lg bg-surface p-5 text-ink shadow-raised ring-1 ring-ink/5 motion-safe:animate-card-in dark:ring-ink/10',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ id, children }: Readonly<{ id: string; children: string }>) {
  return (
    <p id={id} className="text-body font-semibold">
      {children}
    </p>
  );
}

/** Progress track that fills with a transform from the left. */
export function Meter({
  value,
  label,
  tone = 'accent',
  className,
}: Readonly<{
  value: number;
  label?: string;
  tone?: 'accent' | 'warning' | 'skin' | 'hair';
  className?: string;
}>) {
  const fill = {
    accent: 'bg-accent',
    warning: 'bg-warning',
    skin: 'bg-skin',
    hair: 'bg-hair',
  }[tone];

  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('h-1.5 overflow-hidden rounded-full bg-subtle', className)}
    >
      <div
        className={cn('h-full origin-left rounded-full motion-safe:animate-fill', fill)}
        style={{ scale: `${Math.min(1, Math.max(0, value))} 1` }}
      />
    </div>
  );
}
