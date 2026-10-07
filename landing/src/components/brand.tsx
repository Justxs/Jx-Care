import { useId } from 'react';

import { cn } from '@/lib/cn';

const eyes = [62, 138] as const;
const seeds = [0, 60, 120, 180, 240, 300] as const;

/** Six seeds around each cucumber slice, the same geometry as assets/brand/logo.svg. */
function Seeds({ cx }: Readonly<{ cx: number }>) {
  return seeds.map((angle) => {
    const radians = (angle * Math.PI) / 180;
    const x = cx + 11.5 * Math.cos(radians);
    const y = 88 + 11.5 * Math.sin(radians);
    return (
      <ellipse
        key={angle}
        cx={x.toFixed(2)}
        cy={y.toFixed(2)}
        rx="2.3"
        ry="3.8"
        transform={`rotate(${angle + 90} ${x.toFixed(2)} ${y.toFixed(2)})`}
      />
    );
  });
}

interface MarkProps {
  className?: string;
  /** Spoken name; leave out when the mark sits next to the word Jx Care. */
  title?: string;
}

/** The frog with cucumber slices on its eyes, in one flat colour (currentColor). */
export function BrandMark({ className, title }: Readonly<MarkProps>) {
  const id = useId();
  const head = `${id}-head`;
  const eyeMask = `${id}-eyes`;

  return (
    <svg
      viewBox="16 44 168 144"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('h-8 w-auto shrink-0 text-brand-pink', className)}
    >
      <defs>
        <mask id={head} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <rect width="200" height="200" fill="#fff" />
          {eyes.map((cx) => (
            <circle key={cx} cx={cx} cy="88" r="35" />
          ))}
          <path
            d="M 68 140 Q 100 164 132 140"
            fill="none"
            stroke="#000"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <circle cx="92" cy="120" r="2.6" />
          <circle cx="108" cy="120" r="2.6" />
        </mask>
        <mask id={eyeMask} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <rect width="200" height="200" fill="#fff" />
          {eyes.map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="88" r="25" fill="none" stroke="#000" strokeWidth="4" />
              <Seeds cx={cx} />
            </g>
          ))}
        </mask>
      </defs>
      <g fill="currentColor">
        <path
          mask={`url(#${head})`}
          d="M 24 132 C 24 100 58 90 100 90 C 142 90 176 100 176 132 C 176 164 144 180 100 180 C 56 180 24 164 24 132 Z"
        />
        <g mask={`url(#${eyeMask})`}>
          {eyes.map((cx) => (
            <circle key={cx} cx={cx} cy="88" r="30" />
          ))}
        </g>
      </g>
    </svg>
  );
}

const sizes = {
  md: { mark: 'h-8', stackedMark: 'h-16', text: 'text-title-m' },
  lg: { mark: 'h-10', stackedMark: 'h-20', text: 'text-title-l' },
} as const;

interface BrandProps {
  stacked?: boolean;
  size?: keyof typeof sizes;
  className?: string;
  markClassName?: string;
}

/** Mark and wordmark, read out once as "Jx Care". */
export function Brand({
  stacked = false,
  size = 'md',
  className,
  markClassName,
}: Readonly<BrandProps>) {
  return (
    <span
      role="img"
      aria-label="Jx Care"
      className={cn(
        'inline-flex min-w-0 items-center',
        stacked ? 'flex-col gap-3 text-center' : 'gap-2.5',
        className,
      )}
    >
      <BrandMark
        className={cn(stacked ? sizes[size].stackedMark : sizes[size].mark, markClassName)}
      />
      <span aria-hidden="true" className={cn('font-bold tracking-tight', sizes[size].text)}>
        Jx Care
      </span>
    </span>
  );
}
