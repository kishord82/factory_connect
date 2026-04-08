import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/date.js';
import { DataTable, Column } from '../components/common/DataTable.js';

interface Invoice extends Record<string, unknown> {
  id: string;
  invoice_number: string;
  order_id: string;
  status: string;
  total_amount: string;
  invoice_date: string;
  due_date: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const columns: Column<Invoice>[] = [
  {
    key: 'invoice_number',
    label: 'Invoice #',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-gray-900">{String(row.invoice_number ?? '—')}</span>
    ),
  },
  {
    key: 'order_id',
    label: 'Order',
    sortable: true,
    render: (row) => String(row.order_id ?? '—'),
  },
  {
    key: 'total_amount',
    label: 'Amount',
    sortable: true,
    render: (row) => `INR ${Number(row.total_amount ?? 0).toLocaleString('en-IN')}`,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => {
      const s = String(row.status ?? '');
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[s] ?? 'bg-gray-100 text-gray-700'}`}>
          {s || '—'}
        </span>
      );
    },
  },
  {
    key: 'invoice_date',
    label: 'Issued Date',
    sortable: true,
    render: (row) => formatDate(String(row.invoice_date ?? '')),
  },
  {
    key: 'due_date',
    label: 'Due Date',
    sortable: true,
    render: (row) => formatDate(String(row.due_date ?? '')),
  },
];

export function Invoices() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
      </div>
      <DataTable<Invoice>
        fetchUrl="/invoices"
        columns={columns}
        entityLabel="invoices"
        defaultSort="invoice_date"
        defaultOrder="desc"
        onRowClick={(row) => navigate(`/invoices/${row.id}`)}
      />
    </div>
  );
}
