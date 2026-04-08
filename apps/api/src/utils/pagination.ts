/**
 * Pagination utilities — server-side search, sort, and pagination helpers.
 * Use these in route handlers to parse query params and build SQL clauses.
 */

import type { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
  search: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse pagination, sort, order, and search from the request query.
 * Accepts both `limit` (new) and `pageSize` (legacy) for backwards compat.
 */
export function parsePagination(req: Request, defaultSort: string = 'created_at'): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const rawLimit = (req.query.limit as string) || (req.query.pageSize as string);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit) || 25));
  const sort = (req.query.sort as string) || defaultSort;
  const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
  const search = (req.query.search as string) || '';
  return { page, limit, sort, order, search };
}

/**
 * Build a search WHERE fragment across multiple columns using ILIKE.
 * All columns share the same search term. Returns clause, bound values, and next param index.
 *
 * @example
 * const { clause, values, nextIndex } = buildSearchWhere('acme', ['o.buyer_po_number', 'o.status'], 2);
 * // clause: "(o.buyer_po_number::text ILIKE $2 OR o.status::text ILIKE $2)"
 */
export function buildSearchWhere(
  search: string,
  searchableColumns: string[],
  startParamIndex: number = 1,
): { clause: string; values: string[]; nextIndex: number } {
  if (!search || searchableColumns.length === 0) {
    return { clause: '', values: [], nextIndex: startParamIndex };
  }
  const conditions = searchableColumns.map(col => `${col}::text ILIKE $${startParamIndex}`);
  return {
    clause: `(${conditions.join(' OR ')})`,
    values: [`%${search}%`],
    nextIndex: startParamIndex + 1,
  };
}

/**
 * Build a safe ORDER BY clause from validated sort column and direction.
 * Falls back to the first allowed column if the requested sort column is not whitelisted.
 */
export function buildOrderBy(
  sort: string,
  order: 'asc' | 'desc',
  allowedColumns: string[],
): string {
  const safeSort = allowedColumns.includes(sort) ? sort : (allowedColumns[0] ?? 'created_at');
  return `ORDER BY ${safeSort} ${order.toUpperCase()}`;
}

/**
 * Build LIMIT / OFFSET clause with positional params.
 *
 * @param page - 1-based page number
 * @param limit - items per page
 * @param paramIndex - the next available $N index
 */
export function buildLimitOffset(
  page: number,
  limit: number,
  paramIndex: number,
): { clause: string; values: number[] } {
  return {
    clause: `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    values: [limit, (page - 1) * limit],
  };
}

/**
 * Wrap a data array with pagination metadata for API responses.
 * Produces the new `{ data, pagination }` envelope shape.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResponse<T> {
  const pages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      pages,
      hasNext: params.page * params.limit < total,
      hasPrev: params.page > 1,
    },
  };
}
