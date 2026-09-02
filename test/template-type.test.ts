import { describe, expect, it } from 'vitest';
import { formatTemplateType } from '../src/lib/template-type.js';

describe('formatTemplateType', () => {
  it('maps known API types to friendly labels', () => {
    expect(formatTemplateType('RawHTML')).toBe('Raw HTML');
    expect(formatTemplateType('TemplateEditor')).toBe('New email designer');
    expect(formatTemplateType('DragDropEditor')).toBe('Classic email designer');
  });

  it('passes unknown types through unchanged', () => {
    expect(formatTemplateType('LandingPageEditor')).toBe('LandingPageEditor');
  });

  it('returns undefined for missing values', () => {
    expect(formatTemplateType(undefined)).toBeUndefined();
    expect(formatTemplateType(null)).toBeUndefined();
    expect(formatTemplateType('')).toBeUndefined();
  });
});
