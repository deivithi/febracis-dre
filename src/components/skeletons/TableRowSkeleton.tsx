import { Fragment } from 'react';
import { Skeleton } from '../ui/Skeleton';

const DEFAULT_BAR_WIDTHS = ['68%', '52%', '48%', '56%', '44%', '40%', '62%'] as const;

export type TableRowSkeletonProps = {
  columns?: number;
  /** Number of body rows (default 5 per list spec). */
  lineCount?: number;
  /** Optional width per column (CSS length or %). Falls back to a repeating pattern. */
  barWidths?: readonly string[];
};

/**
 * Single table row or repeated rows for `.data-table` tbody (matches `td` padding / line height).
 */
export function TableRowSkeleton({ columns = 5, lineCount = 5, barWidths }: TableRowSkeletonProps) {
  const rows = Array.from({ length: lineCount }, (_, rowIdx) => rowIdx);

  return (
    <Fragment>
      {rows.map((rowIdx) => (
        <tr key={rowIdx} aria-hidden>
          {Array.from({ length: columns }, (_, colIdx) => {
            const width = barWidths?.[colIdx] ?? DEFAULT_BAR_WIDTHS[colIdx % DEFAULT_BAR_WIDTHS.length];
            return (
              <td key={colIdx}>
                <Skeleton className="ui-skeleton-line" style={{ width, height: '1rem' }} />
              </td>
            );
          })}
        </tr>
      ))}
    </Fragment>
  );
}
