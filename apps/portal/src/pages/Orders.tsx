import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/date.js';
import { useAuth, canWrite } from '../lib/auth.js';
import { TableLoading, TableEmpty, TableError } from '../components/common/TableStates.js';

interface Order {
  id: string;
  buyer_po_number: string;
  factory_order_number: string | null;
  status: string;
  total_amount: string;
  currency: string;
  created_at: string;
}

interface PaginatedResponse {
  data: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  INVOICED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function Orders() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => api.get<PaginatedResponse>(`/orders?page=${page}&pageSize=20`),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
        {canWrite(user) && (
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={() => navigate('/orders/new')}
          >
            + New Order
          </button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <TableLoading message="Loading orders..." />
        ) : isError ? (
          <TableError message={error instanceof Error ? error.message : 'Unknown error'} onRetry={() => refetch()} />
        ) : !data?.data?.length ? (
          <TableEmpty entity="orders" />
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factory Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.buyer_po_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{order.factory_order_number || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status] || 'bg-gray-100'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.currency} {Number(order.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(order.created_at)}</td>
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
