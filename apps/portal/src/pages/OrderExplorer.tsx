import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth, canWrite } from '../lib/auth.js';
import { formatDate } from '../utils/date.js';
import { ChevronDown, Download, RotateCcw, Eye } from 'lucide-react';
import { DataTable } from '../components/common/DataTable.js';
import type { Column } from '../components/common/DataTable.js';

interface CanonicalOrder {
  id: string;
  buyer_po_number: string;
  factory_order_number: string | null;
  status: string;
  total_amount: string;
  currency: string;
  created_at: string;
  buyer_id: string;
}

interface SagaEvent {
  step: number;
  state: string;
  timestamp: string;
  duration_ms: number;
  error: string | null;
}

interface OrderDetail extends CanonicalOrder {
  line_items: Array<{
    id: string;
    sku: string;
    description: string;
    quantity: string;
    unit_price: string;
  }>;
  saga_timeline: SagaEvent[];
  audit_trail: Array<{
    action: string;
    actor: string;
    timestamp: string;
    details: Record<string, unknown>;
  }>;
}

interface PaginatedResult {
  data: CanonicalOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  INVOICED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  FAILED: 'bg-red-100 text-red-700',
};

const columns: Column<CanonicalOrder>[] = [
  {
    key: 'buyer_po_number',
    label: 'PO Number',
    sortable: true,
    render: (row) => <span className="font-medium text-gray-900">{row.buyer_po_number as string}</span>,
  },
  {
    key: 'factory_order_number',
    label: 'Factory Order',
    render: (row) => <span className="text-gray-500">{(row.factory_order_number as string | null) ?? '—'}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[row.status as string] ?? 'bg-gray-100'}`}>
        {row.status as string}
      </span>
    ),
  },
  {
    key: 'total_amount',
    label: 'Amount',
    sortable: true,
    render: (row) => (
      <span className="text-gray-900">
        {row.currency as string} {Number(row.total_amount as string).toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'created_at',
    label: 'Date',
    sortable: true,
    render: (row) => <span className="text-gray-500">{formatDate(row.created_at as string)}</span>,
  },
  {
    key: 'id',
    label: 'Action',
    render: () => (
      <span className="flex items-center gap-1 text-sm text-indigo-600 font-medium">
        <Eye size={14} /> View
      </span>
    ),
  },
];

export function OrderExplorer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const orderDetailQuery = useQuery<OrderDetail | null, Error, OrderDetail | null>({
    queryKey: ['order-detail', selectedOrder?.id],
    queryFn: () => selectedOrder ? api.get<OrderDetail>(`/orders/${selectedOrder.id}`) : Promise.resolve(null),
    enabled: !!selectedOrder,
  });

  const retryMutation = useMutation({
    mutationFn: (orderId: string) => api.post(`/orders/${orderId}/retry`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '1000',
        sort: 'created_at',
        order: 'desc',
        ...(statusFilter && { status: statusFilter }),
      });
      const result = await api.get<PaginatedResult>(`/orders?${params}`);
      const csv = [
        ['ID', 'PO Number', 'Factory Order', 'Status', 'Amount', 'Currency', 'Created'].join(','),
        ...result.data.map(o =>
          [o.id, o.buyer_po_number, o.factory_order_number ?? '', o.status, o.total_amount, o.currency, o.created_at].join(',')
        ),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  const extraParams: Record<string, string> = {};
  if (statusFilter) extraParams['status'] = statusFilter;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Orders List */}
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All statuses</option>
            {Object.keys(statusColors).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <DataTable<CanonicalOrder>
          key={statusFilter}
          fetchUrl="/orders"
          columns={columns}
          entityLabel="orders"
          defaultSort="created_at"
          defaultOrder="desc"
          extraParams={extraParams}
          onRowClick={(row) => {
            setSelectedOrder(row as OrderDetail);
            setShowDetail(true);
          }}
        />
      </div>

      {/* Right: Detail Panel */}
      {showDetail && selectedOrder && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col max-h-screen sticky top-6">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Order Details</h3>
            <button
              onClick={() => setShowDetail(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronDown size={20} className="rotate-180" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">PO Number:</span>
                  <span className="font-medium">{selectedOrder.buyer_po_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Factory Order:</span>
                  <span className="font-medium">{selectedOrder.factory_order_number ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[selectedOrder.status] ?? 'bg-gray-100'}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    {selectedOrder.currency} {Number(selectedOrder.total_amount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="text-sm">{formatDate(selectedOrder.created_at)}</span>
                </div>
              </div>
            </div>

            {orderDetailQuery.data?.line_items && orderDetailQuery.data.line_items.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Line Items</h4>
                <div className="space-y-2 text-xs">
                  {orderDetailQuery.data.line_items.map((item) => (
                    <div key={item.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="font-medium text-gray-900">{item.sku}</p>
                      <p className="text-gray-600 text-xs">{item.description}</p>
                      <div className="flex justify-between mt-1 text-gray-700">
                        <span>{item.quantity} x {Number(item.unit_price).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orderDetailQuery.data?.saga_timeline && orderDetailQuery.data.saga_timeline.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Saga Timeline</h4>
                <div className="space-y-2 text-xs">
                  {orderDetailQuery.data.saga_timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900">{event.state}</span>
                          <span className="text-gray-500">{event.duration_ms}ms</span>
                        </div>
                        <p className="text-gray-600">{formatDate(event.timestamp)}</p>
                        {event.error && <p className="text-red-600">Error: {event.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canWrite(user) && selectedOrder.status === 'FAILED' && (
              <button
                onClick={() => retryMutation.mutate(selectedOrder.id)}
                disabled={retryMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Retry Order
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
