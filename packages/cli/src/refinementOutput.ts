import {
  countNumberedRows,
  describeRefinementHeading,
  describeRefinementNeed,
  placeEnoughForLine,
  type RefinementTerms,
  type TeamRefinement,
} from "@letpeoplework/lighthouse-client";

const COLUMN_GAP = "  ";

const toTableLines = (rows: readonly (readonly string[])[]): string[] => {
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

const listLines = (
  refinement: TeamRefinement,
  terms: RefinementTerms,
): string[] => {
  if (refinement.workItems.length === 0) {
    return [];
  }
  const numbered = countNumberedRows(refinement);
  const header = ["#", terms.workItem, "Parent", "State"];
  const rows = refinement.workItems.map((workItem, index) => [
    index < numbered ? String(index + 1) : "",
    `${workItem.referenceId} ${workItem.name}`,
    workItem.parentReferenceId || "-",
    workItem.state,
  ]);
  const [headerLine, ...rowLines] = toTableLines([header, ...rows]);
  const line = placeEnoughForLine(refinement, terms);
  if (line === null) {
    return [headerLine, ...rowLines];
  }
  return [
    headerLine,
    ...rowLines.slice(0, line.afterRows),
    `── ${line.says} ──`,
    ...rowLines.slice(line.afterRows),
  ];
};

/** The refinement need as the web's Refinement tab states it, followed by the Work Items in refinement. */
export const renderRefinement = (
  teamName: string,
  refinement: TeamRefinement,
  terms: RefinementTerms,
): string => {
  const need = describeRefinementNeed(teamName, refinement, terms);
  const list = listLines(refinement, terms);
  return [
    describeRefinementHeading(teamName, refinement, terms),
    ...(need === null ? [] : [need]),
    ...(list.length === 0 ? [] : ["", ...list]),
  ].join("\n");
};
