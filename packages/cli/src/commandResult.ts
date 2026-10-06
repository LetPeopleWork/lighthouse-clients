import type { LighthouseApiResult } from "@letpeoplework/lighthouse-client";
import {
  formatPayload,
  type OutputFormat,
  type PrettyRenderer,
} from "./output";

export type CliCommandResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

export const getOptionValue = (
  args: readonly string[],
  optionName: string,
): string | undefined => {
  const index = args.indexOf(optionName);
  if (index < 0) {
    return undefined;
  }
  return args[index + 1];
};

export const getSuccessResult = (stdout: string): CliCommandResult => ({
  exitCode: 0,
  stdout,
  stderr: "",
});

export const getErrorResult = (stderr: string): CliCommandResult => ({
  exitCode: 1,
  stdout: "",
  stderr,
});

export const isCliCommandResult = (value: unknown): value is CliCommandResult =>
  typeof value === "object" &&
  value !== null &&
  "exitCode" in value &&
  "stdout" in value &&
  "stderr" in value;

export const mapApiResultToCliResult = <TValue>(
  result: LighthouseApiResult<TValue>,
  outputFormat: OutputFormat,
  renderPretty?: PrettyRenderer<TValue>,
): CliCommandResult => {
  if (result.ok) {
    if (result.value === undefined) {
      return getSuccessResult("ok");
    }

    const formattedPayload = formatPayload(
      result.value,
      outputFormat,
      renderPretty,
    );
    if (!formattedPayload.ok) {
      return getErrorResult(formattedPayload.error);
    }

    return getSuccessResult(formattedPayload.value);
  }
  return getErrorResult(`${result.error.category}: ${result.error.reason}`);
};
