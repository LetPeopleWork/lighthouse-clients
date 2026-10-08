import {
  describeBlackoutRuleWriteConfirmation,
  describeOwnerWriteConfirmation,
  type LighthouseApiResult,
  type OwnerKind,
  readTerms,
  readWrittenBlackoutRule,
  readWrittenOwner,
  type Terms,
  type TermsSource,
  type WriteVerb,
} from "@letpeoplework/lighthouse-client";
import {
  type CliCommandResult,
  getErrorResult,
  getSuccessResult,
  mapApiResultToCliResult,
} from "./commandResult";
import type { OutputFormat, PrettyRenderer } from "./output";

/** The one line confirming a Team or Portfolio create or update, or null when the answer does not say which it is. */
export const renderOwnerWritten =
  (verb: WriteVerb, kind: OwnerKind, terms: Terms): PrettyRenderer<unknown> =>
  (value) => {
    const owner = readWrittenOwner(value);
    return owner === null
      ? null
      : describeOwnerWriteConfirmation(verb, kind, owner, terms);
  };

/** The one line confirming a blackout rule create or update, or null when the answer does not say which rule it is. */
export const renderBlackoutRuleWritten =
  (verb: WriteVerb): PrettyRenderer<unknown> =>
  (value) => {
    const rule = readWrittenBlackoutRule(value);
    return rule === null
      ? null
      : describeBlackoutRuleWriteConfirmation(verb, rule);
  };

export type OwnerWrite = {
  readonly verb: WriteVerb;
  readonly kind: OwnerKind;
  readonly outputFormat: OutputFormat;
  readonly termsSource: TermsSource;
};

/** A Team or Portfolio create or update: the written record for scripts, its one-line confirmation under --pretty. */
export const answerOwnerWrite = async (
  write: Promise<LighthouseApiResult<unknown>>,
  { verb, kind, outputFormat, termsSource }: OwnerWrite,
): Promise<CliCommandResult> => {
  if (outputFormat !== "pretty") {
    return mapApiResultToCliResult(await write, outputFormat);
  }
  const [result, terms] = await Promise.all([write, readTerms(termsSource)]);
  return mapApiResultToCliResult(
    result,
    outputFormat,
    renderOwnerWritten(verb, kind, terms),
  );
};

/**
 * A write Lighthouse answers with no record: scripts keep today's line under --json and --toon, which
 * they already parse; --pretty gets the confirmation. A refusal reads as every other command's.
 */
export const confirmRecordlessWrite = async <TValue>(
  result: LighthouseApiResult<TValue>,
  outputFormat: OutputFormat,
  todaysLine: string,
  confirmation: () => Promise<string>,
): Promise<CliCommandResult> => {
  if (!result.ok) {
    return getErrorResult(`${result.error.category}: ${result.error.reason}`);
  }
  return getSuccessResult(
    outputFormat === "pretty" ? await confirmation() : todaysLine,
  );
};
