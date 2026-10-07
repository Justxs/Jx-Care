import { useId } from 'react';

/**
 * The bottom edge of the pink band: a row of shallow scallops, like cucumber slices laid in a line.
 * It hangs below the band, so the band's own height never changes, and moves with the band when
 * a page change morphs it.
 */
export function ScallopEdge() {
  const patternId = useId();

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-full -z-10 block h-2 w-full text-hero vt-hero-edge"
    >
      <defs>
        <pattern id={patternId} width="24" height="8" patternUnits="userSpaceOnUse">
          <path d="M 0 0 H 24 A 14 14 0 0 1 0 0 Z" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
