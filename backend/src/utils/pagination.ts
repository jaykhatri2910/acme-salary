/**
 * Pagination helpers.
 *
 * Provides a consistent way to parse, validate, and apply pagination
 * query parameters across all list endpoints.
 *
 * This is a placeholder implementation — query parameter validation will
 * be wired to Zod schemas in the individual route modules (Phase 3+).
 */

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/**
 * Parse raw query parameters into validated pagination values.
 * Falls back to safe defaults for missing or invalid inputs.
 */
export function parsePaginationParams(
  page: unknown,
  pageSize: unknown,
): PaginationParams {
  const parsedPage = Number(page);
  const parsedPageSize = Number(pageSize);

  const safePage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : DEFAULT_PAGE;
  const safePageSize =
    Number.isInteger(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= MAX_PAGE_SIZE
      ? parsedPageSize
      : DEFAULT_PAGE_SIZE;

  return {
    page: safePage,
    pageSize: safePageSize,
    offset: (safePage - 1) * safePageSize,
  };
}

/**
 * Build the standard `meta` pagination envelope included in all list responses.
 */
export function buildPaginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  return { page, pageSize, total, totalPages };
}
