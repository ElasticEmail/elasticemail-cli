import { describe, expect, it } from 'vitest';
import {
  extractEmail,
  isValidEmail,
  parseRecipients,
  validateSendInput,
} from '../src/lib/validate.js';

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('  user.name+tag@sub.example.co  ')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('parseRecipients', () => {
  it('splits comma-separated values and trims', () => {
    const { valid, invalid } = parseRecipients(['a@example.com, b@example.com']);
    expect(valid).toEqual(['a@example.com', 'b@example.com']);
    expect(invalid).toEqual([]);
  });

  it('partitions valid and invalid addresses', () => {
    const { valid, invalid } = parseRecipients(['good@example.com', 'bad']);
    expect(valid).toEqual(['good@example.com']);
    expect(invalid).toEqual(['bad']);
  });

  it('drops empty entries', () => {
    const { valid, invalid } = parseRecipients(['', '  ', 'a@example.com']);
    expect(valid).toEqual(['a@example.com']);
    expect(invalid).toEqual([]);
  });
});

describe('extractEmail', () => {
  it('pulls the address out of a display-name form', () => {
    expect(extractEmail('Jane Doe <jane@example.com>')).toBe('jane@example.com');
  });

  it('returns the input when there is no angle-bracket form', () => {
    expect(extractEmail('jane@example.com')).toBe('jane@example.com');
  });
});

describe('validateSendInput', () => {
  const valid = {
    to: ['a@example.com'],
    subject: 'Hello',
    text: 'Body',
    from: 'me@example.com',
  };

  it('passes a complete, valid input', () => {
    expect(validateSendInput(valid)).toEqual([]);
  });

  it('requires at least one recipient', () => {
    const errors = validateSendInput({ ...valid, to: [] });
    expect(errors.some((e) => e.field === 'to')).toBe(true);
  });

  it('flags invalid recipients', () => {
    const errors = validateSendInput({ ...valid, to: ['nope'] });
    expect(errors.some((e) => e.field === 'to')).toBe(true);
  });

  it('requires a subject', () => {
    const errors = validateSendInput({ ...valid, subject: '   ' });
    expect(errors.some((e) => e.field === 'subject')).toBe(true);
  });

  it('requires a text or html body', () => {
    const errors = validateSendInput({ ...valid, text: '', html: '' });
    expect(errors.some((e) => e.field === 'body')).toBe(true);
  });

  it('accepts an html-only body', () => {
    const errors = validateSendInput({ ...valid, text: '', html: '<b>hi</b>' });
    expect(errors).toEqual([]);
  });

  it('accepts a template instead of a body', () => {
    const errors = validateSendInput({ ...valid, text: '', html: '', template: 'Welcome' });
    expect(errors).toEqual([]);
  });

  it('makes the subject optional when a template is used', () => {
    const errors = validateSendInput({
      ...valid,
      subject: '',
      text: '',
      html: '',
      template: 'Welcome',
    });
    expect(errors).toEqual([]);
  });

  it('requires a sender', () => {
    const errors = validateSendInput({ ...valid, from: '' });
    expect(errors.some((e) => e.field === 'from')).toBe(true);
  });

  it('validates the sender address, allowing display-name form', () => {
    expect(validateSendInput({ ...valid, from: 'Me <me@example.com>' })).toEqual([]);
    expect(validateSendInput({ ...valid, from: 'not-an-email' }).some((e) => e.field === 'from')).toBe(
      true,
    );
  });
});
