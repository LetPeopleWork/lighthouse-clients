const COLUMN_GAP = "  ";

/** Rows as aligned text lines. Expects at least one row: a view with nothing to list says so in words. */
export const toTableLines = (
  rows: readonly (readonly string[])[],
): string[] => {
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((row) => row[column].length)),
  );
  return rows.map((row) =>
    row
      .map((cell, column) => cell.padEnd(widths[column]))
      .join(COLUMN_GAP)
      .trimEnd(),
  );
};
