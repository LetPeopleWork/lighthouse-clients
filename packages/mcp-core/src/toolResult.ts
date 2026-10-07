import { encode } from "@toon-format/toon";

type McpToolContent = {
  readonly type: "text";
  readonly text: string;
};

export type McpToolResult = {
  readonly isError: boolean;
  readonly content: readonly McpToolContent[];
};

export const encodePayload = (value: unknown): string => {
  try {
    return encode(value as never);
  } catch {
    return JSON.stringify(value);
  }
};

export const getSuccessToolResult = (text: string): McpToolResult => ({
  isError: false,
  content: [
    {
      type: "text",
      text,
    },
  ],
});

const isFactsObject = (
  value: unknown,
): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The facts under their label, with the answer stated as the web does beside them. Without a summary the
 * facts go out exactly as they always have, so an assistant reading them never sees a different shape.
 */
export const withSummary = (
  label: string,
  facts: unknown,
  summary: string | null,
): McpToolResult =>
  getSuccessToolResult(
    `${label}: ${encodePayload(
      summary !== null && isFactsObject(facts) ? { summary, ...facts } : facts,
    )}`,
  );

export const getErrorToolResult = (text: string): McpToolResult => ({
  isError: true,
  content: [
    {
      type: "text",
      text,
    },
  ],
});

export const isToolResult = (value: unknown): value is McpToolResult =>
  typeof value === "object" &&
  value !== null &&
  "isError" in value &&
  "content" in value;

export const getNumericId = (argumentsPayload: unknown): number | null => {
  if (
    typeof argumentsPayload !== "object" ||
    argumentsPayload === null ||
    Array.isArray(argumentsPayload)
  ) {
    return null;
  }

  const value = (argumentsPayload as { readonly id?: unknown }).id;
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  return null;
};
