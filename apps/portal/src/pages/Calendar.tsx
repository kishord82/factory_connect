import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useState } from 'react';
import { formatDate } from '../utils/date.js';

interface CalendarEntry {
  id: string;
  title: string;
  entry_type: string;
  entry_date: string;
  source: string | null;
  priority: string | null;
  metadata: Record<string, unknown> | null;
}

interface PaginatedResponse {
  data: CalendarEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const eventTypeColors: Record<string, string> = {
  ORDER_CREATED: 'bg-blue-100 text-blue-700',
  ORDER_CONFIRMED: 'bg-green-100 text-green-700',
  SHIPMENT_SCHEDULED: 'bg-purple-100 text-purple-700',
  SHIPMENT_DISPATCHED: 'bg-yellow-100 text-yellow-700',
  INVOICE_ISSUED: 'bg-indigo-100 text-indigo-700',
  PAYMENT_DUE: 'bg-red-100 text-red-700',
};

export function Calendar() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['calendar', page],
    queryFn: () => api.get<PaginatedResponse>(`/calendar?page=${page}&pageSize=20`),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
      </div>
      {isLoading ? (
        <div className="animate-pulse">Loading calendar events...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.data?.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.title}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${eventTypeColors[entry.entry_type] || 'bg-gray-100'}`}>
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(entry.entry_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{entry.source || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-500">Page {data.page} of {data.totalPages} ({data.total} total)</span>
              <div className="space-x-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages ?? 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
