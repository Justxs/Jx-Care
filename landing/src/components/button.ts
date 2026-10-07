import { cn } from '@/lib/cn';

const base =
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,scale] duration-200 ease-out active:scale-[0.98] [&_svg]:size-4.5 [&_svg]:shrink-0';

const variants = {
  /** The one filled pink button on the page. */
  primary: 'bg-accent text-on-accent hover:bg-accent/90',
  outline: 'text-ink ring-1 ring-border-strong ring-inset hover:bg-subtle hover:ring-ink/60',
  ghost: 'text-ink-muted hover:bg-subtle hover:text-ink',
} as const;

const sizes = {
  md: 'px-4 text-body',
  lg: 'min-h-12 px-5 text-body-l',
  icon: 'size-11 px-0',
} as const;

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}
