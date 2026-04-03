import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useState } from 'react';
import { formatDate } from '../utils/date.js';
import { useAuth, canWrite } from '../lib/auth.js';
import { TableLoading, TableEmpty, TableError } from '../components/common/TableStates.js';

interface Connection {
  id: string;
  buyer_id: string;
  source_type: string;
  mode: string;
  status: string;
  created_at: string;
  circuit_breaker_state: string | null;
}

interface PaginatedResponse {
  data: Connection[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  DISCONNECTED: 'bg-red-100 text-red-700',
};

const circuitBreakerColors: Record<string, string> = {
  CLOSED: 'text-green-600',
  HALF_OPEN: 'text-yellow-600',
  OPEN: 'text-red-600',
};

export function Connections() {
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['connections', page],
    queryFn: () => api.get<PaginatedResponse>(`/connections?page=${page}&pageSize=20`),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Connections</h2>
        {canWrite(user) && (
          <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors" disabled>
            + New Connection
          </button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <TableLoading message="Loading connections..." />
        ) : isError ? (
          <TableError message={error instanceof Error ? error.message : 'Unknown error'} onRetry={() => refetch()} />
        ) : !data?.data?.length ? (
          <TableEmpty entity="connections" />
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Circuit Breaker</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((conn) => (
                  <tr key={conn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{conn.source_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{conn.mode}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[conn.status?.toUpperCase()] || 'bg-gray-100'}`}>
                        {conn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`font-medium ${circuitBreakerColors[(conn.circuit_breaker_state || 'CLOSED').toUpperCase()] || 'text-gray-500'}`}>
                        {(conn.circuit_breaker_state || 'CLOSED').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(conn.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm text-gray-500">Page {data.page} of {data.totalPages} ({data.total} total)</span>
                <div className="space-x-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Prev</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
