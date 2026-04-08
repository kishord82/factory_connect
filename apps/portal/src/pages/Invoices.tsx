import { formatDate } from '../utils/date.js';
import { DataTable } from '../components/common/DataTable.js';
import type { Column } from '../components/common/DataTable.js';

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
    render: (row) => <span className="font-medium text-gray-900">{row.invoice_number as string}</span>,
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
      <span className="font-medium text-gray-900">
        INR {Number(row.total_amount as string).toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'invoice_date',
    label: 'Issued Date',
    sortable: true,
    render: (row) => <span className="text-gray-500">{formatDate(row.invoice_date as string)}</span>,
  },
  {
    key: 'due_date',
    label: 'Due Date',
    sortable: true,
    render: (row) => <span className="text-gray-500">{formatDate(row.due_date as string)}</span>,
  },
];

export function Invoices() {
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
      />
    </div>
  );
}
