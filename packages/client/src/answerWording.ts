import {
  readTerms,
  type TerminologyKey,
  type Terms,
  type TermsSource,
} from "./terminology";

type Read =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: unknown };

/** What an answer is said with: the instance's words and the name of what it is about. */
export type AnswerWording = {
  readonly terms: Terms;
  readonly name: string;
};

/** What an answer is about: the term for its kind, its id, and the read that names it. */
export type AnswerSubject = {
  readonly term: TerminologyKey;
  readonly id: number;
  readonly read: () => Promise<Read>;
};

const nameIn = (value: unknown): string | null =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  typeof value.name === "string" &&
  value.name.length > 0
    ? value.name
    : null;

/** The subject's name, or its term and id when the name cannot be had: "Team [id: 3]". */
export const nameOrFallback = (
  read: Read,
  subject: Pick<AnswerSubject, "term" | "id">,
  terms: Terms,
): string =>
  (read.ok ? nameIn(read.value) : null) ??
  `${terms[subject.term]} [id: ${subject.id}]`;

const UNREAD: Read = { ok: false, error: null };

const readSafely = async (read: () => Promise<Read>): Promise<Read> => {
  try {
    return await read();
  } catch {
    return UNREAD;
  }
};

/**
 * Reads the instance's words and the subject's name together. Neither read can fail the answer: the
 * seeded words and the term with the id stand in, because a heading is never worth an error.
 */
export const readAnswerWording = async (
  source: TermsSource,
  subject: AnswerSubject,
): Promise<AnswerWording> => {
  const [terms, named] = await Promise.all([
    readTerms(source),
    readSafely(subject.read),
  ]);
  return { terms, name: nameOrFallback(named, subject, terms) };
};
