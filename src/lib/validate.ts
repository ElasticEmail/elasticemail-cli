/**
 * Lightweight, dependency-free validation helpers shared by the non-interactive
 * command path, the Ink forms, and the unit tests.
 */

// Pragmatic email regex. We are not trying to fully implement RFC 5322 — just
// to catch obvious mistakes before hitting the API.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns true when `value` looks like a valid email address. */
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export interface RecipientParseResult {
  valid: string[];
  invalid: string[];
}

/**
 * Normalizes a list of `--to` values: trims, splits comma-separated entries,
 * drops empties, and partitions into valid/invalid addresses.
 */
export function parseRecipients(values: string[]): RecipientParseResult {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const raw of values) {
    for (const part of raw.split(',')) {
      const candidate = part.trim();
      if (candidate.length === 0) continue;
      if (isValidEmail(candidate)) {
        valid.push(candidate);
      } else {
        invalid.push(candidate);
      }
    }
  }

  return { valid, invalid };
}

export interface SendInput {
  to: string[];
  subject?: string;
  text?: string;
  html?: string;
  from?: string;
  /** Name of a saved template; when set, a text/html body is not required. */
  template?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates everything required to send a transactional email. Pure function so
 * both the CLI flag path and the Ink form can rely on identical rules and it is
 * trivially unit-testable.
 */
export function validateSendInput(input: SendInput): ValidationError[] {
  const errors: ValidationError[] = [];

  const { valid, invalid } = parseRecipients(input.to ?? []);
  if (valid.length === 0 && invalid.length === 0) {
    errors.push({ field: 'to', message: 'At least one recipient (--to) is required.' });
  }
  for (const bad of invalid) {
    errors.push({ field: 'to', message: `Invalid recipient address: ${bad}` });
  }

  // A template carries its own subject, so --subject is optional with --template.
  const templateGiven = Boolean(input.template && input.template.trim().length > 0);
  if ((!input.subject || input.subject.trim().length === 0) && !templateGiven) {
    errors.push({ field: 'subject', message: 'A subject (--subject) is required.' });
  }

  const hasText = Boolean(input.text && input.text.trim().length > 0);
  const hasHtml = Boolean(input.html && input.html.trim().length > 0);
  const hasTemplate = Boolean(input.template && input.template.trim().length > 0);
  if (!hasText && !hasHtml && !hasTemplate) {
    errors.push({
      field: 'body',
      message: 'A message body is required (provide --text, --html, or --template).',
    });
  }

  if (!input.from || input.from.trim().length === 0) {
    errors.push({
      field: 'from',
      message:
        'A sender address is required. Pass --from, or set a default with `auth set-key`.',
    });
  } else if (!isValidEmail(extractEmail(input.from))) {
    errors.push({ field: 'from', message: `Invalid sender address: ${input.from}` });
  }

  return errors;
}

/**
 * Extracts the bare email from a `Name <email@domain.com>` formatted string.
 * Elastic Email accepts the display-name form, but our validator checks the
 * address portion only.
 */
export function extractEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}
