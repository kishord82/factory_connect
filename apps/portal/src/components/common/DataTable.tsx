/**
 * Reusable DataTable with server-side search, sort, and pagination.
 * Syncs state to URL query params so pages are bookmarkable.
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { TableLoading, TableEmpty, TableError } from './TableStates.js';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface DataTableProps<T extends Record<string, unknown>> {
  /** API path, e.g. "/orders". DataTable appends search/sort/page params. */
  fetchUrl: string;
  columns: Column<T>[];
  /** Entity name shown in empty-state ("No orders found") */
  entityLabel?: string;
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Buttons/actions rendered above the search bar */
  headerActions?: React.ReactNode;
  /** Default sort column key */
  defaultSort?: string;
  defaultOrder?: 'asc' | 'desc';
  /** Default items per page (10 | 25 | 50) */
  defaultPageSize?: 10 | 25 | 50;
  /** Additional fixed query params appended to every request */
  extraParams?: Record<string, string>;
}

const PAGE_SIZE_OPTIONS: Array<10 | 25 | 50> = [10, 25, 50];

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  if (!direction) {
    return (
      <span className="ml-1 text-gray-300 inline-flex flex-col leading-none">
        <span className="text-[9px]">▲</span>
        <span className="text-[9px]">▼</span>
      </span>
    );
  }
  return (
    <span className="ml-1 text-indigo-500 text-[10px]">
      {direction === 'asc' ? '▲' : '▼'}
    </span>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  fetchUrl,
  columns,
  entityLabel = 'records',
  onRowClick,
  headerActions,
  defaultSort = 'created_at',
  defaultOrder = 'desc',
  defaultPageSize = 25,
  extraParams = {},
}: DataTableProps<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL or fall back to defaults
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [sort, setSort] = useState(searchParams.get('sort') ?? defaultSort);
  const [order, setOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('order') as 'asc' | 'desc') ?? defaultOrder,
  );
  const [page, setPage] = useState(parseInt(searchParams.get('page') ?? '1') || 1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(
    (parseInt(searchParams.get('limit') ?? String(defaultPageSize)) as 10 | 25 | 50) ?? defaultPageSize,
  );

  // Debounce search input 300ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) { params.set('search', debouncedSearch); } else { params.delete('search'); }
    params.set('sort', sort);
    params.set('order', order);
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, sort, order, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build query string
  const queryString = (() => {
    const p = new URLSearchParams({
      search: debouncedSearch,
      sort,
      order,
      page: String(page),
      pageSize: String(pageSize),
      ...extraParams,
    });
    return p.toString();
  })();

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResult<T>>({
    queryKey: [fetchUrl, queryString],
    queryFn: () => api.get<PaginatedResult<T>>(`${fetchUrl}?${queryString}`),
  });

  function handleSort(colKey: string) {
    if (sort === colKey) {
      setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(colKey);
      setOrder('asc');
    }
    setPage(1);
  }

  function handlePageSizeChange(next: 10 | 25 | 50) {
    setPageSize(next);
    setPage(1);
  }

  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-4">
      {/* Header row: actions + search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        <div className="relative sm:w-72 w-full">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M16.65 10.5A6.15 6.15 0 1110.5 4.35a6.15 6.15 0 016.15 6.15z" />
          </svg>
          <input
            type="text"
            placeholder={`Search ${entityLabel}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <TableLoading message={`Loading ${entityLabel}…`} />
        ) : isError ? (
          <TableError
            message={error instanceof Error ? error.message : 'Unknown error'}
            onRetry={() => refetch()}
          />
        ) : !data?.data?.length ? (
          <TableEmpty entity={entityLabel} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map(col => (
                      <th
                        key={col.key}
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''}`}
                        onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      >
                        {col.label}
                        {col.sortable && (
                          <SortIcon direction={sort === col.key ? order : null} />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.data.map((row, idx) => (
                    <tr
                      key={(row.id as string) ?? idx}
                      className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50'} ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map(col => (
                        <td key={col.key} className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {col.render
                            ? col.render(row)
                            : String(row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination bar */}
            <div className="px-6 py-3 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  Page {data.page} of {totalPages} ({data.total} total)
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Rows:</span>
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => handlePageSizeChange(n)}
                      className={`px-2 py-0.5 text-xs rounded border ${pageSize === n ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
