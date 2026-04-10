import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { formatDate } from '../utils/date.js';
import { ArrowLeft } from 'lucide-react';

interface OrderLineItem {
  id: string;
  line_number: number;
  item_code: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price: string;
  line_total: string;
}

interface OrderDetail {
  id: string;
  buyer_po_number: string;
  factory_order_number: string | null;
  status: string;
  total_amount: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface OrderDetailResponse {
  order: OrderDetail;
  line_items: OrderLineItem[];
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

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<{ data: OrderDetailResponse }>(`/orders/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4"></div>
        <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (isError || !data?.data?.order) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Failed to load order details.</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const order = data.data.order;
  const lineItems = data.data.line_items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Order {order.buyer_po_number}</h2>
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status] ?? 'bg-gray-100'}`}>
          {order.status}
        </span>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">PO Number</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{order.buyer_po_number}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Factory Order</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{order.factory_order_number ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Total Amount</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">
              {order.currency} {Number(order.total_amount ?? 0).toLocaleString('en-IN')}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Created</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{formatDate(order.created_at)}</dd>
          </div>
        </dl>
      </div>

      {/* Line Items */}
      {lineItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lineItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{item.line_number}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.item_code}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.description ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.quantity} {item.unit}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {order.currency} {Number(item.unit_price ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {order.currency} {Number(item.line_total ?? 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
