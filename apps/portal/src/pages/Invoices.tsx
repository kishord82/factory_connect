import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useState } from 'react';
import { formatDate } from '../utils/date.js';
import { TableLoading, TableEmpty, TableError } from '../components/common/TableStates.js';

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  status: string;
  total_amount: string;
  subtotal: string;
  tax_amount: string;
  invoice_date: string;
  due_date: string;
}

interface PaginatedResponse {
  data: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function Invoices() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['invoices', page],
    queryFn: () => api.get<PaginatedResponse>(`/invoices?page=${page}&pageSize=20`),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <TableLoading message="Loading invoices..." />
        ) : isError ? (
          <TableError message={error instanceof Error ? error.message : 'Unknown error'} onRetry={() => refetch()} />
        ) : !data?.data?.length ? (
          <TableEmpty entity="invoices" />
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[invoice.status] || 'bg-gray-100'}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">INR {Number(invoice.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.invoice_date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.due_date)}</td>
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
