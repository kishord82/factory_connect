import { formatDate } from '../utils/date.js';
import { DataTable } from '../components/common/DataTable.js';
import type { Column } from '../components/common/DataTable.js';

interface Shipment {
  id: string;
  order_id: string;
  status: string;
  shipment_date: string;
  carrier_name: string | null;
  tracking_number: string | null;
  weight: string | null;
  weight_uom: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const columns: Column<Shipment>[] = [
  {
    key: 'shipment_date',
    label: 'Shipment Date',
    sortable: true,
    render: (row) => <span className="font-medium text-gray-900">{formatDate(row.shipment_date as string)}</span>,
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
    key: 'weight',
    label: 'Weight',
    render: (row) => (
      <span className="text-gray-500">
        {row.weight ? `${row.weight as string} ${row.weight_uom as string}` : '—'}
      </span>
    ),
  },
  {
    key: 'carrier_name',
    label: 'Carrier',
    render: (row) => <span className="text-gray-500">{(row.carrier_name as string | null) ?? '—'}</span>,
  },
  {
    key: 'tracking_number',
    label: 'Tracking',
    render: (row) => <span className="text-gray-500">{(row.tracking_number as string | null) ?? '—'}</span>,
  },
];

export function Shipments() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Shipments</h2>
      </div>
      <DataTable<Shipment>
        fetchUrl="/shipments"
        columns={columns}
        entityLabel="shipments"
        defaultSort="shipment_date"
        defaultOrder="desc"
      />
    </div>
  );
}
