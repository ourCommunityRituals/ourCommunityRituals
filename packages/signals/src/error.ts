/**
 * What Signals writes about an error: its class and a scrubbed, shortened
 * message. Never the stack's file paths with query strings, never a URL,
 * never a bound value.
 *
 * An error is free text. It can repeat the URL it failed on (with a signed
 * link in it), an email from a row, or a D1 message that quotes a bound value.
 * So the message goes through both redaction layers and is cut short:
 *   - D1 / SQLite errors keep their label only (`D1_ERROR SQLITE_CONSTRAINT`),
 *     the rule OSE `lib/error-label.ts` follows, because the D1 client writes
 *     row values into its messages;
 *   - anything else is credential-masked, person-scrubbed and cut to
 *     ERROR_TEXT_MAX characters.
 */

import { redactText } from './redact/credentials';
import { ERROR_TEXT_MAX, scrubText } from './redact/personal';

export interface ErrorFields {
  /** The error's constructor name, or the type of a thrown non-Error. */
  error_class: string;
  /** Scrubbed message, at most ERROR_TEXT_MAX characters. */
  error: string;
}

const CLASS_SHAPE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const D1_LABEL = /\b(D1_[A-Z_]+)\b(?:[\s\S]*?\b(SQLITE_[A-Z_]+))?/;

export function errorFields(err: unknown): ErrorFields {
  try {
    if (err instanceof Error) {
      const cls = CLASS_SHAPE.test(err.name) ? err.name : 'Error';
      const message = typeof err.message === 'string' ? err.message : '';
      const d1 = D1_LABEL.exec(message);
      if (d1) return { error_class: cls, error: [d1[1], d1[2]].filter(Boolean).join(' ') };
      return { error_class: cls, error: clip(scrubText(redactText(message))) };
    }
    if (err === null) return { error_class: 'null', error: '' };
    const kind = typeof err;
    if (kind === 'string') return { error_class: 'string', error: clip(scrubText(redactText(err as string))) };
    return { error_class: kind, error: '' };
  } catch {
    return { error_class: 'unreadable', error: '' };
  }
}

function clip(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length <= ERROR_TEXT_MAX ? oneLine : `${oneLine.slice(0, ERROR_TEXT_MAX - 1)}…`;
}
