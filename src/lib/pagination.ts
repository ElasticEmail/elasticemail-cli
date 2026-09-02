import { Flags } from '@oclif/core';

/**
 * Shared pagination flags for list commands: either `--limit/--offset`
 * directly, or the friendlier `--page/--page-size` pair.
 */
export const paginationFlags = {
  limit: Flags.integer({
    summary: 'Maximum number of items to return (overrides --page-size).',
    min: 1,
  }),
  offset: Flags.integer({ summary: 'Number of items to skip.', min: 0 }),
  page: Flags.integer({ summary: 'Page number (1-based).', default: 1, min: 1 }),
  'page-size': Flags.integer({ summary: 'Items per page.', default: 20, min: 1 }),
};

export interface PaginationFlagValues {
  limit?: number;
  offset?: number;
  page: number;
  'page-size': number;
}

export interface ResolvedPagination {
  limit: number;
  offset: number;
  /** Set when --limit was combined with --page in a contradictory way. */
  conflict?: string;
}

/**
 * Resolves the effective limit/offset from the two flag styles. `--limit`
 * and `--offset` win when given; otherwise page math applies.
 */
export function resolvePagination(flags: PaginationFlagValues): ResolvedPagination {
  if (flags.limit !== undefined && flags.offset === undefined && flags.page > 1) {
    return {
      limit: flags.limit,
      offset: 0,
      conflict: 'Use either --page/--page-size or --limit/--offset, not both.',
    };
  }
  const limit = flags.limit ?? flags['page-size'];
  const offset = flags.offset ?? (flags.limit ? 0 : (flags.page - 1) * flags['page-size']);
  return { limit, offset };
}
