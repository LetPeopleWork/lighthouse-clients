import {
  countNumberedRows,
  describeReadiness,
  describeRefinementSummary,
  describeVotes,
  describeWarnings,
  type EnoughForLine,
  placeEnoughForLine,
  type RefinementTerms,
  type RefinementWording,
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

const workItemRows = (refinement: TeamRefinement): string[][] => {
  const numbered = countNumberedRows(refinement);
  return refinement.workItems.map((workItem, index) => [
    index < numbered ? String(index + 1) : "",
    `${workItem.referenceId} ${workItem.name}`,
    workItem.parentReferenceId || "-",
    workItem.state,
    describeVotes(workItem),
    describeReadiness(workItem),
    describeWarnings(workItem),
  ]);
};

const drawEnoughForLine = (
  rowLines: readonly string[],
  line: EnoughForLine | null,
): string[] =>
  line === null
    ? [...rowLines]
    : [
        ...rowLines.slice(0, line.afterRows),
        `── ${line.says} ──`,
        ...rowLines.slice(line.afterRows),
      ];

const workItemList = (
  refinement: TeamRefinement,
  terms: RefinementTerms,
): string[] => {
  if (refinement.workItems.length === 0) {
    return [];
  }
  const header = [
    "#",
    terms.workItem,
    "Parent",
    "State",
    "Votes",
    "Readiness",
    "Warnings",
  ];
  const [headerLine, ...rowLines] = toTableLines([
    header,
    ...workItemRows(refinement),
  ]);
  return [
    headerLine,
    ...drawEnoughForLine(rowLines, placeEnoughForLine(refinement, terms)),
  ];
};

/** The refinement need as the web's Refinement tab states it, followed by the Work Items in refinement. */
export const renderRefinement = (
  refinement: TeamRefinement,
  wording: RefinementWording,
): string => {
  const list = workItemList(refinement, wording.terms);
  return [
    describeRefinementSummary(refinement, wording),
    ...(list.length === 0 ? [] : ["", ...list]),
  ].join("\n");
};
