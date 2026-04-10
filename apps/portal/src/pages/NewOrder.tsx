import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Connection {
  id: string;
  source_type: string;
  mode: string;
  status: string;
}

interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
}

interface NewOrderPayload {
  connection_id: string;
  buyer_po_number: string;
  order_date: string;
  currency: string;
  source_type: string;
  mapping_config_version: number;
  line_items: Array<{
    line_number: number;
    description: string;
    quantity_ordered: number;
    quantity_uom: string;
    unit_price: number;
    line_total: number;
  }>;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
}

export function NewOrder() {
  const navigate = useNavigate();

  const [connectionId, setConnectionId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('INR');
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ]);
  const [error, setError] = useState('');

  const connectionsQuery = useQuery({
    queryKey: ['connections-for-order'],
    queryFn: () => api.get<{ data: Connection[]; total: number }>('/connections?pageSize=100'),
  });

  const connections: Connection[] = connectionsQuery.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: NewOrderPayload) =>
      api.post<{ data: { id: string } }>('/orders', payload),
    onSuccess: (res) => {
      navigate(`/orders/${res.data.id}`);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create order');
    },
  });

  const addLineItem = () =>
    setLineItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }]);

  const removeLineItem = (idx: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const updateLineItem = (idx: number, field: keyof LineItemInput, value: string | number) =>
    setLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!connectionId || !poNumber || !orderDate) {
      setError('Connection, PO Number, and Order Date are required.');
      return;
    }
    if (lineItems.some((li) => !li.description || li.quantity <= 0 || li.unit_price <= 0)) {
      setError('All line items must have a description, quantity > 0, and price > 0.');
      return;
    }

    const selectedConn = connections.find((c) => c.id === connectionId);

    createMutation.mutate({
      connection_id: connectionId,
      buyer_po_number: poNumber,
      order_date: orderDate,
      currency,
      source_type: selectedConn?.source_type ?? 'manual',
      mapping_config_version: 1,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      line_items: lineItems.map((li, idx) => ({
        line_number: idx + 1,
        description: li.description,
        quantity_ordered: li.quantity,
        quantity_uom: 'EA',
        unit_price: li.unit_price,
        line_total: Math.round(li.quantity * li.unit_price * 100) / 100,
      })),
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-2xl font-bold text-gray-900">New Order</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connection <span className="text-red-500">*</span>
              </label>
              <select
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select a connection...</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.source_type} — {c.mode} ({c.status})
                  </option>
                ))}
              </select>
              {connectionsQuery.isError && (
                <p className="text-xs text-red-500 mt-1">Could not load connections</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-2026-001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {lineItems.map((item, idx) => (
              <div key={idx} className="px-6 py-4 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))}
                    min={1}
                    placeholder="Qty"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(idx, 'unit_price', Number(e.target.value))}
                    min={0}
                    step={0.01}
                    placeholder="Unit Price"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-1 text-sm text-gray-600 text-right">
                  {(item.quantity * item.unit_price).toLocaleString('en-IN')}
                </div>
                <div className="col-span-1 flex justify-end">
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{currency} {subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>GST (18%)</span>
              <span>{currency} {taxAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span>
              <span>{currency} {totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Order'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
