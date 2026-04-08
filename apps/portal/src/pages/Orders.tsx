import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/date.js';
import { useAuth, canWrite } from '../lib/auth.js';
import { DataTable } from '../components/common/DataTable.js';
import type { Column } from '../components/common/DataTable.js';

interface Order {
  id: string;
  buyer_po_number: string;
  factory_order_number: string | null;
  status: string;
  total_amount: string;
  currency: string;
  created_at: string;
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

const columns: Column<Order>[] = [
  { key: 'buyer_po_number', label: 'PO Number', sortable: true },
  {
    key: 'factory_order_number',
    label: 'Factory Order',
    render: (row) => <span className="text-gray-500">{row.factory_order_number ?? '—'}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[row.status] ?? 'bg-gray-100'}`}>
        {row.status}
      </span>
    ),
  },
  {
    key: 'total_amount',
    label: 'Amount',
    sortable: true,
    render: (row) => (
      <span>{row.currency} {Number(row.total_amount).toLocaleString('en-IN')}</span>
    ),
  },
  {
    key: 'created_at',
    label: 'Date',
    sortable: true,
    render: (row) => <span className="text-gray-500">{formatDate(row.created_at)}</span>,
  },
];

export function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
      </div>
      <DataTable<Order>
        fetchUrl="/orders"
        columns={columns}
        entityLabel="orders"
        defaultSort="created_at"
        defaultOrder="desc"
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        headerActions={
          canWrite(user) ? (
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              onClick={() => navigate('/orders/new')}
            >
              + New Order
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
