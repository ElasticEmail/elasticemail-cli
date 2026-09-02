/**
 * Minimal plain-text table renderer for non-JSON output. No colors or border
 * characters so the output stays grep-friendly even on a TTY.
 */

export interface Column<T> {
  header: string;
  /** Extracts the cell value for a row; null/undefined render as '-'. */
  value: (row: T) => unknown;
  /**
   * Optional hard cap on column width; longer values are truncated with an
   * ellipsis. Leave unset for identifier columns (names, emails) — users need
   * the full value to query details for an item.
   */
  maxWidth?: number;
}

function cell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Renders rows as aligned lines: a header line followed by one line per row. */
export function renderTable<T>(rows: T[], columns: Column<T>[], indent = '  '): string[] {
  const texts = rows.map((row) =>
    columns.map((col) =>
      col.maxWidth ? truncate(cell(col.value(row)), col.maxWidth) : cell(col.value(row)),
    ),
  );
  const widths = columns.map((col, i) =>
    Math.max(col.header.length, ...texts.map((t) => t[i].length)),
  );

  const line = (cells: string[]) =>
    indent +
    cells
      .map((text, i) => (i === cells.length - 1 ? text : text.padEnd(widths[i])))
      .join('  ')
      .trimEnd();

  return [line(columns.map((c) => c.header.toUpperCase())), ...texts.map(line)];
}
