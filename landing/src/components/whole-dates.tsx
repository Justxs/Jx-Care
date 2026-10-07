import { Fragment } from 'react';

/** "2026-09-30" (LT) and "18 Apr" or "1 Mar 2027" (EN). */
const datePattern = /(\d{4}-\d{2}-\d{2}|\d{1,2} [A-Z][a-z]{2}(?: \d{4})?)/;

/** Text whose dates never break across lines ("09-" / "30"); the rest wraps as usual. */
export function WholeDates({ children }: Readonly<{ children: string }>) {
  return children.split(datePattern).map((part, index) =>
    index % 2 === 1 ? (
      // Parts repeat, so the position is the key.
      // oxlint-disable-next-line react/no-array-index-key
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      // oxlint-disable-next-line react/no-array-index-key
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}
