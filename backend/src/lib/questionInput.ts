// Shared validation for question creation. Both the public app path
// (routes/questions.ts) and the surveyor dashboard path (routes/surveyors.ts)
// write to the same Question table, so they must agree on limits — previously the
// surveyor path validated (type/options/280-char cap) while the app path stored
// text + options raw and unbounded (DB-bloat / feed-break vector). This is the one
// source of truth.

export const MAX_TEXT = 280;   // a poll question, not an essay
export const MAX_OPTION = 100; // per multiple-choice option
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 4;

export type QuestionType = 'yesno' | 'multiplechoice';

export interface RawQuestion {
  text?: unknown;
  type?: unknown;
  options?: unknown;
}

export type QuestionValidation =
  | { ok: true; text: string; type: QuestionType; options: string[] | null }
  | { ok: false; error: string };

export function validateQuestionInput(input: RawQuestion): QuestionValidation {
  const type = input.type;
  if (type !== 'yesno' && type !== 'multiplechoice') {
    return { ok: false, error: 'Invalid question type' };
  }

  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text) return { ok: false, error: 'Question text is required' };
  if (text.length > MAX_TEXT) {
    return { ok: false, error: `Question text must be ${MAX_TEXT} characters or fewer` };
  }

  if (type === 'yesno') {
    return { ok: true, text, type, options: null };
  }

  // multiplechoice
  const raw = input.options;
  if (!Array.isArray(raw) || raw.length < MIN_OPTIONS || raw.length > MAX_OPTIONS) {
    return { ok: false, error: `Multiple choice needs ${MIN_OPTIONS}–${MAX_OPTIONS} options` };
  }
  const options: string[] = [];
  for (const o of raw) {
    const trimmed = typeof o === 'string' ? o.trim() : '';
    if (!trimmed) return { ok: false, error: 'Options cannot be empty' };
    if (trimmed.length > MAX_OPTION) {
      return { ok: false, error: `Options must be ${MAX_OPTION} characters or fewer` };
    }
    options.push(trimmed);
  }
  return { ok: true, text, type, options };
}

export const MAX_ANSWER_VALUE = 16; // "yes"/"no" or an option index — never long

/** Validate a submitted answer value (bounds what gets stored in Answer.value). */
export function validateAnswerValue(value: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return { ok: false, error: 'value required' };
  if (v.length > MAX_ANSWER_VALUE) return { ok: false, error: 'Invalid answer value' };
  return { ok: true, value: v };
}
