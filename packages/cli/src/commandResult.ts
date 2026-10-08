import {
  type LighthouseApiResult,
  readTerms,
  type Terms,
  type TermsSource,
  type UsageDataOccurrence,
} from "@letpeoplework/lighthouse-client";
import {
  formatPayload,
  type OutputFormat,
  type PrettyRenderer,
} from "./output";

/** What a command did that usage data may count. Never printed. */
export type CliCommandUsage = {
  /** The command reached Lighthouse and Lighthouse answered it successfully. */
  readonly reached: boolean;
  readonly occurrences: readonly UsageDataOccurrence[];
};

export type CliCommandResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly usage?: CliCommandUsage;
};

/** The result as it is, counting `occurrences` when Lighthouse answered the command successfully. */
export const withUsage = (
  result: CliCommandResult,
  answered: LighthouseApiResult<unknown>,
  occurrences: readonly UsageDataOccurrence[],
): CliCommandResult =>
  answered.ok && result.exitCode === 0
    ? { ...result, usage: { reached: true, occurrences } }
    : result;

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

/**
 * An answer whose pretty view speaks the instance's words. The words are read only for that view, so
 * --json and --toon ask Lighthouse for the answer alone.
 */
export const mapApiResultInTerms = async <TValue>(
  read: Promise<LighthouseApiResult<TValue>>,
  outputFormat: OutputFormat,
  termsSource: TermsSource,
  renderPretty: (value: TValue, terms: Terms) => string | null,
): Promise<CliCommandResult> => {
  if (outputFormat !== "pretty") {
    return mapApiResultToCliResult(await read, outputFormat);
  }
  const [result, terms] = await Promise.all([read, readTerms(termsSource)]);
  return mapApiResultToCliResult(result, outputFormat, (value) =>
    renderPretty(value, terms),
  );
};
