import { cn } from '@/lib/cn';

/** The Ko-fi cup with its heart, drawn the same way as on Jx Finance. */
export function KofiCup({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('shrink-0 text-[#0f2540] dark:text-ink', className)}
    >
      <path
        d="M3.5 6.5h13.5v6.8a5.2 5.2 0 0 1-5.2 5.2H8.7a5.2 5.2 0 0 1-5.2-5.2z"
        fill="#ffffff"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 8.6h1.2a2.8 2.8 0 0 1 0 5.6H17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.25 15.3s-3.4-2-3.4-4.3a1.8 1.8 0 0 1 3.4-.85 1.8 1.8 0 0 1 3.4.85c0 2.3-3.4 4.3-3.4 4.3z"
        fill="#ff5e5b"
      />
    </svg>
  );
}
