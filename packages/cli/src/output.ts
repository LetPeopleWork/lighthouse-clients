import { encode } from "@toon-format/toon";

export type OutputFormat = "pretty" | "json" | "toon";

export const DEFAULT_OUTPUT_FORMAT: OutputFormat = "pretty";

export const OUTPUT_FORMAT_FLAGS = {
  "--pretty": "pretty",
  "--json": "json",
  "--toon": "toon",
} as const satisfies Record<string, OutputFormat>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPrimitive = (
  value: unknown,
): value is boolean | number | string | null =>
  value === null ||
  typeof value === "boolean" ||
  typeof value === "number" ||
  typeof value === "string";

const isInlineArray = (value: readonly unknown[]): boolean =>
  value.length > 0 && value.every((item) => isPrimitive(item));

const formatPrimitive = (value: unknown): string => {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  return JSON.stringify(value);
};

const getIndent = (depth: number): string => " ".repeat(depth);

const getSummaryValue = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
};

const getRecordSummary = (value: Record<string, unknown>): string | null => {
  const name = getSummaryValue(value.name);
  const id = getSummaryValue(value.id);

  if (name !== null && id !== null) {
    return `${name} [id: ${id}]`;
  }

  if (name !== null) {
    return name;
  }

  if (id !== null) {
    return `[id: ${id}]`;
  }

  return null;
};

const getOrderedKeys = (
  value: Record<string, unknown>,
  omitSummaryFields: boolean,
): string[] => {
  const keys = Object.keys(value);
  if (!omitSummaryFields) {
    return keys;
  }

  return keys.filter((key) => key !== "name" && key !== "id");
};

const formatComplexFieldLines = (
  key: string,
  value: unknown,
  depth: number,
): string[] => {
  const indent = getIndent(depth);

  if (Array.isArray(value) && value.length === 0) {
    return [`${indent}${key}: []`];
  }

  if (isRecord(value) && Object.keys(value).length === 0) {
    return [`${indent}${key}: {}`];
  }

  if (Array.isArray(value) && isInlineArray(value)) {
    return [
      `${indent}${key}: ${value.map((item) => formatPrimitive(item)).join(", ")}`,
    ];
  }

  return [`${indent}${key}:`, ...formatPrettyLines(value, depth + 2)];
};

const formatPrettyArrayLines = (
  value: readonly unknown[],
  depth: number,
): string[] => {
  const indent = getIndent(depth);

  if (value.length === 0) {
    return [`${indent}[]`];
  }

  if (isInlineArray(value)) {
    return [
      `${indent}${value.map((item) => formatPrimitive(item)).join(", ")}`,
    ];
  }

  return value.flatMap((item, index) => {
    const itemLines = formatPrettyLines(item, depth + 2);
    const lines = [
      `${indent}- ${itemLines[0]?.trimStart() ?? ""}`,
      ...itemLines.slice(1),
    ];

    if (index === value.length - 1) {
      return lines;
    }

    return [...lines, ""];
  });
};

const formatPrettyRecordLines = (
  value: Record<string, unknown>,
  depth: number,
): string[] => {
  const indent = getIndent(depth);
  const summary = getRecordSummary(value);
  const keys = getOrderedKeys(value, summary !== null);

  if (keys.length === 0) {
    if (summary === null) {
      return [`${indent}{}`];
    }

    return [`${indent}${summary}`];
  }

  const fieldDepth = summary === null ? depth : depth + 2;
  const fieldLines = keys.flatMap((key) => {
    const fieldValue = value[key];

    if (isPrimitive(fieldValue)) {
      return [`${getIndent(fieldDepth)}${key}: ${formatPrimitive(fieldValue)}`];
    }

    return formatComplexFieldLines(key, fieldValue, fieldDepth);
  });

  if (summary === null) {
    return fieldLines;
  }

  return [`${indent}${summary}`, ...fieldLines];
};

const formatPrettyLines = (value: unknown, depth = 0): string[] => {
  const indent = getIndent(depth);

  if (isPrimitive(value)) {
    return [`${indent}${formatPrimitive(value)}`];
  }

  if (Array.isArray(value)) {
    return formatPrettyArrayLines(value, depth);
  }

  if (isRecord(value)) {
    return formatPrettyRecordLines(value, depth);
  }

  return [`${indent}${JSON.stringify(value)}`];
};

const formatPretty = (value: unknown): string =>
  formatPrettyLines(value).join("\n");

export const isOutputFormat = (value: unknown): value is OutputFormat =>
  value === "pretty" || value === "json" || value === "toon";

export const isOutputFormatFlag = (
  value: string,
): value is keyof typeof OUTPUT_FORMAT_FLAGS => value in OUTPUT_FORMAT_FLAGS;

export const formatPayload = (
  value: unknown,
  outputFormat: OutputFormat,
):
  | { readonly ok: true; readonly value: string }
  | {
      readonly ok: false;
      readonly error: string;
    } => {
  if (outputFormat === "json") {
    return { ok: true, value: JSON.stringify(value) };
  }

  if (outputFormat === "pretty") {
    return { ok: true, value: formatPretty(value) };
  }

  try {
    return { ok: true, value: encode(value as never) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Failed to format payload as TOON: ${reason}`,
    };
  }
};
