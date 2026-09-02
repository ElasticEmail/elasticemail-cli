import { describe, expect, it } from 'vitest';
import { resolvePagination } from '../src/lib/pagination.js';

describe('resolvePagination', () => {
  it('uses page math by default', () => {
    expect(resolvePagination({ page: 1, 'page-size': 20 })).toEqual({ limit: 20, offset: 0 });
    expect(resolvePagination({ page: 3, 'page-size': 10 })).toEqual({ limit: 10, offset: 20 });
  });

  it('prefers explicit --limit/--offset', () => {
    expect(resolvePagination({ limit: 5, offset: 7, page: 1, 'page-size': 20 })).toEqual({
      limit: 5,
      offset: 7,
    });
  });

  it('uses offset 0 when only --limit is given', () => {
    expect(resolvePagination({ limit: 5, page: 1, 'page-size': 20 })).toEqual({
      limit: 5,
      offset: 0,
    });
  });

  it('flags the conflicting --limit with --page combination', () => {
    const resolved = resolvePagination({ limit: 5, page: 3, 'page-size': 20 });
    expect(resolved.conflict).toBeTruthy();
  });

  it('allows --limit with explicit --offset even when page is default', () => {
    const resolved = resolvePagination({ limit: 5, offset: 10, page: 1, 'page-size': 20 });
    expect(resolved.conflict).toBeUndefined();
    expect(resolved).toMatchObject({ limit: 5, offset: 10 });
  });
});
